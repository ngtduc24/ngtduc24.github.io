import { useEffect, useState } from 'react';
import { EduSubject } from '../../types/edu';
import { getSubjectsByIds } from '../../lib/edu';

// Môn học là dữ liệu riêng của từng người. Ở kho dùng chung (đề, câu hỏi, bài tập của người khác)
// cần hiện tên môn của người khác, hook này tra thêm tên các môn đó theo id để hiển thị.
export function useSubjectNames(own: EduSubject[], ids: (string | null | undefined)[]) {
  const [others, setOthers] = useState<EduSubject[]>([]);
  const key = Array.from(new Set(ids.filter(Boolean) as string[])).filter(id => !own.some(s => s.id === id)).sort().join(',');
  useEffect(() => {
    if (!key) { setOthers([]); return; }
    getSubjectsByIds(key.split(',')).then(setOthers).catch(() => setOthers([]));
  }, [key]);
  return (id?: string | null) => own.find(s => s.id === id)?.name || others.find(s => s.id === id)?.name || '';
}
