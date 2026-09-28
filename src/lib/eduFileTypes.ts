// Định dạng nộp bài của bài tập Edu. 'any' nghĩa là nhận mọi loại tệp (zip, rar, psd, ai, blend, mp3...).
export const EDU_FILE_TYPE_LABELS: Record<string, string> = {
  any: 'Mọi loại tệp',
  pdf: 'PDF',
  link: 'Link',
  image: 'Hình ảnh',
  video: 'Video',
  doc: 'Văn bản (Word)',
  '3d': 'Mô hình 3D',
  text: 'Nhập văn bản',
};

export const eduFileTypeLabel = (t: string) => EDU_FILE_TYPE_LABELS[t] || t.toUpperCase();

// Bật tắt 1 định dạng. Chọn "Mọi loại tệp" thì bỏ các định dạng tệp cụ thể (vẫn giữ Nhập văn bản),
// chọn lại 1 định dạng cụ thể thì bỏ "Mọi loại tệp".
export function toggleEduFileType(cur: string[], id: string): string[] {
  if (cur.includes(id)) return cur.filter(t => t !== id);
  if (id === 'any') return [...cur.filter(t => t === 'text' || t === 'link'), 'any'];
  if (id === 'text' || id === 'link') return [...cur, id];
  return [...cur.filter(t => t !== 'any'), id];
}
