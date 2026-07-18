import React, { useState, useEffect, useRef } from 'react';
import { 
  Image, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Trash2, 
  Upload, 
  X, 
  ExternalLink,
  Calendar,
  User,
  FolderOpen,
  Eye,
  RefreshCw,
  Video,
  Play,
  Film,
  HardDrive,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { uploadImageToCloudinary } from '../lib/upload';
import { UserAccount } from '../types';
import { useConfirmation } from './ConfirmationContext';

interface MediaLibraryProps {
  currentUser: UserAccount;
}

interface UploadedImage {
  id: string;
  url: string;
  category: string;
  type?: 'image' | 'video' | 'raw';
  bytes?: number;
  uploadedAt: any;
  uploaderId: string;
  uploaderEmail: string;
  uploaderName: string;
}

export default function MediaLibrary({ currentUser }: MediaLibraryProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'video'>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);
  const { confirm } = useConfirmation();

  // For direct upload
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Chung');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories list for filtering
  const categories = [
    'Tất cả',
    'Ảnh đại diện & bìa cá nhân',
    'Ảnh bìa báo khoa học',
    'Ảnh dự án & công việc',
    'Ảnh cấu hình hệ thống',
    'Video hướng dẫn & tài liệu',
    'Chung'
  ];

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'uploaded_images'), orderBy('uploadedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedImages: UploadedImage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        let fileType: 'image' | 'video' | 'raw' = data.type || 'image';
        
        // Auto-detect for legacy entries
        const lowerUrl = (data.url || '').toLowerCase();
        if (!data.type) {
          if (lowerUrl.includes('/video/upload/') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.avi')) {
            fileType = 'video';
          }
        }

        // Estimate bytes for legacy items
        let fileBytes = data.bytes;
        if (fileBytes === undefined || fileBytes === null || fileBytes === 0) {
          fileBytes = fileType === 'video' ? 4.5 * 1024 * 1024 : 350 * 1024;
        }

        fetchedImages.push({
          id: doc.id,
          url: data.url || '',
          category: data.category || 'Chung',
          type: fileType,
          bytes: fileBytes,
          uploadedAt: data.uploadedAt,
          uploaderId: data.uploaderId || 'anonymous',
          uploaderEmail: data.uploaderEmail || 'anonymous',
          uploaderName: data.uploaderName || 'Anonymous'
        });
      });
      setImages(fetchedImages);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching media library images:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalBytes = images.reduce((sum, img) => sum + (img.bytes || 0), 0);
  const totalMB = totalBytes / (1024 * 1024);
  const totalGB = totalBytes / (1024 * 1024 * 1024);
  const LIMIT_GB = 25; // Cloudinary Free limit
  const usedPercent = Math.min((totalGB / LIMIT_GB) * 100, 100);

  const imageCount = images.filter(i => i.type !== 'video').length;
  const videoCount = images.filter(i => i.type === 'video').length;

  const handleDeleteImage = (img: UploadedImage) => {
    confirm(
      'Xác nhận xóa tệp tin',
      'Bạn có chắc chắn muốn xóa tệp tin này khỏi thư viện không? Hành động này không thể hoàn tác.',
      async () => {
        try {
          await deleteDoc(doc(db, 'uploaded_images', img.id));
        } catch (error) {
          console.error("Error deleting image doc:", error);
        }
      }
    );
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Vui lòng chỉ tải lên tệp tin hình ảnh hoặc video!');
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      alert('Tệp tin quá dung lượng cho phép. Vui lòng chọn tệp dưới 30MB!');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await uploadImageToCloudinary(reader.result as string, uploadCategory);
      } catch (error) {
        console.error("Direct upload failed:", error);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  // Filtered Images computation
  const filteredImages = images.filter((img) => {
    const matchesSearch = 
      img.uploaderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.uploaderEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Tất cả' || img.category === selectedCategory;

    const matchesType = selectedType === 'all' || img.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Vừa xong';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div id="media-library-view" className="space-y-6 text-left max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2.5 font-display">
            <Image className="w-6 h-6 text-brand" />
            Thư viện Đa phương tiện
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Quản lý, tìm kiếm và tải lên các tệp tin hình ảnh, video từ Cloudinary được lưu trữ tập trung trên hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-100 w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Tổng số: <span className="font-extrabold text-brand ml-1">{images.length} tệp tin</span>
        </div>
      </div>

      {/* Grid of upload & filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Drag & Drop upload panel & Storage Capacity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-3">
              <Upload className="w-4 h-4 text-brand" />
              Tải tệp tin lên trực tiếp
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">Phân loại danh mục</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-700 font-medium focus:ring-1 focus:ring-brand focus:border-brand transition-all"
              >
                {categories.filter(c => c !== 'Tất cả').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                dragActive 
                  ? 'border-brand bg-brand/5' 
                  : 'border-slate-200 hover:border-brand hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />

              {uploading ? (
                <div className="space-y-2 text-slate-500">
                  <RefreshCw className="w-8 h-8 text-brand animate-spin mx-auto" />
                  <p className="text-xs font-bold animate-pulse">Đang tải lên Cloudinary...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-brand" />
                  <p className="text-xs font-extrabold text-slate-700">Kéo & Thả ảnh, video vào đây</p>
                  <p className="text-[10px] text-slate-400 mt-1">hoặc click để chọn từ thiết bị</p>
                </>
              )}
            </div>
          </div>

          {/* Storage Capacity Progress Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-50 pb-3">
              <HardDrive className="w-4 h-4 text-brand" />
              Dung lượng lưu trữ
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trạng thái dung lượng</span>
                <span className="text-xs font-extrabold text-slate-800">
                  {formatFileSize(totalBytes)} <span className="text-slate-400 font-medium">/ 25.0 GB</span> ({usedPercent.toFixed(3)}%)
                </span>
              </div>

              {/* Multi-segmented Progress Bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  style={{ width: `${Math.max((images.filter(i => i.type !== 'video').reduce((sum, img) => sum + (img.bytes || 0), 0) / (LIMIT_GB * 1024 * 1024 * 1024)) * 100, 0.5)}%` }} 
                  className="bg-sky-500 h-full transition-all duration-500" 
                  title={`Hình ảnh: ${formatFileSize(images.filter(i => i.type !== 'video').reduce((sum, img) => sum + (img.bytes || 0), 0))}`}
                />
                <div 
                  style={{ width: `${(images.filter(i => i.type === 'video').reduce((sum, img) => sum + (img.bytes || 0), 0) / (LIMIT_GB * 1024 * 1024 * 1024)) * 100}%` }} 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  title={`Video: ${formatFileSize(images.filter(i => i.type === 'video').reduce((sum, img) => sum + (img.bytes || 0), 0))}`}
                />
              </div>

              {/* Legend with numbers */}
              <div className="grid grid-cols-1 gap-2 pt-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 block shrink-0" />
                    <span>Hình ảnh ({imageCount})</span>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {formatFileSize(images.filter(i => i.type !== 'video').reduce((sum, img) => sum + (img.bytes || 0), 0))}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 block shrink-0" />
                    <span>Video ({videoCount})</span>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {formatFileSize(images.filter(i => i.type === 'video').reduce((sum, img) => sum + (img.bytes || 0), 0))}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 block shrink-0" />
                    <span>Còn trống</span>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {formatFileSize(Math.max((LIMIT_GB * 1024 * 1024 * 1024) - totalBytes, 0))}
                  </span>
                </div>
              </div>

              {/* Cloudinary limits info panel */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex gap-2 items-start mt-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-wider uppercase text-slate-600 block">Quy định giới hạn</span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Tài khoản Cloudinary miễn phí hỗ trợ dung lượng tối đa <strong>25 GB</strong>. 
                    Để tối ưu hóa tải trang, hệ thống giới hạn tải lên tối đa <strong>10MB</strong> đối với mỗi hình ảnh và <strong>100MB</strong> đối với mỗi video.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Search, category filters & image grid */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filters & search */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm người tải lên, danh mục..."
                  className="w-full text-xs rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 bg-slate-50 text-slate-700 font-medium focus:ring-1 focus:ring-brand focus:border-brand transition-all"
                />
              </div>
              
              {/* Media Type filter */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 w-fit shrink-0">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedType === 'all'
                      ? 'bg-white text-brand shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tất cả loại
                </button>
                <button
                  onClick={() => setSelectedType('image')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedType === 'image'
                      ? 'bg-white text-brand shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Hình ảnh
                </button>
                <button
                  onClick={() => setSelectedType('video')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedType === 'video'
                      ? 'bg-white text-brand shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Video
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-50 pt-3">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-brand text-white'
                      : 'bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Image grid */}
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-brand animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500 animate-pulse">Đang đồng bộ thư viện đa phương tiện...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-16 text-center space-y-3">
              <Image className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-extrabold text-slate-700">Chưa có tệp tin nào</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Không tìm thấy ảnh hoặc video phù hợp với bộ lọc hoặc chưa có tệp tin nào được tải lên danh mục này.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredImages.map((img) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden group shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-950 overflow-hidden group flex items-center justify-center">
                    {img.type === 'video' ? (
                      <video
                        src={img.url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => {
                          e.currentTarget.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                        }}
                      />
                    ) : (
                      <img
                        src={img.url}
                        alt={img.category}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    
                    {img.type === 'video' && (
                      <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider text-white bg-rose-600 shadow-xs flex items-center gap-1 z-10">
                        <Play className="w-2 h-2 fill-white text-white" />
                        VIDEO
                      </div>
                    )}

                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                      <button
                        onClick={() => setPreviewImage(img)}
                        className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-xs transition-colors cursor-pointer"
                        title={img.type === 'video' ? "Phát video" : "Xem ảnh cỡ lớn"}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCopyUrl(img.url)}
                        className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-xs transition-colors cursor-pointer"
                        title="Copy đường dẫn"
                      >
                        {copiedUrl === img.url ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase text-white bg-slate-900/60 backdrop-blur-xs z-10">
                      {img.category}
                    </span>
                  </div>

                  <div className="p-3 text-left space-y-2 flex-1 flex flex-col justify-between bg-slate-50/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={img.uploaderEmail}>{img.uploaderName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          <span className="truncate">{formatDate(img.uploadedAt)}</span>
                        </div>
                        {img.bytes && (
                          <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            {formatFileSize(img.bytes)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 shrink-0">
                      <button
                        onClick={() => handleCopyUrl(img.url)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          copiedUrl === img.url
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {copiedUrl === img.url ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Đã sao chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                      
                      {(currentUser.role === 'admin' || currentUser.id === img.uploaderId) && (
                        <button
                          onClick={() => handleDeleteImage(img)}
                          className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg border border-slate-200 hover:border-rose-100 transition-colors cursor-pointer"
                          title="Xóa tệp tin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl overflow-hidden max-w-3xl w-full border border-slate-100 shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                    {previewImage.type === 'video' ? 'Chi tiết tệp tin video' : 'Chi tiết tệp tin ảnh'}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-brand/5 text-brand text-[9px] font-black tracking-wider uppercase mt-1 inline-block">
                    {previewImage.category}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
                {previewImage.type === 'video' ? (
                  <video
                    src={previewImage.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={previewImage.url}
                    alt={previewImage.category}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="p-5 bg-slate-50 text-xs text-slate-600 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-medium">Người tải lên:</span>
                    <span className="font-bold text-slate-800 block truncate" title={`${previewImage.uploaderName} (${previewImage.uploaderEmail})`}>
                      {previewImage.uploaderName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-medium">Thời gian tải:</span>
                    <span className="font-bold text-slate-800 block">{formatDate(previewImage.uploadedAt)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-medium">Dung lượng:</span>
                    <span className="font-bold text-slate-800 block font-mono">{formatFileSize(previewImage.bytes)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-150 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={previewImage.url}
                    className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-[10px] text-slate-500"
                  />
                  <button
                    onClick={() => handleCopyUrl(previewImage.url)}
                    className="px-4 py-2 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedUrl === previewImage.url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl === previewImage.url ? 'Đã copy!' : 'Copy URL'}</span>
                  </button>
                  <a
                    href={previewImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl cursor-pointer transition-colors"
                    title="Mở tab mới"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
