export type TaskStatus = 'In Progress' | 'Paused' | 'Completed' | 'Overdue' | 'Cancelled';
export type TaskTag = string;

export const DEFAULT_TAGS = ['Work', 'Client', 'School', 'Personal'];

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'user' | 'member';
  permissions: string[]; // Allowed tab IDs: 'dashboard', 'calculator', 'website', 'edu'
  canAssignTask?: boolean; // Can assign tasks
  canReceiveTask?: boolean; // Can receive/execute tasks
  canRunPauseTask?: boolean; // Can start/pause tasks
  canCompleteTask?: boolean; // Can complete tasks
  canDeleteTask?: boolean; // Can delete tasks
  canCreateTask?: boolean; // Can create tasks
  canManageSettings?: boolean; // Can manage settings
  // Journal Permissions
  canCreateJournal?: boolean;
  canEditJournal?: boolean;
  canDeleteJournal?: boolean;
  canImportJournal?: boolean;
  canManageJournalCats?: boolean;
  canManageJournalSettings?: boolean;
  canCreateQualitative?: boolean;
  canEditQualitative?: boolean;
  canDeleteQualitative?: boolean;
  canImportQualitative?: boolean;
  canExportQualitative?: boolean;
  canManageQualitativeSettings?: boolean;
  canCreateQuantitative?: boolean;
  canEditQuantitative?: boolean;
  canDeleteQuantitative?: boolean;
  canImportQuantitative?: boolean;
  canExportQuantitative?: boolean;
  canManageQuantitativeSettings?: boolean;
  // Edu Permissions
  canManageEdu?: boolean;
  canCreateEdu?: boolean;
  canEditEdu?: boolean;
  canDeleteEdu?: boolean;
  canImportEdu?: boolean;
  canExportEdu?: boolean;
  canGradeEdu?: boolean;
  canGradeImportEdu?: boolean; // Nhập điểm từ file .fg
  // Portfolio Permissions (các mục con trong Quản trị Portfolio)
  canPortfolioContent?: boolean;
  canPortfolioProjects?: boolean;
  canPortfolioCourses?: boolean;
  canPortfolioResearch?: boolean;
  canPortfolioNavigation?: boolean;
  canPortfolioProfile?: boolean;
  // E-Learning Permissions
  canElearningPublic?: boolean;
  canElearningAssign?: boolean;
  // Remier (dựng phim)
  canRemierShared?: boolean;
  createdAt: string;
  password?: string;
  avatarUrl?: string;
  coverImage?: string;
  coverImagePosition?: string;
  avatarPosition?: string;
  fcmTokens?: string[];
  // Sắp xếp và ẩn phím tắt trang tổng quan, lưu theo tài khoản để đồng bộ giữa các thiết bị.
  dashboardIconOrder?: string[];
  dashboardIconHidden?: string[];
}

export interface OnlinePresenceUser {
  id: string;
  sessionId?: string;
  username?: string;
  fullName: string;
  email?: string;
  role: 'admin' | 'user' | 'member';
  avatarUrl?: string;
  onlineAt: string;
}

export interface ScientificJournal {
  id: string;
  name: string;
  issn: string;
  type: string;
  publisher: string;
  field: string;
  score: string;
  establishedDate: string;
  paperCount: number;
  rating: number; // 1 to 5 stars
  description: string;
  coverImage?: string;
  dateImported: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
  createdBy?: string;
  createdByName?: string;
}

export interface JournalField {
  id: string;
  name: string;
}

export interface JournalType {
  id: string;
  name: string;
}

export interface AppSettings {
  dashboardBannerDescription?: string;
  dashboardBannerLabel?: string;
  dashboardBannerImage?: string;
  dashboardBannerPosition?: string; // vị trí hiển thị ảnh nền đầu trang, ví dụ "50% 30%"
  notificationBannerImage?: string;
  calcBannerTitle?: string;
  calcBannerDescription?: string;
  calcBannerLabel?: string;
  calcBannerImage?: string;
  userBannerTitle?: string;
  userBannerDescription?: string;
  userBannerLabel?: string;
  userBannerImage?: string;
  journalBannerTitle?: string;
  journalBannerDescription?: string;
  journalBannerLabel?: string;
  journalBannerImage?: string;
  id: string;
  defaultCoverImage: string;
  themeColor?: string; // e.g. 'green-black', 'purple-indigo', 'blue-cyan', 'red-orange', 'amber-yellow'
  primaryColor?: string; // Custom primary hex color
  secondaryColor?: string; // Custom secondary hex color
  webAppTitle?: string;
  webAppIcon?: string; // base64 string
  sidebarOpacity?: number; // 0.55 - 1
  footerText?: string;
  allowPublicAccess?: boolean;
  systemDescription?: string;
  dashboardBannerTitle?: string;
  initialSeedDone?: boolean;
  bannerTitle?: string;
  bannerDescription?: string;
  bannerColor?: string;
  pageCoverImage?: string | null;
  taskTypes?: string[];
  notificationBannerTitle?: string;
  notificationBannerDescription?: string;
  notificationBannerText?: string;
  taskBannerTitle?: string;
  taskBannerDescription?: string;
  taskBannerLabel?: string;
  taskBannerImage?: string;
  taskBannerIcon?: string;
  journalBannerIcon?: string;
  qdaBannerIcon?: string;
  quantBannerIcon?: string;
  qdaBannerTitle?: string;
  qdaBannerDescription?: string;
  qdaBannerLabel?: string;
  qdaBannerImage?: string;
  quantBannerTitle?: string;
  quantBannerDescription?: string;
  quantBannerLabel?: string;
  quantBannerImage?: string;
  // Tùy chỉnh từng chức năng hệ thống: đổi tên, mô tả, ảnh icon và ẩn hiện.
  moduleOverrides?: Record<string, ModuleOverride>;
  // Ảnh động hiển thị khi trang đang tải lâu. Rỗng thì dùng vòng xoay mặc định.
  loadingGif?: string;
  // Tạm tắt toàn hệ thống. Bật thì người dùng thường thấy trang thông báo tạm đóng.
  maintenanceMode?: boolean;
  // Giao diện trang tạm tắt: 1 là hệ thống tạm đóng, 2 là đang nâng cấp kèm ngày mở lại.
  maintenanceVariant?: 1 | 2;
  // Ngày dự kiến mở lại, dùng cho giao diện 2.
  maintenanceDate?: string;
  // Phông chữ hệ thống. fontHeading cho tiêu đề, fontBody cho nội dung, mô tả.
  fontHeading?: string;
  fontBody?: string;
}

// Tùy chỉnh hiển thị của một chức năng do admin đặt trong màn hình Cài đặt chức năng.
export interface ModuleOverride {
  label?: string;
  desc?: string;
  icon?: string; // URL ảnh thay cho biểu tượng mặc định
  hidden?: boolean;
}

export interface TaskCompletionReport {
  id: string;
  summary: string; // Nội dung báo cáo công việc hoàn thành
  deliverables?: string[]; // Danh sách đường link sản phẩm/kết quả bàn giao
  completedAt: string; // ISO string
  completedBy: string; // User ID
  completedByName: string;
  completedByRole?: string;
  subtaskId?: string; // ID của subtask nếu báo cáo cho subtask
  subtaskTitle?: string; // Tiêu đề subtask
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  completed?: boolean;
  status?: 'In Progress' | 'Paused' | 'Completed';
  progress: number;
  pauseDuration: number;
  lastPausedAt?: string;
  completionReport?: TaskCompletionReport;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  tag?: TaskTag;
  tags?: string[];
  deadline?: string; // ISO string
  startDate?: string;
  endDate?: string;
  hasIncome?: boolean;
  income?: number;
  subtasks?: Subtask[];
  fileNames?: string[];
  attachments?: string[];
  createdAt?: string; // ISO string
  status: TaskStatus;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  type?: string;
  progress?: number;
  pauseDuration?: number; // total pause duration in ms
  lastPausedAt?: string; // ISO string
  assignedTo?: string; // User ID
  assignedToName?: string;
  createdBy?: string;
  createdByName?: string;
  creatorId?: string; // User ID
  coverImage?: string; // URL
  isDeleted?: boolean;
  history?: TaskHistoryEntry[];
  comments?: any[];
  completionReport?: TaskCompletionReport;
}

export interface TaskHistoryEntry {
  id: string;
  action: string;
  timestamp: string; // ISO string
  userId: string;
  userFullName: string;
  details?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'system' | 'task' | 'journal' | 'info' | 'warning' | 'error' | 'success';
  targetAudience?: 'all' | 'all_admins' | 'custom_admins' | 'custom_users';
  targetUserIds?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  senderId?: string;
  senderName?: string;
  unread?: boolean;
  isRead?: boolean;
  actionUrl?: string;
  link?: string;
  metadata?: any;
}

export interface ARTarget {
  id: string;
  name: string;
  target_image_url: string;
  // Tệp .mind đã biên dịch sẵn lúc tạo target, giúp bỏ hẳn bước biên dịch trên điện thoại khi quét.
  mind_file_url?: string;
  content_type: 'video' | 'image' | 'gif' | '3d';
  content_url: string;
  scale: number;
  rotation: number;
  rotation_x?: number;
  rotation_y?: number;
  rotation_z?: number;
  light_intensity?: number; // Cường độ ánh sáng 3D (0.2 - 3.0, mặc định 1.2)
  light_pos_x?: number; // Tọa độ vị trí nguồn sáng trục X (mặc định 5)
  light_pos_y?: number; // Tọa độ vị trí nguồn sáng trục Y (mặc định 10)
  light_pos_z?: number; // Tọa độ vị trí nguồn sáng trục Z (mặc định 7)
  light_rot_x?: number; // Góc xoay hướng sáng X (độ, mặc định 0)
  light_rot_y?: number; // Góc xoay hướng sáng Y (độ, mặc định 0)
  light_rot_z?: number; // Góc xoay hướng sáng Z (độ, mặc định 0)
  light_scale?: number; // Độ phủ / tỉ lệ vùng sáng (0.1 - 5.0, mặc định 1.0)
  position_x?: number;
  position_y?: number;
  position_z?: number;
  // Group 2 Features
  is_transparent_video?: boolean;
  chroma_key_color?: string; // hex color string e.g. '#00ff00'
  auto_play_video?: boolean;
  loop_video?: boolean;
  button_label?: string;
  button_url?: string;

  // Group 3 Features: Capture & 3D Gestures
  enable_capture?: boolean; // Bật/tắt nút chụp ảnh AR
  allow_user_rotate?: boolean; // Bật/tắt tương tác xoay 3D
  allow_user_scale?: boolean; // Bật/tắt tương tác thu phóng (pinch scale) 3D
  allow_user_drag?: boolean; // Bật/tắt tương tác kéo di chuyển (drag) 3D
  
  // Mobile HUD Customization
  show_logo?: boolean; // Bật/tắt logo thương hiệu góc trên
  show_close_button?: boolean; // Bật/tắt nút đóng X
  show_gesture_hint?: boolean; // Bật/tắt banner hướng dẫn cử chỉ 3D
  show_target_name?: boolean; // Bật/tắt hiển thị tên target trên màn hình AR
  
  // Multi-Object & Material PBR Configuration
  scene_objects?: SceneObjectItem[];
  scene_lights?: SceneLightItem[];
  material_config?: PBRMaterialConfig;

  active: boolean;
  description?: string;
  thumbnail_url?: string;
  owner_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PBRMaterialConfig {
  baseColor?: string; // hex string, e.g. '#ffffff'
  baseColorMap?: string; // Image URL or Base64
  roughness?: number; // 0 (mirror/glossy) to 1 (diffuse/rough)
  roughnessMap?: string;
  metalness?: number; // 0 (dielectric) to 1 (pure metal)
  metalnessMap?: string;
  specular?: number; // 0 to 1 intensity
  specularMap?: string;
  normalMap?: string;
  normalScale?: number; // typically 0 to 5, default 1
  displacementMap?: string;
  displacementScale?: number; // typically 0 to 1, default 0.05
  aoMap?: string;
  aoMapIntensity?: number; // 0 to 2, default 1
  emissive?: string; // hex string, e.g. '#000000'
  emissiveIntensity?: number; // 0 to 5, default 1
  emissiveMap?: string;
  opacity?: number; // 0 to 1
  alphaMap?: string;
  transmission?: number; // 0 to 1 (glass/clear water)
  ior?: number; // Index of Refraction: 1.0 to 2.5 (air: 1.0, water: 1.33, glass: 1.5, diamond: 2.42)
}

export interface SceneLightItem {
  id: string;
  name: string;
  type: 'directional' | 'ambient' | 'point' | 'hemisphere';
  color: string;
  intensity: number;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number }; // For directional
  visible: boolean;
  castShadow?: boolean;
}

export interface SceneObjectItem {
  id: string;
  name: string;
  type: '3d' | 'image' | 'video';
  url: string;
  fileName?: string;
  file?: File;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  visible: boolean;
  material?: PBRMaterialConfig;
}

// Social Image Designer Interfaces
export interface SocialDimension {
  id: string;
  name: string;
  width: number;
  height: number;
}

export type SocialLayerType = 'image' | 'text' | 'shape';

export interface SocialTemplateLayer {
  id: string;
  type: SocialLayerType;
  name: string;
  // Coordinates in percentages (0-100)
  x: number;
  y: number;
  width: number;
  height: number;
  // Text specific
  text?: string;
  fontSize?: number; // Base font size, will auto-shrink if requested
  color?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  maxLines?: number;
  autoShrink?: boolean; // For titles
  // Image specific
  objectFit?: 'cover' | 'contain';
  borderRadius?: number;
  // Shape specific
  backgroundColor?: string;
  zIndex: number;
}

export interface SocialTemplate {
  id: string;
  name: string;
  isSystem: boolean; // true if created by admin, false if custom user template
  userId?: string;
  width: number;
  height: number;
  bgImage?: string;
  layers: SocialTemplateLayer[];
}

export interface SocialPreset {
  id: string;
  name: string;
  templateId?: string;
  userId: string;
  userName?: string;
  createdAt: string;
  titleSettings: {
    y: number;
    x: number;
    width?: number;
    fontSize: number;
    color: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
  descSettings?: {
    y: number;
    x: number;
    width?: number;
    fontSize: number;
    color: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
  };
}
