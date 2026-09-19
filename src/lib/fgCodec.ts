// =====================================================================
//  Bộ đọc/ghi file .fg (bảng điểm của phần mềm trường). File .fg là một dòng
//  các byte hex thường cách nhau 1 khoảng trắng, giải mã ra XML UTF-8.
// =====================================================================

const XML_DECL = '<?xml version="1.0" encoding="utf-8"?>';

export function decodeFg(text: string): string {
  const tokens = text.trim().split(/\s+/);
  const bytes = new Uint8Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    const b = parseInt(tokens[i], 16);
    if (Number.isNaN(b)) throw new Error('FILE_FG_KHONG_HOP_LE');
    bytes[i] = b;
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export function encodeFg(xml: string): string {
  const bytes = new TextEncoder().encode(xml);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

export function parseFg(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML_HONG');
  return doc;
}

export function serializeFg(doc: Document): string {
  // DOMParser bỏ mất khai báo XML nên phải gắn lại thủ công.
  return XML_DECL + new XMLSerializer().serializeToString(doc.documentElement);
}

export interface FgMeta {
  version: string;
  semester: string;
  login: string;
}

export interface FgClass {
  index: number;
  subject: string;
  className: string;
  components: string[];
  students: { roll: string; name: string }[];
}

export function readMeta(doc: Document): FgMeta {
  return {
    version: doc.querySelector('TeacherGrade > Version')?.textContent ?? '',
    semester: doc.querySelector('TeacherGrade > Semester')?.textContent ?? '',
    login: doc.querySelector('TeacherGrade > Login')?.textContent ?? '',
  };
}

export function readClasses(doc: Document): FgClass[] {
  return Array.from(doc.querySelectorAll('SubjectClassGrade')).map((el, i) => ({
    index: i,
    subject: el.querySelector('Subject')?.textContent ?? '',
    className: el.querySelector('Class')?.textContent ?? '',
    components: Array.from(el.querySelectorAll('Components > string')).map(s => s.textContent ?? ''),
    students: Array.from(el.querySelectorAll('Students > Student')).map(s => ({
      roll: (s.querySelector('Roll')?.textContent ?? '').trim(),
      name: s.querySelector('Name')?.textContent ?? '',
    })),
  }));
}

// Ghi điểm cho 1 lớp theo đúng cấu trúc của phần mềm trường:
//   <Grades>
//     <GradeComponent><Component>[nhóm]Tên</Component><Grade>8</Grade></GradeComponent>
//     <GradeComponent><Component>...</Component><Grade xsi:nil="true" /></GradeComponent>  (ô để trống)
//   </Grades>
// grades: Map mã số sinh viên (viết hoa) -> mảng điểm dài bằng số Components của lớp,
// phần tử rỗng/null nghĩa là chưa có điểm (ghi nil).
// replace=false (mặc định): chỉ cập nhật những ô có điểm mới, giữ nguyên điểm
//   đã có sẵn trong file ở các ô/cột không nhập (dùng cho luồng nhập/import).
// replace=true: ghi đè toàn bộ theo mảng truyền vào, ô rỗng thành nil (dùng cho
//   bảng nhập trực tiếp, nơi người dùng thấy sẵn điểm cũ và có thể xóa).
export function writeGrades(doc: Document, classIndex: number, grades: Map<string, (string | null)[]>, replace = false): void {
  const scg = doc.querySelectorAll('SubjectClassGrade')[classIndex];
  if (!scg) return;
  const ns = scg.namespaceURI;
  const el = (name: string) => (ns ? doc.createElementNS(ns, name) : doc.createElement(name));
  const components = Array.from(scg.querySelectorAll('Components > string')).map(s => s.textContent ?? '');
  const existingAll = replace ? null : readGrades(doc, classIndex); // chụp điểm cũ trước khi ghi
  scg.querySelectorAll('Students > Student').forEach(stu => {
    const roll = (stu.querySelector('Roll')?.textContent ?? '').trim().toUpperCase();
    const row = grades.get(roll);
    if (!row) return;
    const existing = existingAll ? (existingAll.get(roll) || []) : null;
    const oldNode = stu.querySelector('Grades');
    const fresh = el('Grades');
    components.forEach((comp, i) => {
      const gc = el('GradeComponent');
      const c = el('Component');
      c.textContent = comp;
      gc.appendChild(c);
      const g = el('Grade');
      let v = row[i];
      // Chế độ hợp nhất: ô không nhập điểm mới thì giữ điểm cũ trong file.
      if ((v === null || v === undefined || String(v).trim() === '') && existing) {
        v = existing[i] ?? '';
      }
      if (v === null || v === undefined || String(v).trim() === '') {
        g.setAttribute('xsi:nil', 'true'); // ô trống: ghi nil, không ghi 0
      } else {
        g.textContent = String(v);
      }
      gc.appendChild(g);
      fresh.appendChild(gc);
    });
    if (oldNode) stu.replaceChild(fresh, oldNode);
    else stu.appendChild(fresh);
  });
}

// Đọc điểm hiện có của 1 lớp: Map mã số sinh viên (viết hoa) -> mảng điểm dài
// đúng bằng số phần tử Components của lớp đó (ô chưa có điểm là chuỗi rỗng).
export function readGrades(doc: Document, classIndex: number): Map<string, string[]> {
  const scg = doc.querySelectorAll('SubjectClassGrade')[classIndex];
  const map = new Map<string, string[]>();
  if (!scg) return map;
  const components = Array.from(scg.querySelectorAll('Components > string')).map(s => s.textContent ?? '');
  const compCount = components.length;
  const compIndex: Record<string, number> = {};
  components.forEach((c, i) => { compIndex[c] = i; });
  scg.querySelectorAll('Students > Student').forEach(stu => {
    const roll = (stu.querySelector('Roll')?.textContent ?? '').trim().toUpperCase();
    const row = new Array(compCount).fill('');
    const gcs = stu.querySelectorAll('Grades > GradeComponent');
    if (gcs.length) {
      gcs.forEach(gc => {
        const comp = gc.querySelector('Component')?.textContent ?? '';
        const val = (gc.querySelector('Grade')?.textContent ?? '').trim(); // nil => rỗng
        const idx = compIndex[comp];
        if (idx !== undefined) row[idx] = val;
      });
    } else {
      // Tương thích định dạng cũ dạng danh sách <string>.
      const vals = Array.from(stu.querySelectorAll('Grades > string')).map(s => s.textContent ?? '');
      for (let i = 0; i < compCount; i++) row[i] = vals[i] ?? '';
    }
    map.set(roll, row);
  });
  return map;
}

export function normalizeScore(input: string | number | null): string | null {
  if (input === null || input === undefined || input === '') return null;
  const n = Number(String(input).trim().replace(',', '.'));
  if (Number.isNaN(n) || n < 0 || n > 10) return null;
  return String(Math.round(n * 10) / 10);
}

// Tách tiền tố nhóm trong tên thành phần, ví dụ "[Đánh giá quá trình]Lab 1".
export function splitComponent(raw: string): { group: string; label: string } {
  const m = raw.match(/^\[([^\]]*)\](.*)$/);
  if (m) return { group: m[1].trim(), label: m[2].trim() };
  return { group: 'Khác', label: raw.trim() };
}

export function normName(s: string): string {
  return (s || '').replace(/\s+/g, '').toUpperCase();
}

// Tên file xuất: login-HocKy_lien-dd_MM_yy_HH_mm_ss.fg
export function fgFileName(login: string, semester: string): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const d = new Date();
  const stamp = `${p(d.getDate())}_${p(d.getMonth() + 1)}_${p(d.getFullYear() % 100)}_${p(d.getHours())}_${p(d.getMinutes())}_${p(d.getSeconds())}`;
  return `${login || 'teacher'}-${(semester || 'Semester').replace(/\s+/g, '_')}-${stamp}.fg`;
}
