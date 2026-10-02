// Quy trình mẫu để bắt đầu nhanh
import type { WConnection, WNode } from './types';

const id = () => Math.random().toString(36).slice(2, 10);
const c = (from: string, to: string, fromOutput = 0, toInput = 0): WConnection => ({ from, to, fromOutput, toInput });
const cond = (leftValue: string, type: string, operation: string, rightValue: any = '') => ({ id: id(), leftValue, rightValue, operator: { type, operation } });

export interface Template { key: string; name: string; desc: string; icon: string; build: () => { nodes: WNode[]; connections: WConnection[] } }

export const TEMPLATES: Template[] = [
  {
    key: 'blank', name: 'Quy trình trống', desc: 'Bắt đầu với bước Chạy thủ công', icon: 'Plus',
    build: () => ({ nodes: [{ id: id(), name: 'Chạy thủ công', type: 'manualTrigger', position: [0, 0], parameters: {} }], connections: [] }),
  },
  {
    key: 'remind', name: 'Nhắc việc sắp đến hạn mỗi sáng', desc: 'Thứ 2 đến thứ 6 lúc 7:30, tìm công việc chưa xong có hạn trong 24 giờ tới và gửi thông báo cho bạn', icon: 'Bell',
    build: () => ({
      nodes: [
        { id: id(), name: 'Lịch chạy', type: 'scheduleTrigger', position: [0, 0], parameters: { rules: [{ field: 'cronExpression', expression: '30 7 * * 1-5' }] } },
        { id: id(), name: 'Đọc công việc', type: 'edugoRead', position: [240, 0], parameters: { resource: 'tasks', limit: 500 } },
        { id: id(), name: 'Sắp đến hạn', type: 'filter', position: [480, 0], parameters: { conditions: { combinator: 'and', conditions: [
          cond('{{ $json.status }}', 'string', 'notEquals', 'Completed'),
          cond('{{ $json.deadline }}', 'dateTime', 'before', '{{ $now.plus({ days: 1 }).toISO() }}'),
        ] }, looseTypeValidation: true } },
        { id: id(), name: 'Gom danh sách', type: 'aggregate', position: [720, 0], parameters: { aggregate: 'aggregateAllItemData', destinationFieldName: 'viec' } },
        { id: id(), name: 'Gửi thông báo', type: 'edugoNotify', position: [960, 0], parameters: { to: 'me', title: 'Bạn có {{ $json.viec.length }} công việc sắp đến hạn', message: "{{ $json.viec.map(t => '• ' + t.name).join('\\n') }}", type: 'warning', link: '' } },
      ],
      connections: [c('Lịch chạy', 'Đọc công việc'), c('Đọc công việc', 'Sắp đến hạn'), c('Sắp đến hạn', 'Gom danh sách'), c('Gom danh sách', 'Gửi thông báo')],
    }),
  },
  {
    key: 'api', name: 'Lấy dữ liệu từ API rồi lọc', desc: 'Gọi một API công khai, lọc kết quả, giữ 5 dòng đầu và đổi tên trường', icon: 'Globe',
    build: () => ({
      nodes: [
        { id: id(), name: 'Chạy thủ công', type: 'manualTrigger', position: [0, 0], parameters: {} },
        { id: id(), name: 'Gọi API', type: 'httpRequest', position: [240, 0], parameters: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/todos', responseFormat: 'json', splitArray: true } },
        { id: id(), name: 'Đã hoàn thành', type: 'filter', position: [480, 0], parameters: { conditions: { combinator: 'and', conditions: [cond('{{ $json.completed }}', 'boolean', 'true')] }, looseTypeValidation: true } },
        { id: id(), name: '5 dòng đầu', type: 'limit', position: [720, 0], parameters: { maxItems: 5, keep: 'firstItems' } },
        { id: id(), name: 'Đổi tên trường', type: 'set', position: [960, 0], parameters: { mode: 'manual', assignments: [
          { name: 'maViec', type: 'number', value: '{{ $json.id }}' }, { name: 'tieuDe', type: 'string', value: '{{ $json.title }}' },
        ], includeOtherFields: false, dotNotation: true } },
      ],
      connections: [c('Chạy thủ công', 'Gọi API'), c('Gọi API', 'Đã hoàn thành'), c('Đã hoàn thành', '5 dòng đầu'), c('5 dòng đầu', 'Đổi tên trường')],
    }),
  },
  {
    key: 'branch', name: 'Xếp loại điểm theo nhánh', desc: 'Tạo dữ liệu mẫu bằng Code, rẽ nhánh Đạt hoặc Chưa đạt bằng If rồi gộp lại bằng Merge', icon: 'GitBranch',
    build: () => ({
      nodes: [
        { id: id(), name: 'Chạy thủ công', type: 'manualTrigger', position: [0, 80], parameters: {} },
        { id: id(), name: 'Danh sách điểm', type: 'code', position: [240, 80], parameters: { mode: 'runOnceForAllItems', jsCode: "return [\n  { hoTen: 'Nguyễn Văn An', diem: 8.5 },\n  { hoTen: 'Trần Thị Bình', diem: 4 },\n  { hoTen: 'Lê Minh Châu', diem: 6.5 },\n  { hoTen: 'Phạm Quốc Dũng', diem: 3.5 },\n];" } },
        { id: id(), name: 'Điểm từ 5', type: 'if', position: [480, 80], parameters: { conditions: { combinator: 'and', conditions: [cond('{{ $json.diem }}', 'number', 'gte', '5')] }, looseTypeValidation: true } },
        { id: id(), name: 'Đạt', type: 'set', position: [720, 0], parameters: { mode: 'manual', assignments: [{ name: 'ketQua', type: 'string', value: 'Đạt' }], includeOtherFields: true, dotNotation: true } },
        { id: id(), name: 'Chưa đạt', type: 'set', position: [720, 180], parameters: { mode: 'manual', assignments: [{ name: 'ketQua', type: 'string', value: 'Chưa đạt' }], includeOtherFields: true, dotNotation: true } },
        { id: id(), name: 'Gộp kết quả', type: 'merge', position: [960, 80], parameters: { mode: 'append' } },
        { id: id(), name: 'Sắp xếp theo điểm', type: 'sort', position: [1200, 80], parameters: { type: 'simple', sortFieldsUi: [{ fieldName: 'diem', order: 'descending' }] } },
      ],
      connections: [c('Chạy thủ công', 'Danh sách điểm'), c('Danh sách điểm', 'Điểm từ 5'), c('Điểm từ 5', 'Đạt', 0), c('Điểm từ 5', 'Chưa đạt', 1), c('Đạt', 'Gộp kết quả', 0, 0), c('Chưa đạt', 'Gộp kết quả', 0, 1), c('Gộp kết quả', 'Sắp xếp theo điểm')],
    }),
  },
  {
    key: 'weekly', name: 'Tổng hợp lớp học đầu tuần', desc: 'Mỗi thứ 2 lúc 8:00 đếm số lớp bạn đang quản lý và gửi thông báo tóm tắt', icon: 'CalendarClock',
    build: () => ({
      nodes: [
        { id: id(), name: 'Lịch chạy', type: 'scheduleTrigger', position: [0, 0], parameters: { rules: [{ field: 'weeks', weeksInterval: 1, triggerAtDay: ['1'], triggerAtHour: '8', triggerAtMinute: 0 }] } },
        { id: id(), name: 'Đọc lớp học', type: 'edugoRead', position: [240, 0], parameters: { resource: 'classes', limit: 500 } },
        { id: id(), name: 'Gom lớp', type: 'aggregate', position: [480, 0], parameters: { aggregate: 'aggregateIndividualFields', fieldsToAggregate: [{ fieldToAggregate: 'name', outputFieldName: 'tenLop' }] } },
        { id: id(), name: 'Gửi thông báo', type: 'edugoNotify', position: [720, 0], parameters: { to: 'me', title: 'Tuần mới: bạn đang quản lý {{ $json.tenLop.length }} lớp', message: "{{ $json.tenLop.join(', ') }}", type: 'info' } },
      ],
      connections: [c('Lịch chạy', 'Đọc lớp học'), c('Đọc lớp học', 'Gom lớp'), c('Gom lớp', 'Gửi thông báo')],
    }),
  },
];
