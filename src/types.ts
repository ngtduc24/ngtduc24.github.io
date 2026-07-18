export type TaskStatus = 'In Progress' | 'Paused' | 'Completed' | 'Overdue' | 'Cancelled';
export type TaskTag = string;

export const DEFAULT_TAGS = ['Work', 'Client', 'School', 'Personal'];

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'admin' | 'user' | 'member';
  permissions: string[]; // Allowed tab IDs: 'dashboard', 'calculator', 'website'
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
  createdAt: string;
  password?: string;
  avatarUrl?: string;
  fcmTokens?: string[];
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
  content_type: 'video' | 'image' | 'gif' | '3d';
  content_url: string;
  scale: number;
  rotation: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}
