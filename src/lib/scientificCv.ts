// Lý lịch khoa học cá nhân.
//
// Dữ liệu lưu ở Supabase, bảng scientific_cvs (xem SCIENTIFIC_CV.sql). Bảng bật RLS và không có
// policy nào nên khoá công khai của web không đọc được. Mọi thao tác đi qua Edge Function
// scientific-cv: hàm xác thực token đăng nhập Firebase, chỉ trả hồ sơ đúng chủ, kiểm tra quyền
// scientific_cv khi ghi và mã hoá nội dung trước khi lưu. Admin trong ứng dụng cũng không xem được.
// Ảnh chân dung được thu nhỏ rồi lưu ngay trong nội dung đã mã hoá (không đưa lên kho ảnh công khai).
import { auth } from './firebase';

export interface CvDegree { name: string; years: string; school: string; major: string; mode: string; place: string; year: string; thesis?: string }
export interface CvCertificate { type: string; name: string; issuer: string; year: string }
export interface CvCurrentJob { mode: string; unit: string; address: string; position: string; years: string; note: string }
export interface CvPeriod { from: string; to: string; unit: string; position: string }
export interface CvBook { title: string; publisher: string; year: string }
export interface CvArticle { authors: string; title: string; journal: string; year: string; role: string }
export interface CvConference { authors: string; title: string; conference: string; place: string; note: string }
export interface CvProject { title: string; time: string; sponsor: string; role: string; value: string }
export interface CvPatent { product: string; year: string; issuer: string; country: string; value: string }
export interface CvReview { journal: string; times: string }
export interface CvAward { name: string; year: string; organization: string; country: string }
export interface CvCourse { name: string; unit: string }

export interface CvData {
  // Phần đầu trang
  agency: string;          // Cơ quan chủ quản, ví dụ BỘ GIÁO DỤC VÀ ĐÀO TẠO
  school: string;          // Tên trường
  motto1: string;          // CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
  motto2: string;          // Độc lập - Tự do - Hạnh phúc
  docTitle: string;        // LÝ LỊCH KHOA HỌC
  subtitle: string;        // Dòng phụ dưới tiêu đề, để trống thì không in
  photo: string;           // Ảnh chân dung dạng data URL đã thu nhỏ
  // A. Sơ lược bản thân
  fullName: string; gender: string; birthDate: string; birthPlace: string;
  idNumber: string; idDate: string; idPlace: string;
  nationality: string; ethnicity: string; religion: string;
  address: string; phone: string; email: string;
  degree: string; academicRank: string; title: string; honors: string;
  // B. Văn bằng, chứng chỉ
  bachelor: CvDegree[]; master: CvDegree[]; doctor: CvDegree[]; certificates: CvCertificate[];
  // C. Giảng dạy, công tác
  currentJobs: CvCurrentJob[]; teaching: CvPeriod[]; experience: CvPeriod[];
  // D. Nghiên cứu khoa học
  researchField: string;
  books: CvBook[];
  articlesDomestic: CvArticle[]; articlesIntl: CvArticle[];
  confDomestic: CvConference[]; confIntl: CvConference[];
  projects: CvProject[]; patents: CvPatent[];
  editorialBoard: string; reviews: CvReview[]; awards: CvAward[];
  // E. Học phần có thể giảng dạy
  courses: CvCourse[];
  // Phần ký tên
  signPlace: string; signDate: string; signName: string; note: string;
}

export interface ScientificCv {
  id: string;
  ownerId: string;
  name: string;            // Tên gợi nhớ của hồ sơ, ví dụ "Gửi Văn Lang 2026"
  data: CvData;
  createdAt?: number;
  updatedAt?: number;
}

export function emptyCvData(fullName = '', email = ''): CvData {
  return {
    agency: 'BỘ GIÁO DỤC VÀ ĐÀO TẠO', school: '', motto1: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', motto2: 'Độc lập - Tự do - Hạnh phúc',
    docTitle: 'LÝ LỊCH KHOA HỌC', subtitle: '', photo: '',
    fullName, gender: '', birthDate: '', birthPlace: '', idNumber: '', idDate: '', idPlace: '',
    nationality: 'Việt Nam', ethnicity: '', religion: '', address: '', phone: '', email,
    degree: '', academicRank: '', title: '', honors: '',
    bachelor: [], master: [], doctor: [], certificates: [],
    currentJobs: [], teaching: [], experience: [],
    researchField: '', books: [], articlesDomestic: [], articlesIntl: [], confDomestic: [], confIntl: [],
    projects: [], patents: [], editorialBoard: '', reviews: [], awards: [], courses: [],
    signPlace: 'Tp. Hồ Chí Minh', signDate: '', signName: fullName.toUpperCase(),
    note: '',
  };
}

// Bổ sung trường còn thiếu khi mở hồ sơ tạo từ phiên bản cũ.
export function normalizeCvData(d: Partial<CvData> | undefined): CvData {
  const base = emptyCvData();
  const out: any = { ...base, ...(d || {}) };
  for (const k of Object.keys(base) as (keyof CvData)[]) {
    if (Array.isArray((base as any)[k]) && !Array.isArray(out[k])) out[k] = [];
    if (typeof (base as any)[k] === 'string' && typeof out[k] !== 'string') out[k] = out[k] == null ? '' : String(out[k]);
  }
  return out as CvData;
}

export interface CvSummary { id: string; name: string; fullName: string; school: string; hasPhoto: boolean; updatedAt?: number; createdAt?: number }

async function call(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  // Firebase khôi phục phiên đăng nhập bất đồng bộ lúc mở trang, chờ xong rồi mới lấy token.
  try { await (auth as any).authStateReady?.(); } catch { /* bỏ qua */ }
  const user = auth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại để dùng Lý lịch khoa học.');
  const token = await user.getIdToken();
  const base = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const r = await fetch(`${base}/functions/v1/scientific-cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Lỗi máy chủ (${r.status})`);
  return j;
}

const ms = (v: any) => (v ? Date.parse(v) : undefined);

export async function listMyCvs(): Promise<CvSummary[]> {
  const j = await call('list');
  return (j.items || []).map((x: any) => ({ ...x, updatedAt: ms(x.updatedAt), createdAt: ms(x.createdAt) }));
}

export async function getCv(id: string): Promise<ScientificCv | null> {
  const j = await call('get', { id });
  const it = j.item;
  if (!it) return null;
  return { id: it.id, ownerId: auth.currentUser?.uid || '', name: it.name, data: normalizeCvData(it.data), updatedAt: ms(it.updatedAt), createdAt: ms(it.createdAt) };
}

export async function createCv(name: string, data: CvData): Promise<string> {
  const j = await call('create', { name: name.trim() || 'Lý lịch khoa học', data });
  return j.id;
}

export async function saveCv(id: string, name: string, data: CvData): Promise<void> {
  await call('update', { id, name: name.trim() || 'Lý lịch khoa học', data });
}

export async function deleteCv(id: string): Promise<void> {
  await call('delete', { id });
}

// Thu nhỏ ảnh chân dung về khung 3x4, nén JPEG để tài liệu Firestore gọn (dưới khoảng 80 KB).
export function shrinkPortrait(file: File, maxW = 360, maxH = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp không phải ảnh hợp lệ.'));
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) return reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh.'));
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
