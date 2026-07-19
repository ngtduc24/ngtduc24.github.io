import { db, auth } from './firebase';
import { supabase } from './supabase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type CloudinaryResourceType = 'auto' | 'image' | 'video' | 'raw';

export interface CloudinaryUploadOptions {
  resourceType?: CloudinaryResourceType;
  folder?: string;
  category?: string;
}

interface CloudinaryUploadResult {
  url: string;
  secureUrl?: string;
  publicId?: string;
  resourceType?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp.'));
    reader.readAsDataURL(file);
  });
}

function safeFolder(folder: string) {
  return folder.replace(/[^a-zA-Z0-9_/-]/g, '_');
}

async function parseUploadResponse(response: Response): Promise<CloudinaryUploadResult> {
  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    const looksLikeHtml = responseText.trimStart().startsWith('<');
    throw new Error(looksLikeHtml
      ? 'Dịch vụ tải ảnh chưa được cấu hình trên môi trường này. Hãy cấu hình Cloudinary Upload Preset hoặc chạy ứng dụng bằng máy chủ API.'
      : 'Máy chủ tải ảnh trả về dữ liệu không hợp lệ.');
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'Không thể tải tệp lên Cloudinary.');
  }

  const url = data.secure_url || data.secureUrl || data.url;
  if (!url) throw new Error('Cloudinary không trả về đường dẫn tệp đã tải lên.');
  return {
    url,
    secureUrl: data.secure_url || data.secureUrl,
    publicId: data.public_id || data.publicId,
    resourceType: data.resource_type || data.resourceType,
    format: data.format,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
    duration: data.duration,
  };
}

async function uploadDirectlyToCloudinary(source: File | string, options: CloudinaryUploadOptions): Promise<CloudinaryUploadResult | null> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloudName || !uploadPreset) return null;

  const resourceType = options.resourceType || 'auto';
  const endpointType = resourceType === 'image' || resourceType === 'video' || resourceType === 'raw' ? resourceType : 'auto';
  const formData = new FormData();
  formData.append('file', source);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `smart_research_vn/${safeFolder(options.folder || 'shared_library')}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${endpointType}/upload`, {
    method: 'POST',
    body: formData,
  });
  return parseUploadResponse(response);
}

// Tải lên có ký. Lấy chữ ký từ Supabase Edge Function, chỉ người đã đăng nhập mới có.
async function uploadSignedToCloudinary(source: File | string, options: CloudinaryUploadOptions): Promise<CloudinaryUploadResult | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!supabaseUrl) return null;

  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (!idToken) throw new Error('Bạn cần đăng nhập để tải tệp lên.');

  const folder = `smart_research_vn/${safeFolder(options.folder || 'shared_library')}`;
  const signResp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/sign-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({ folder }),
  });
  if (!signResp.ok) {
    if (signResp.status === 401) throw new Error('Bạn cần đăng nhập để tải tệp lên.');
    return null;
  }
  const sign = await signResp.json().catch(() => null);
  if (!sign || !sign.cloudName || !sign.signature || !sign.apiKey || !sign.timestamp) return null;

  const resourceType = options.resourceType || 'auto';
  const endpointType = resourceType === 'image' || resourceType === 'video' || resourceType === 'raw' ? resourceType : 'auto';
  const formData = new FormData();
  formData.append('file', source);
  formData.append('api_key', String(sign.apiKey));
  formData.append('timestamp', String(sign.timestamp));
  formData.append('signature', String(sign.signature));
  formData.append('folder', String(sign.folder || folder));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(sign.cloudName)}/${endpointType}/upload`, {
    method: 'POST',
    body: formData,
  });
  return parseUploadResponse(response);
}

export async function uploadMediaToCloudinary(source: File | string, options: CloudinaryUploadOptions = {}): Promise<string> {
  try {
    let data: CloudinaryUploadResult | null = null;
    // 1) Ưu tiên tải lên có ký, chỉ tài khoản đã đăng nhập mới tải được
    try {
      data = await uploadSignedToCloudinary(source, options);
    } catch (signedError) {
      if (signedError instanceof Error && /đăng nhập/.test(signedError.message)) throw signedError;
      console.warn('Signed Cloudinary upload failed:', signedError);
    }
    // 2) Dự phòng: unsigned nếu vẫn còn cấu hình preset (có thể bỏ khi đã bật ký)
    if (!data) {
      try {
        data = await uploadDirectlyToCloudinary(source, options);
      } catch (directError) {
        console.warn('Direct client-side Cloudinary upload failed. Falling back to secure server-side upload:', directError);
      }
    }

    if (!data) {
      const file = typeof source === 'string' ? source : await readFileAsDataUrl(source);
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file,
          resourceType: options.resourceType || 'auto',
          folder: options.folder || 'shared_library',
          originalFilename: typeof source === 'string' ? '' : source.name
        })
      });
      data = await parseUploadResponse(response);
    }

    if (data.publicId) {
      try {
        await addDoc(collection(db, 'uploaded_images'), {
          publicId: data.publicId,
          url: data.url,
          type: data.resourceType || options.resourceType || 'auto',
          format: data.format || null,
          bytes: data.bytes || null,
          width: data.width || null,
          height: data.height || null,
          duration: data.duration || null,
          category: options.folder || 'shared_library',
          originalFilename: typeof source === 'string' ? null : source.name,
          sourceModule: options.folder?.startsWith('portfolio') ? 'portfolio' : 'shared_library',
          uploadedAt: serverTimestamp(),
          uploadedBy: 'system'
        });
      } catch (err) {
        console.error('Không thể lưu metadata vào thư viện chia sẻ (Firestore):', err);
      }
    }
    try {
      const currentUser = auth.currentUser;
      await addDoc(collection(db, 'uploaded_images'), {
        url: data.url,
        category: options.category || 'Chung',
        type: data.resourceType || options.resourceType || 'image',
        bytes: data.bytes || 0,
        uploadedAt: serverTimestamp(),
        uploaderId: currentUser?.uid || 'anonymous',
        uploaderEmail: currentUser?.email || 'anonymous',
        uploaderName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous'
      });
    } catch (firestoreError) {
      console.warn('Không thể đồng bộ metadata Thư viện Firestore:', firestoreError);
    }
    return data.url;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function uploadImageToCloudinary(base64Image: string, category = 'Chung'): Promise<string> {
  try {
    const isVideo = base64Image.startsWith('data:video/');
    return await uploadMediaToCloudinary(base64Image, { resourceType: isVideo ? 'video' : 'image', folder: `shared_library/${isVideo ? 'videos' : 'images'}/${category}`, category });
  } catch {
    // Giữ tương thích với các module cũ khi Cloudinary chưa được cấu hình.
    return base64Image;
  }
}

export async function uploadARAssetToSupabase(file: File): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client chưa được khởi tạo');
  }
  
  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  
  const { data, error } = await supabase.storage
    .from('ar_assets')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });
    
  if (error) {
    throw new Error(`Lỗi tải lên AR Asset: ${error.message}`);
  }
  
  const { data: publicData } = supabase.storage
    .from('ar_assets')
    .getPublicUrl(fileName);
    
  if (!publicData?.publicUrl) {
    throw new Error('Không thể lấy public URL từ Supabase Storage');
  }
  
  return publicData.publicUrl;
}

export async function uploadFileToSupabase(file: File, bucket = 'ar_assets', prefix = ''): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client chưa được khởi tạo');
  }
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'file';
  const fileName = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${base}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: '3600', upsert: true });
  if (error) {
    throw new Error(`Lỗi tải tệp lên: ${error.message}`);
  }
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
  if (!publicData?.publicUrl) {
    throw new Error('Không thể lấy public URL từ Supabase Storage');
  }
  return publicData.publicUrl;
}
