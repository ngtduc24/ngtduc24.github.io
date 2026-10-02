// Kiểu dữ liệu của app Automatic, theo cách tổ chức của n8n:
// quy trình (workflow) gồm các bước (node) nối với nhau (connection), dữ liệu chảy qua là
// một mảng item, mỗi item có khoá json chứa dữ liệu.

export interface Item { json: Record<string, any> }

export interface NodeSettings {
  alwaysOutputData?: boolean;   // không có dữ liệu ra vẫn trả 1 item rỗng
  executeOnce?: boolean;        // chỉ chạy với item đầu tiên
  continueOnFail?: boolean;     // lỗi thì đi tiếp, ghi lỗi vào item
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;    // mili giây
}

export interface WNode {
  id: string;
  name: string;                 // tên duy nhất trong quy trình, dùng trong biểu thức $('Tên')
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  disabled?: boolean;
  notes?: string;
  settings?: NodeSettings;
}

export interface WConnection { from: string; fromOutput: number; to: string; toInput: number }

export interface WorkflowSettings { timezone?: string; saveManualExecutions?: boolean; notifyOnError?: boolean }

export interface Workflow {
  id: string;
  ownerId: string;
  name: string;
  nodes: WNode[];
  connections: WConnection[];
  settings: WorkflowSettings;
  active: boolean;
  lastSlot?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NodeRun {
  startTime: number;
  executionTime: number;
  output: Item[][];             // dữ liệu ra theo từng cổng ra
  input?: Item[];
  error?: string;
}

export type ExecMode = 'manual' | 'schedule';

// Một điều kiện của bước If, Filter, Switch (giống bộ lọc của n8n)
export interface Condition { id: string; leftValue: any; operator: { type: string; operation: string }; rightValue: any }
export interface ConditionGroup { combinator: 'and' | 'or'; conditions: Condition[] }
export type ExecStatus = 'running' | 'success' | 'error';

export interface Execution {
  id: string;
  workflowId: string;
  mode: ExecMode;
  status: ExecStatus;
  startedAt: string;
  finishedAt?: string | null;
  runData: Record<string, NodeRun>;   // theo tên bước
  error?: string | null;
  lastNode?: string;
}

// ===== Khai báo loại bước =====
export type FieldType = 'string' | 'text' | 'number' | 'boolean' | 'options' | 'multioptions' | 'json' | 'code' | 'collection' | 'conditions' | 'datetime' | 'notice';

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  hint?: string;
  show?: (p: Record<string, any>) => boolean;      // hiện khi điều kiện đúng
  noExpression?: boolean;                          // giá trị cố định, không tính biểu thức
  min?: number;
  max?: number;
  rows?: number;
  // collection: danh sách các dòng con, mỗi dòng có các trường con
  fields?: Field[];
  addLabel?: string;
}

export interface ExecContext {
  node: WNode;
  items: Item[];                        // dữ liệu vào cổng 1
  inputs: Item[][];                     // dữ liệu vào theo từng cổng
  param: (name: string, itemIndex?: number, fallback?: any) => any;   // tham số đã tính biểu thức
  rawParam: (name: string, fallback?: any) => any;
  evaluate: (value: any, itemIndex: number) => any;
  exprContext: (itemIndex: number) => Record<string, any>;   // các biến $json, $input, $('Tên')... cho bước Code
  mode: ExecMode;
  workflow: Workflow;
  executionId: string;
  user: { id: string; fullName?: string; username?: string };
  log: (msg: string) => void;
  signal?: AbortSignal;
}

export interface NodeType {
  type: string;
  label: string;
  subtitle?: (p: Record<string, any>) => string;
  desc: string;
  icon: string;                         // tên biểu tượng lucide
  color: string;                        // màu nền biểu tượng
  group: 'trigger' | 'flow' | 'data' | 'web' | 'edugo' | 'util';
  trigger?: boolean;
  inputs: number;
  inputNames?: string[];
  outputs: number | ((p: Record<string, any>) => number);
  outputNames?: (p: Record<string, any>) => string[];
  defaults: Record<string, any>;
  fields: Field[];
  execute: (ctx: ExecContext) => Promise<Item[][]>;
  docs?: string;
}
