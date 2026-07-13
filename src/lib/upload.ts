import { supabase } from './supabase';
import { db, auth } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type CloudinaryResourceType = 'auto' | 'image' | 'video' | 'raw';

export interface CloudinaryUploadOptions {
  resourceType?: CloudinaryResourceType;
  folder?: string;
  category?: string;
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Không thể đọc tệp.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaToCloudinary(source: File | string, options: CloudinaryUploadOptions = {}): Promise<string> {
  try {
    const file = typeof source === 'string' ? source : await readFileAsDataUrl(source);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file,
        resourceType: options.resourceType || 'auto',
        folder: options.folder || 'shared_library',
        originalFilename: typeof source === 'string' ? '' : source.name
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }
    
    const data = await res.json();
    if (data.publicId) {
      const { error: libraryError } = await supabase.from('media_library').upsert({
        public_id: data.publicId,
        url: data.url,
        resource_type: data.resourceType || options.resourceType || 'auto',
        format: data.format || null,
        bytes: data.bytes || null,
        width: data.width || null,
        height: data.height || null,
        duration: data.duration || null,
        folder: options.folder || 'shared_library',
        original_filename: typeof source === 'string' ? null : source.name,
        source_module: options.folder?.startsWith('portfolio') ? 'portfolio' : 'shared_library'
      }, { onConflict: 'public_id' });
      if (libraryError) console.warn('Không thể ghi metadata vào Thư viện:', libraryError);
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
