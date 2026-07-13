import { uploadImageToCloudinary } from '../lib/upload';
import MediaSourcePicker from './MediaSourcePicker';
import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Plus, 
  Trash2, 
  FileText, 
  Download, 
  Upload, 
  Sparkles, 
  Star, 
  X, 
  Edit3, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Image as ImageIcon, 
  Loader2,
  Calendar,
  Layers,
  BookOpen,
  Building,
  Award,
  Hash,
  List,
  History,
  Cpu,
  Trash,
  Microscope,
  Shield,
  Lock,
  Clock,
  User
} from "lucide-react";
import * as XLSX from "xlsx";
import { 
  getJournalsFromSupabase,
  pushNotificationToSupabase,
  saveJournalToSupabase,
  saveJournalsBulkToSupabase,
  deleteJournalFromSupabase,
  getDeletedJournalsFromSupabase,
  restoreJournalFromSupabase,
  restoreMultipleJournalsFromSupabase,
  restoreAllDeletedJournalsFromSupabase,
  hardDeleteJournalFromSupabase,
  hardDeleteMultipleJournalsFromSupabase,
  hardDeleteAllDeletedJournalsFromSupabase,
  getDefaultSettingsFromSupabase,
  saveDefaultSettingsToSupabase,
  getJournalFieldsFromSupabase,
  saveJournalFieldToSupabase,
  deleteJournalFieldFromSupabase,
  transferJournalsFieldInSupabase,
  softDeleteJournalsByFieldInSupabase,
  getJournalTypesFromSupabase,
  saveJournalTypeToSupabase,
  deleteJournalTypeFromSupabase,
  seedDefaultJournalsIfNeeded,
  isDefaultField
} from "../lib/data";
import { 
  ScientificJournal, 
  AppSettings,
  JournalField,
  JournalType,
  UserAccount
} from "../types";
import JournalHistory from "./JournalHistory";
import JournalManualForm from "./JournalManualForm";
import JournalExcelImport from "./JournalExcelImport";
import JournalTools from "./JournalTools";
import JournalAIImport from "./JournalAIImport";
import { useConfirmation } from './ConfirmationContext';
import { useNotifications } from './NotificationContext';

interface ScientificJournalsProps {
  currentUser: UserAccount;
  users?: UserAccount[];
  onUpdateUser?: (user: UserAccount) => Promise<void>;
}

import { Sparkles as IconSparkles, BookOpen as IconBookOpen, FolderKanban as IconFolderKanban, BarChart3 as IconBarChart3, Star as IconStar, Rocket as IconRocket, ClipboardList as IconClipboardList, FileText as IconFileText, Users as IconUsers, Calendar as IconCalendar, Globe as IconGlobe, GraduationCap as IconGraduationCap } from 'lucide-react';

const BANNER_ICONS: Record<string, any> = {
  Sparkles: IconSparkles,
  BookOpen: IconBookOpen,
  FolderKanban: IconFolderKanban,
  BarChart3: IconBarChart3,
  Star: IconStar,
  Rocket: IconRocket,
  ClipboardList: IconClipboardList,
  FileText: IconFileText,
  Users: IconUsers,
  Calendar: IconCalendar,
  Globe: IconGlobe,
  GraduationCap: IconGraduationCap
};

export default function ScientificJournals({ currentUser, users = [], onUpdateUser }: ScientificJournalsProps) {
  const { confirm } = useConfirmation();
  const { addNotification } = useNotifications();
  const isAdmin = currentUser?.role === "admin";
  
  // Fine-grained deep permission helpers
  const hasCreatePermission = isAdmin || !!currentUser?.canCreateJournal;
  const hasEditPermission = isAdmin || !!currentUser?.canEditJournal;
  const hasDeletePermission = isAdmin || !!currentUser?.canDeleteJournal;
  const hasImportPermission = isAdmin || !!currentUser?.canImportJournal;
  const hasManageCatsPermission = isAdmin || !!currentUser?.canManageJournalCats;
  const hasManageSettingsPermission = isAdmin || !!currentUser?.canManageJournalSettings;

  const handleToggleJournalPermission = async (
    user: UserAccount, 
    field: 'canCreateJournal' | 'canEditJournal' | 'canDeleteJournal' | 'canImportJournal' | 'canManageJournalCats' | 'canManageJournalSettings'
  ) => {
    if (user.role === 'admin') {
      showNotification("error", "Không thể thay đổi quyền của Admin");
      return;
    }
    const updatedUser = { ...user, [field]: !user[field] };
    try {
      if (onUpdateUser) {
        await onUpdateUser(updatedUser);
        showNotification("success", `Đã cập nhật quyền cho ${user.fullName}`);
      }
    } catch (err) {
      showNotification("error", "Lỗi kết nối cơ sở dữ liệu: Không thể cập nhật quyền.");
    }
  };
  
  // App states
  const [journals, setJournals] = useState<ScientificJournal[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    id: "general_config",
    defaultCoverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80"
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);
  const [processingAI, setProcessingAI] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedField, setSelectedField] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<string>("all");
  const [selectedTime, setSelectedTime] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<"list" | "manual" | "excel" | "history" | "tools" | "settings" | "categories" | "trash" | "ai">("list");
  const [aiExtractedRows, setAiExtractedRows] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number, total: number, message?: string } | null>(null);
  const [importHistory, setImportHistory] = useState<{
    id: string;
    action: string;
    targetName: string;
    timestamp: string;
    type: "add" | "import" | "delete" | "ai";
  }[]>([]);

  // Managed Fields and Types and Soft deleted journals
  const [fieldsList, setFieldsList] = useState<JournalField[]>([]);
  const [typesList, setTypesList] = useState<JournalType[]>([]);
  const [deletedJournals, setDeletedJournals] = useState<ScientificJournal[]>([]);

  // Inline Category / Type Editing states
  const [newFieldName, setNewFieldName] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFieldName, setEditingFieldName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  
  const [isBannerVisible, setIsBannerVisible] = useState<boolean>(() => {
    const stored = sessionStorage.getItem('isScientificBannerVisible');
    return stored !== null ? JSON.parse(stored) : true;
  });

  const [isUploading, setIsUploading] = useState(false);
  const [showBannerSettings, setShowBannerSettings] = useState(false);
  const [bannerTitle, setBannerTitle] = useState(settings?.journalBannerTitle || '');
  const [bannerDesc, setBannerDesc] = useState(settings?.journalBannerDescription || '');
  const [bannerLabel, setBannerLabel] = useState(settings?.journalBannerLabel || '');
  const [bannerImg, setBannerImg] = useState(settings?.journalBannerImage || '');
  const [bannerIcon, setBannerIcon] = useState(settings?.journalBannerIcon || 'BookOpen');
  const ChipIcon = BANNER_ICONS[settings?.journalBannerIcon || ''] || BANNER_ICONS['BookOpen'];

  useEffect(() => {
    if (settings) {
      setBannerTitle(settings.journalBannerTitle || '');
      setBannerDesc(settings.journalBannerDescription || '');
      setBannerLabel(settings.journalBannerLabel || '');
      setBannerImg(settings.journalBannerImage || '');
      setBannerIcon(settings.journalBannerIcon || 'BookOpen');
    }
  }, [settings]);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const updated = {
        ...settings,
        journalBannerTitle: bannerTitle,
        journalBannerDescription: bannerDesc,
        journalBannerLabel: bannerLabel,
        journalBannerImage: bannerImg,
        journalBannerIcon: bannerIcon,
      };
      await saveDefaultSettingsToSupabase(updated);
      setSettings(updated);
      setShowBannerSettings(false);
      showNotification("success", "Đã lưu cấu hình banner tạp chí!");
    } catch(err) {
      showNotification("error", "Lỗi lưu cấu hình banner!");
    }
  };

  useEffect(() => {
    sessionStorage.setItem('isScientificBannerVisible', JSON.stringify(isBannerVisible));
  }, [isBannerVisible]);
  const [editingTypeName, setEditingTypeName] = useState("");
  
  // Field Deletion & Auto-Migration States
  const [deletingField, setDeletingField] = useState<JournalField | null>(null);
  const [associatedJournalsCount, setAssociatedJournalsCount] = useState<number>(0);
  const [deleteFieldAction, setDeleteFieldAction] = useState<'transfer' | 'delete_all' | null>('transfer');
  const [transferTargetFieldId, setTransferTargetFieldId] = useState<string>("");

  // UI Selection
  const [selectedJournal, setSelectedJournal] = useState<ScientificJournal | null>(null);
  const [showSqlHelp, setShowSqlHelp] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  
  // Modals & Forms
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  
  // Form State
  const [formState, setFormState] = useState<Partial<ScientificJournal>>({
    name: "",
    issn: "",
    type: "Tạp chí",
    publisher: "",
    field: "",
    score: "0 – 0,75",
    establishedDate: "",
    paperCount: 100,
    rating: 3,
    description: "",
    coverImage: ""
  });

  useEffect(() => {
    const cachedHistory = localStorage.getItem("scientific_journal_history");
    if (cachedHistory) {
      try {
        setImportHistory(JSON.parse(cachedHistory));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAdmin && activeSubTab === "history") {
      setActiveSubTab("list");
    }
  }, [isAdmin, activeSubTab]);

  useEffect(() => {
    const container = tabContainerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (container.scrollWidth > container.clientWidth) {
        container.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    container.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheelEvent);
    };
  }, [loading, hasLoadedOnce]);

  const addHistoryLog = (action: string, targetName: string, type: "add" | "import" | "delete" | "ai") => {
    const newLog = {
      id: `log-${Date.now()}`,
      action,
      targetName,
      timestamp: new Date().toLocaleString("vi-VN"),
      type
    };
    setImportHistory(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem("scientific_journal_history", JSON.stringify(updated));
      return updated;
    });
  };

  // Excel duplicate options
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Excel Import Preview States
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [selectedImportField, setSelectedImportField] = useState<string>("");

  // Ref for file input
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Load Journals and Settings
  const loadData = async () => {
    setLoading(true);
    try {
      const loadedJournals = await getJournalsFromSupabase();
      const loadedSettings = await getDefaultSettingsFromSupabase();
      let loadedFields = await getJournalFieldsFromSupabase();
      let loadedTypes = await getJournalTypesFromSupabase();
      const loadedDeleted = await getDeletedJournalsFromSupabase();

      // Auto-sync missing fields and types with robust normalization (NFC and whitespace merging)
      const norm = (str: string) => str.normalize("NFC").replace(/\s+/g, ' ').trim();

      // De-duplicate loadedFields in memory and clean up duplicate records from Supabase in background
      const uniqueFieldsMap = new Map<string, JournalField>();
      const fieldsToDelete: string[] = [];

      loadedFields.forEach(f => {
        const normalized = norm(f.name).toLowerCase();
        if (uniqueFieldsMap.has(normalized)) {
          // Record is a duplicate. Mark for database cleanup.
          fieldsToDelete.push(f.id);
        } else {
          uniqueFieldsMap.set(normalized, f);
        }
      });

      if (fieldsToDelete.length > 0) {
        console.log("Cleaning up duplicate field records from Supabase:", fieldsToDelete);
        for (const fId of fieldsToDelete) {
          deleteJournalFieldFromSupabase(fId).catch(err => console.error("Error deleting duplicate field:", err));
        }
      }
      loadedFields = Array.from(uniqueFieldsMap.values());

      // Find missing fields from active journals using normalized keys
      const journalFieldsMap = new Map<string, string>(); // lowercase -> original case
      loadedJournals.forEach(j => {
        if (j.field) {
          const normalized = norm(j.field);
          if (normalized) {
            const key = normalized.toLowerCase();
            if (!journalFieldsMap.has(key)) {
              journalFieldsMap.set(key, normalized);
            }
          }
        }
      });

      const missingFieldsToCreate: string[] = [];
      journalFieldsMap.forEach((originalName, key) => {
        const fieldExists = loadedFields.some(f => norm(f.name).toLowerCase() === key);
        if (!fieldExists) {
          missingFieldsToCreate.push(originalName);
        }
      });

      if (missingFieldsToCreate.length > 0) {
        console.log("Auto-syncing missing fields to journal_fields:", missingFieldsToCreate);
        for (let i = 0; i < missingFieldsToCreate.length; i++) {
          const f = missingFieldsToCreate[i];
          const id = `field-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`;
          const newField = { id, name: f };
          try {
            await saveJournalFieldToSupabase(newField);
            loadedFields.push(newField);
          } catch (err) {
            console.error(`Failed to auto-sync field ${f}:`, err);
          }
        }
      }

      // De-duplicate loadedTypes in memory and clean up duplicate records from Supabase in background
      const uniqueTypesMap = new Map<string, JournalType>();
      const typesToDelete: string[] = [];

      loadedTypes.forEach(t => {
        const normalized = norm(t.name).toLowerCase();
        if (uniqueTypesMap.has(normalized)) {
          // Record is a duplicate. Mark for database cleanup.
          typesToDelete.push(t.id);
        } else {
          uniqueTypesMap.set(normalized, t);
        }
      });

      if (typesToDelete.length > 0) {
        console.log("Cleaning up duplicate type records from Supabase:", typesToDelete);
        for (const tId of typesToDelete) {
          deleteJournalTypeFromSupabase(tId).catch(err => console.error("Error deleting duplicate type:", err));
        }
      }
      loadedTypes = Array.from(uniqueTypesMap.values());

      // Find missing types from active journals using normalized keys
      const journalTypesMap = new Map<string, string>(); // lowercase -> original case
      loadedJournals.forEach(j => {
        if (j.type) {
          const normalized = norm(j.type);
          if (normalized) {
            const key = normalized.toLowerCase();
            if (!journalTypesMap.has(key)) {
              journalTypesMap.set(key, normalized);
            }
          }
        }
      });

      const missingTypesToCreate: string[] = [];
      journalTypesMap.forEach((originalName, key) => {
        const typeExists = loadedTypes.some(t => norm(t.name).toLowerCase() === key);
        if (!typeExists) {
          missingTypesToCreate.push(originalName);
        }
      });

      if (missingTypesToCreate.length > 0) {
        console.log("Auto-syncing missing types to journal_types:", missingTypesToCreate);
        for (let i = 0; i < missingTypesToCreate.length; i++) {
          const t = missingTypesToCreate[i];
          const id = `type-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`;
          const newType = { id, name: t };
          try {
            await saveJournalTypeToSupabase(newType);
            loadedTypes.push(newType);
          } catch (err) {
            console.error(`Failed to auto-sync type ${t}:`, err);
          }
        }
      }
      
      setJournals(loadedJournals);
      setSettings(loadedSettings);
      setFieldsList(loadedFields);
      setTypesList(loadedTypes);
      setDeletedJournals(loadedDeleted);
      setSelectedTrashIds([]);

      // Tự động mở chi tiết tạp chí nếu có ID được lưu trong localStorage
      const autoOpenJournalId = localStorage.getItem('auto_open_journal_id');
      if (autoOpenJournalId) {
        const foundJournal = loadedJournals.find(j => j.id === autoOpenJournalId);
        if (foundJournal) {
          setSelectedJournal(foundJournal);
          localStorage.removeItem('auto_open_journal_id');
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu báo khoa học:", error);
      showNotification("error", "Không thể kết nối đến cơ sở dữ liệu.");
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const checkAutoOpenJournal = () => {
      const autoOpenJournalId = localStorage.getItem('auto_open_journal_id');
      if (autoOpenJournalId && journals.length > 0) {
        const foundJournal = journals.find(j => j.id === autoOpenJournalId);
        if (foundJournal) {
          setSelectedJournal(foundJournal);
          localStorage.removeItem('auto_open_journal_id');
        }
      }
    };

    checkAutoOpenJournal();

    const handleOpenJournal = (e: Event) => {
      const journalId = (e as CustomEvent).detail;
      const foundJournal = journals.find(j => j.id === journalId);
      if (foundJournal) {
        setSelectedJournal(foundJournal);
        localStorage.removeItem('auto_open_journal_id');
      }
    };

    window.addEventListener('app_open_journal', handleOpenJournal);
    return () => {
      window.removeEventListener('app_open_journal', handleOpenJournal);
    };
  }, [journals]);

  const showNotification = (type: "success" | "error" | "warning", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage(null);
    }, 3000);
  };

  // Check unique key duplicates helper
  const isDuplicate = (name: string, issn: string, excludeId?: string) => {
    return journals.some(j => {
      if (excludeId && j.id === excludeId) return false;
      const matchName = j.name.trim().toLowerCase() === name.trim().toLowerCase();
      const matchIssn = issn && j.issn && j.issn.trim().toLowerCase() === issn.trim().toLowerCase();
      return matchName || matchIssn;
    });
  };

  // Form Submit (Manual add/edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && !hasEditPermission) {
      showNotification("error", "Bạn không có quyền chỉnh sửa thông tin tạp chí.");
      return;
    }
    if (!isEditing && !hasCreatePermission) {
      showNotification("error", "Bạn không có quyền thêm mới tạp chí.");
      return;
    }

    if (!formState.name) {
      showNotification("error", "Tên tạp chí không được để trống.");
      return;
    }

    const nameVal = formState.name.trim();
    const issnVal = (formState.issn || "").trim();

    // Check duplicate if not editing
    if (!isEditing && isDuplicate(nameVal, issnVal)) {
      showNotification("warning", `Tạp chí hoặc ISSN này đã tồn tại trong danh sách!`);
      return;
    }

    const todayStr = new Date().toLocaleDateString("vi-VN");

    const journalToSave: ScientificJournal = {
      id: isEditing ? (formState.id as string) : `journal-${Date.now()}`,
      name: nameVal,
      issn: issnVal,
      type: formState.type || "Tạp chí",
      publisher: formState.publisher || "N/A",
      field: formState.field || "N/A",
      score: String(formState.score || "0 – 0,75"),
      establishedDate: formState.establishedDate || "N/A",
      paperCount: Number(formState.paperCount) || 0,
      rating: Number(formState.rating) || 3,
      description: formState.description || "Chưa có thông tin giới thiệu.",
      coverImage: formState.coverImage || "",
      dateImported: isEditing ? (formState.dateImported || todayStr) : todayStr,
      status: isEditing ? (journals.find(j => j.id === formState.id)?.status || 'approved') : (isAdmin ? 'approved' : 'pending'),
      createdBy: isEditing ? (journals.find(j => j.id === formState.id)?.createdBy || currentUser.id) : currentUser.id,
      createdByName: isEditing ? (journals.find(j => j.id === formState.id)?.createdByName || currentUser.fullName) : currentUser.fullName
    };

    try {
      await saveJournalToSupabase(journalToSave);
      const isNew = !isEditing;
      const isPending = isNew && !isAdmin;
      
      if (isNew) {
        try {
          await pushNotificationToSupabase({
            title: isPending ? 'Yêu cầu duyệt tạp chí mới' : 'Tạp chí mới được thêm',
            description: isPending 
              ? `${currentUser.fullName} đã gửi một yêu cầu duyệt tạp chí mới: "${nameVal}"`
              : `${currentUser.fullName} đã thêm tạp chí mới: "${nameVal}"`,
            type: 'journal',
            targetAudience: isPending ? 'all_admins' : 'all',
            senderId: currentUser.id,
            senderName: currentUser.fullName,
            metadata: { journalId: journalToSave.id, isPending }
          });
        } catch (e) {}
      }

      showNotification(
        "success", 
        isNew 
          ? (isPending ? "Đã gửi yêu cầu thêm tạp chí vào danh sách chờ duyệt của Admin thành công!" : "Đã thêm tạp chí mới thành công!") 
          : "Đã cập nhật tạp chí thành công!"
      );
      addHistoryLog(
        isNew ? (isPending ? "Gửi yêu cầu thêm tạp chí mới" : "Thêm thủ công tạp chí mới") : "Cập nhật thông tin tạp chí",
        nameVal,
        "add"
      );
      
      // Reset & Refresh
      setFormState({
        name: "",
        issn: "",
        type: "Tạp chí",
        publisher: "",
        field: "",
        score: "0 – 0,75",
        establishedDate: "",
        paperCount: 100,
        rating: 3,
        description: "",
        coverImage: ""
      });
      setIsEditing(false);
      setActiveSubTab("list");
      await loadData();
    } catch (err) {
      showNotification("error", "Lỗi khi lưu dữ liệu lên đám mây.");
    }
  };

  // Trigger edit journal
  const handleEditClick = (j: ScientificJournal) => {
    if (!hasEditPermission) {
      showNotification("error", "Bạn không có quyền chỉnh sửa thông tin tạp chí.");
      return;
    }
    setFormState(j);
    setIsEditing(true);
    setActiveSubTab("manual");
  };

  // Approve a pending journal
  const handleApproveJournal = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Phê duyệt tạp chí",
      message: `Bạn có chắc chắn muốn phê duyệt tạp chí "${name}"? Tạp chí này sẽ xuất hiện công khai trong danh sách chính.`,
      confirmText: "Đồng ý phê duyệt",
      cancelText: "Hủy"
    });
    if (!ok) return;

    try {
      setLoading(true);
      const journal = journals.find(j => j.id === id);
      if (journal) {
        const updatedJournal = { ...journal, status: "approved" as const };
        await saveJournalToSupabase(updatedJournal);

        if (journal.createdBy) {
          try {
            await pushNotificationToSupabase({
              title: "Tạp chí đã được phê duyệt",
              description: `Admin đã phê duyệt tạp chí "${name}" đóng góp bởi bạn!`,
              type: "success",
              targetAudience: "custom_users",
              targetUserIds: [journal.createdBy],
              senderId: currentUser.id,
              senderName: currentUser.fullName,
              metadata: { journalId: id }
            });
          } catch (e) {}
        }

        showNotification("success", `Đã phê duyệt tạp chí "${name}" thành công!`);
        addHistoryLog("Phê duyệt tạp chí", name, "add");
        await loadData();
      }
    } catch (error) {
      showNotification("error", "Lỗi khi phê duyệt tạp chí.");
    } finally {
      setLoading(false);
    }
  };

  // Reject a pending journal
  const handleRejectJournal = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Từ chối tạp chí",
      message: `Bạn có chắc chắn muốn từ chối yêu cầu thêm tạp chí "${name}"? Yêu cầu này sẽ bị hủy bỏ hoàn toàn.`,
      confirmText: "Từ chối",
      cancelText: "Quay lại"
    });
    if (!ok) return;

    try {
      setLoading(true);
      const journal = journals.find(j => j.id === id);
      await hardDeleteJournalFromSupabase(id);

      if (journal && journal.createdBy) {
        try {
          await pushNotificationToSupabase({
            title: "Yêu cầu thêm tạp chí bị từ chối",
            description: `Admin đã từ chối yêu cầu thêm tạp chí "${name}" của bạn.`,
            type: "error",
            targetAudience: "custom_users",
            targetUserIds: [journal.createdBy],
            senderId: currentUser.id,
            senderName: currentUser.fullName
          });
        } catch (e) {}
      }

      showNotification("success", `Đã từ chối và xóa yêu cầu duyệt của "${name}".`);
      addHistoryLog("Từ chối duyệt tạp chí", name, "delete");
      await loadData();
    } catch (error) {
      showNotification("error", "Lỗi khi từ chối yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  // Cancel a pending request
  const handleCancelPendingRequest = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Hủy yêu cầu thêm tạp chí",
      message: `Bạn có chắc chắn muốn hủy yêu cầu thêm tạp chí "${name}"?`,
      confirmText: "Đồng ý hủy",
      cancelText: "Hủy bỏ"
    });
    if (!ok) return;

    try {
      setLoading(true);
      await hardDeleteJournalFromSupabase(id);
      showNotification("success", `Đã hủy yêu cầu thêm tạp chí "${name}" thành công!`);
      await loadData();
    } catch (error) {
      showNotification("error", "Lỗi khi hủy yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  // Handle single manual delete
  const handleDeleteSingle = async (id: string, name: string) => {
    if (!hasDeletePermission) {
      showNotification("error", "Bạn không có quyền xoá tạp chí.");
      return;
    }
    if (await confirm('Xác nhận xóa', `Bạn có chắc chắn muốn xoá tạp chí "${name}"?`)) {

      try {
        setLoading(true);
        console.log(`Đang xóa tạp chí: ${id} (${name})`);
        // deleteJournalFromSupabase already has a hard-delete fallback inside it
        await deleteJournalFromSupabase(id);
        showNotification("success", "Đã xoá tạp chí thành công.");
        addHistoryLog("Xoá tạp chí", name, "delete");
        setSelectedIds(prev => prev.filter(item => item !== id));
        await loadData();
      } catch (err: any) {
        console.error("Lỗi khi xoá dữ liệu tạp chí:", err);
        // If soft delete failed, try to offer hard delete directly if admin
        if (isAdmin && await confirm('Xác nhận xóa vĩnh viễn', 'Xóa mềm thất bại (có thể do lỗi cache). Bạn có muốn XÓA VĨNH VIỄN tạp chí này không?')) {
          try {
            await hardDeleteJournalFromSupabase(id);
            showNotification("success", "Đã xoá vĩnh viễn tạp chí.");
            setSelectedIds(prev => prev.filter(item => item !== id));
            await loadData();
          } catch (hardErr) {
            showNotification("error", "Không thể xóa vĩnh viễn: " + (hardErr as Error).message);
          }
        } else {
          showNotification("error", "Lỗi khi xoá dữ liệu: " + (err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle bulk delete
  const handleDeleteBulk = async () => {
    if (!hasDeletePermission) {
      showNotification("error", "Bạn không có quyền xoá tạp chí.");
      return;
    }
    if (selectedIds.length === 0) return;
    if (await confirm('Xác nhận xóa hàng loạt', `Bạn có chắc chắn muốn xoá hàng loạt ${selectedIds.length} tạp chí đã chọn?`)) {
      try {
        setLoading(true);
        const count = selectedIds.length;
        // deleteJournalFromSupabase already handles fallback to hard-delete internally for each item
        for (const id of selectedIds) {
          await deleteJournalFromSupabase(id);
        }
        showNotification("success", `Đã xoá thành công ${count} tạp chí.`);
        addHistoryLog("Xoá hàng loạt tạp chí", `Xoá ${count} tạp chí đã chọn`, "delete");
        setSelectedIds([]);
        await loadData();
      } catch (err: any) {
        console.error("Lỗi khi xoá hàng loạt:", err);
        
        if (isAdmin && (await confirm('Xác nhận xóa vĩnh viễn hàng loạt', "Xóa hàng loạt gặp lỗi (có thể do lỗi cache). Bạn có muốn XÓA VĨNH VIỄN các tạp chí đã chọn không?"))) {
          try {
            for (const id of selectedIds) {
              await hardDeleteJournalFromSupabase(id);
            }
            showNotification("success", "Đã xoá vĩnh viễn các tạp chí đã chọn.");
            setSelectedIds([]);
            await loadData();
            return;
          } catch (hardErr) {
            showNotification("error", "Không thể xóa vĩnh viễn hàng loạt: " + (hardErr as Error).message);
          }
        } else {
          showNotification("error", "Có lỗi xảy ra khi xoá hàng loạt: " + (err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Field Deletion & Migration Logic
  const handleDeleteFieldClick = async (field: JournalField) => {
    // Count associated journals
    const associated = journals.filter(j => j.field?.trim().toLowerCase() === field.name.trim().toLowerCase() && !j.isDeleted);
    
    if (associated.length === 0) {
      if (await confirm('Xác nhận xóa ngành', `Bạn có chắc chắn muốn xóa ngành "${field.name}"?`)) {
        try {
          await deleteJournalFieldFromSupabase(field.id);
          showNotification("success", "Đã xóa ngành thành công.");
          await loadData();
        } catch (err) {
          showNotification("error", "Lỗi khi xóa ngành.");
        }
      }
    } else {
      setDeletingField(field);
      setAssociatedJournalsCount(associated.length);
      setDeleteFieldAction('transfer');
      // Set default target transfer field (the first field in the list that is not this field)
      const otherFields = fieldsList.filter(f => f.id !== field.id);
      if (otherFields.length > 0) {
        setTransferTargetFieldId(otherFields[0].id);
      } else {
        setTransferTargetFieldId("");
      }
    }
  };

  const handleExecuteFieldDelete = async () => {
    if (!deletingField) return;
    try {
      setLoading(true);
      if (deleteFieldAction === 'transfer') {
        const targetField = fieldsList.find(f => f.id === transferTargetFieldId);
        if (!targetField) {
          showNotification("error", "Vui lòng chọn ngành cần chuyển sang.");
          setLoading(false);
          return;
        }
        
        // Update associated journals to the target field name in Supabase
        await transferJournalsFieldInSupabase(deletingField.name, targetField.name);
        
        // Delete the field record
        await deleteJournalFieldFromSupabase(deletingField.id);
        showNotification("success", `Đã xóa ngành "${deletingField.name}" và chuyển ${associatedJournalsCount} tạp chí sang ngành "${targetField.name}".`);
      } else if (deleteFieldAction === 'delete_all') {
        // Soft delete all associated journals
        await softDeleteJournalsByFieldInSupabase(deletingField.name);
        
        // Delete the field record
        await deleteJournalFieldFromSupabase(deletingField.id);
        showNotification("success", `Đã xóa ngành "${deletingField.name}" và xóa toàn bộ ${associatedJournalsCount} tạp chí thuộc ngành này.`);
      }
      
      setDeletingField(null);
      await loadData();
    } catch (err: any) {
      console.error("Lỗi khi xử lý xóa ngành:", err);
      showNotification("error", "Đã xảy ra lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Button: "Xoá dữ liệu trùng"
  const handleClearDuplicates = async () => {
    if (!hasDeletePermission) {
      showNotification("error", "Bạn không có quyền dọn dẹp dữ liệu trùng.");
      return;
    }
    try {
      setLoading(true);
      const seen = new Map<string, ScientificJournal>();
      const toDelete: string[] = [];

      // Sort journals so newest entries come first
      const sorted = [...journals].sort((a, b) => b.id.localeCompare(a.id));

      for (const j of sorted) {
        const uniqueKey = `${j.name.trim().toLowerCase()}_${(j.issn || "").trim().toLowerCase()}`;
        if (seen.has(uniqueKey)) {
          toDelete.push(j.id);
        } else {
          seen.set(uniqueKey, j);
        }
      }

      if (toDelete.length === 0) {
        showNotification("warning", "Không phát hiện dữ liệu tạp chí trùng lặp.");
        setLoading(false);
        return;
      }

      if (await confirm('Xác nhận dọn dẹp dữ liệu trùng', `Phát hiện ${toDelete.length} dòng dữ liệu trùng lặp. Bạn có muốn dọn dẹp và chỉ giữ lại bản ghi mới nhất không?`)) {
        const count = toDelete.length;
        for (const id of toDelete) {
          await deleteJournalFromSupabase(id);
        }
        showNotification("success", `Đã dọn dẹp sạch sẽ! Đã xoá ${count} dòng dữ liệu trùng lặp.`);
        addHistoryLog("Xoá dữ liệu trùng lặp", `Đã dọn dẹp ${count} tạp chí trùng lặp`, "delete");
        setSelectedIds([]);
        await loadData();
      }
    } catch (err) {
      showNotification("error", "Gặp sự cố khi dọn dẹp dữ liệu trùng.");
    } finally {
      setLoading(false);
    }
  };

  // Upload template Excel File
  const handleExportTemplate = () => {
    const headers = [
      "TT",
      "TÊN TẠP CHÍ", 
      "ISSN", 
      "LOẠI", 
      "CƠ QUAN XUẤT BẢN", 
      "NGÀNH", 
      "ĐIỂM"
    ];
    
    const sampleRows = [
      [
        1,
        "Ngân hàng – Viet Nam Banking Review (tên cũ: Tạp chí Ngân hàng)", 
        "e-2815-6056", 
        "Tạp chí", 
        "Ngân hàng Nhà nước Việt Nam", 
        "Kinh tế", 
        "0 – 0,5"
      ],
      [
        2,
        "Khoa học",
        "2354-1059",
        "Tạp chí",
        "Trường Đại học Sư phạm Hà Nội",
        "Khoa học Trái đất - Mỏ",
        "0 – 0,75"
      ],
      [
        3,
        "Khoa học Thể dục Thể thao",
        "1859-4662",
        "Tạp chí",
        "Viện Khoa học Thể dục Thể thao",
        "Văn hoá - Nghệ thuật - TDTT",
        "0 – 0,75"
      ],
      [
        4,
        "Giao thông vận tải",
        "e-2615-9791",
        "Tạp chí",
        "Bộ Giao thông vận tải",
        "Hoá học - Công nghệ thực phẩm",
        "0 – 0,5"
      ],
      [
        5,
        "Khoa học và Công nghệ Giao thông",
        "2734-9942",
        "Tạp chí",
        "Trường Đại học Công nghệ Giao thông Vận tải",
        "Khoa học Trái đất - Mỏ",
        "0 – 0,25"
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tạp chí Khoa học");
    XLSX.writeFile(wb, "Mau_nhap_lieu_bao_khoa_hoc.xlsx");
    showNotification("success", "Đã xuất file Excel mẫu thành công!");
  };

  // Import Excel File - Parse and Store in State for Preview
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (rows.length <= 1) {
          showNotification("error", "File trống hoặc không đúng định dạng mẫu.");
          return;
        }

        const norm = (str: string) => str.normalize("NFC").replace(/\s+/g, ' ').trim();

        const parsed: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

          // Column 0: TT (could be omitted, let's detect)
          const firstColIsNumber = !isNaN(Number(row[0])) && row[0] !== "";
          const offset = firstColIsNumber ? 1 : 0;

          const name = row[0 + offset] ? norm(String(row[0 + offset])) : "";
          if (!name || name.toLowerCase() === "tên tạp chí" || name.toLowerCase() === "tên") continue;

          const issn = row[1 + offset] ? norm(String(row[1 + offset])) : "";
          const type = row[2 + offset] ? norm(String(row[2 + offset])) : "Tạp chí";
          const publisher = row[3 + offset] ? norm(String(row[3 + offset])) : "—";
          const field = row[4 + offset] ? norm(String(row[4 + offset])) : "Chưa phân loại";
          const score = row[5 + offset] ? norm(String(row[5 + offset])) : "0";

          parsed.push({
            name,
            issn,
            type,
            publisher,
            field,
            score,
            establishedDate: "N/A",
            paperCount: 100,
            rating: 3,
            description: "",
            coverImage: ""
          });
        }

        setPreviewRows(parsed);
        setUploadedFileName(file.name);
        showNotification("success", `Đã đọc thành công ${parsed.length} dòng dữ liệu từ file! Nhấn "Nhập dữ liệu mới" để lưu vào hệ thống.`);
      } catch (err) {
        console.error("Lỗi đọc Excel:", err);
        showNotification("error", "Đã xảy ra lỗi khi đọc file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Perform actual import of parsed rows into Firestore and auto-populate metadata
  const handleImportParsedRows = async (mappings: Record<string, string> = {}) => {
    if (previewRows.length === 0) {
      showNotification("error", "Vui lòng chọn file Excel trước.");
      return;
    }

    setLoading(true);
    setImportProgress({ current: 0, total: previewRows.length, message: 'Đang chuẩn bị dữ liệu...' });
    try {
      const todayStr = new Date().toLocaleDateString("vi-VN");
      let importedCount = 0;
      let skippedCount = 0;

      // Use local copies because state updates are async
      let currentFields = [...fieldsList];
      let currentTypes = [...typesList];

      const norm = (str: string) => str.normalize("NFC").replace(/\s+/g, ' ').trim();

      // Extract unique types to automatically add them to managers
      const uniqueTypesMap = new Map<string, string>(); // lowercase -> original case
      previewRows.forEach(r => {
        if (r.type) {
          const normalized = norm(r.type);
          if (normalized) {
            uniqueTypesMap.set(normalized.toLowerCase(), normalized);
          }
        }
      });

      // Auto add missing types
      const uniqueTypesToCreate = Array.from(uniqueTypesMap.values());
      for (let i = 0; i < uniqueTypesToCreate.length; i++) {
        const t = uniqueTypesToCreate[i];
        setImportProgress({ current: 0, total: previewRows.length, message: `Đang kiểm tra phân loại tạp chí (${i + 1}/${uniqueTypesToCreate.length})...` });
        const typeExists = currentTypes.some(tl => norm(tl.name).toLowerCase() === t.toLowerCase());
        if (!typeExists) {
          const id = `type-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`;
          const newType = { id, name: t };
          await saveJournalTypeToSupabase(newType);
          currentTypes.push(newType);
        }
      }
      setTypesList(currentTypes);

      // Extract target fields that need to be created in the database.
      // A field needs to be created if it is used as a targetField and doesn't exist in currentFields yet.
      const targetFieldsToCreate = new Map<string, string>(); // lowercase -> original case
      for (const row of previewRows) {
        let rowField = row.field ? norm(String(row.field)) : "";
        if (rowField) {
          const matchedSystemField = currentFields.find(fl => norm(fl.name).toLowerCase() === rowField.toLowerCase());
          if (!matchedSystemField) {
            const mappedValue = mappings[rowField];
            if (!mappedValue || mappedValue === "__CREATE__") {
              targetFieldsToCreate.set(rowField.toLowerCase(), rowField);
            }
          }
        }
      }

      // Auto add missing fields
      const uniqueFieldsToCreate = Array.from(targetFieldsToCreate.values());
      for (let i = 0; i < uniqueFieldsToCreate.length; i++) {
        const f = uniqueFieldsToCreate[i];
        setImportProgress({ current: 0, total: previewRows.length, message: `Đang kiểm tra lĩnh vực (${i + 1}/${uniqueFieldsToCreate.length})...` });
        const fieldExists = currentFields.some(fl => norm(fl.name).toLowerCase() === f.toLowerCase());
        if (!fieldExists) {
          const id = `field-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`;
          const newField = { id, name: f };
          await saveJournalFieldToSupabase(newField);
          currentFields.push(newField);
        }
      }
      setFieldsList(currentFields);

      const journalsToImport: ScientificJournal[] = [];

      for (let i = 0; i < previewRows.length; i++) {
        const row = previewRows[i];
        
        // Check duplicate
        if (isDuplicate(row.name, row.issn)) {
          if (skipDuplicates) {
            skippedCount++;
            continue; 
          }
        }

        // Check and map the field/discipline
        let rowField = row.field ? String(row.field).trim() : "";
        let targetField = "Chưa phân loại";

        if (rowField) {
          const matchedSystemField = currentFields.find(fl => String(fl.name).trim().toLowerCase() === rowField.toLowerCase());
          if (matchedSystemField) {
            targetField = matchedSystemField.name;
          } else {
            const mappedValue = mappings[rowField];
            if (mappedValue && mappedValue !== "__CREATE__") {
              targetField = mappedValue;
            } else if (selectedImportField) {
              targetField = selectedImportField;
            } else {
              targetField = rowField || "Chưa phân loại";
            }
          }
        } else {
          const mappedValueForEmpty = mappings[""];
          if (mappedValueForEmpty && mappedValueForEmpty !== "__CREATE__") {
            targetField = mappedValueForEmpty;
          } else if (selectedImportField) {
            targetField = selectedImportField;
          } else {
            targetField = "Chưa phân loại";
          }
        }

        const newId = `journal-excel-${Date.now()}-${i}`;
        const newJournal: ScientificJournal = {
          id: newId,
          name: row.name,
          issn: row.issn,
          type: row.type || "Tạp chí",
          publisher: row.publisher || "—",
          field: targetField,
          score: row.score || "0",
          establishedDate: "N/A",
          paperCount: 100,
          rating: 3,
          description: "",
          coverImage: "",
          dateImported: todayStr,
          status: isAdmin ? "approved" : "pending",
          createdBy: currentUser.id,
          createdByName: currentUser.fullName
        };

        journalsToImport.push(newJournal);
        importedCount++;
      }

      if (journalsToImport.length > 0) {
        setImportProgress({ 
          current: journalsToImport.length, 
          total: journalsToImport.length, 
          message: `Đang lưu ${journalsToImport.length} tạp chí khoa học lên cơ sở dữ liệu đám mây...` 
        });
        await saveJournalsBulkToSupabase(journalsToImport);
      }

      if (importedCount > 0 && !isAdmin) {
        try {
          await pushNotificationToSupabase({
            title: 'Yêu cầu duyệt danh sách tạp chí mới',
            description: `${currentUser.fullName} đã gửi yêu cầu duyệt ${importedCount} tạp chí nhập từ file Excel.`,
            type: 'journal',
            targetAudience: 'all_admins',
            senderId: currentUser.id,
            senderName: currentUser.fullName,
            metadata: { isPending: true, count: importedCount }
          });
        } catch (e) {}
      }

      showNotification(
        "success", 
        !isAdmin 
          ? `Đã gửi ${importedCount} tạp chí vào danh sách chờ duyệt của Admin thành công! ${skippedCount > 0 ? `Bỏ qua ${skippedCount} bản ghi bị trùng.` : ""}`
          : `Đã nhập thành công ${importedCount} tạp chí khoa học. ${skippedCount > 0 ? `Bỏ qua ${skippedCount} bản ghi bị trùng.` : ""}`
      );
      addHistoryLog(
        "Nhập dữ liệu từ Excel", 
        !isAdmin 
          ? `Gửi yêu cầu duyệt ${importedCount} tạp chí từ file "${uploadedFileName}"`
          : `Nhập thành công ${importedCount} tạp chí từ file "${uploadedFileName}"`, 
        "import"
      );
      
      // Reset Import states
      setPreviewRows([]);
      setUploadedFileName("");
      if (excelInputRef.current) excelInputRef.current.value = "";

      setActiveSubTab("list");
      await loadData();
    } catch (err) {
      console.error("Lỗi khi nhập dữ liệu từ Excel:", err);
      showNotification("error", "Có lỗi xảy ra khi lưu dữ liệu lên đám mây.");
    } finally {
      setLoading(false);
      setImportProgress(null);
    }
  };

  // Perform actual import of selected AI scanned rows into Firestore
  const handleAiImportSelected = async (selectedRows: any[]) => {
    if (selectedRows.length === 0) {
      showNotification("warning", "Chưa chọn tạp chí nào để nhập.");
      return;
    }

    setLoading(true);
    try {
      let importedCount = 0;
      const todayStr = new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN");

      for (let i = 0; i < selectedRows.length; i++) {
        const row = selectedRows[i];
        const newId = `journal-ai-${Date.now()}-${i}`;

        const newJournal: ScientificJournal = {
          id: newId,
          name: row.name || "Tạp chí không tên",
          issn: row.issn || "",
          type: row.type || "Tạp chí",
          publisher: row.publisher || "—",
          field: row.field || "Chưa phân loại",
          score: row.score || "1.0",
          establishedDate: row.establishedDate || "N/A",
          paperCount: Number(row.paperCount) || 100,
          rating: Number(row.rating) || 3,
          description: row.description || "",
          dateImported: todayStr,
          coverImage: settings.defaultCoverImage || "",
          status: isAdmin ? "approved" : "pending",
          createdBy: currentUser.id,
          createdByName: currentUser.fullName
        };

        await saveJournalToSupabase(newJournal);
        importedCount++;
      }

      if (importedCount > 0 && !isAdmin) {
        try {
          await pushNotificationToSupabase({
            title: 'Yêu cầu duyệt tạp chí quét AI',
            description: `${currentUser.fullName} đã gửi yêu cầu duyệt ${importedCount} tạp chí quét được bằng AI.`,
            type: 'journal',
            targetAudience: 'all_admins',
            senderId: currentUser.id,
            senderName: currentUser.fullName,
            metadata: { isPending: true, count: importedCount }
          });
        } catch (e) {}
      }

      showNotification(
        "success", 
        !isAdmin 
          ? `Đã gửi ${importedCount} tạp chí từ quét AI vào danh sách chờ duyệt của Admin thành công!`
          : `Đã nhập thành công ${importedCount} tạp chí khoa học từ kết quả quét AI!`
      );
      addHistoryLog(
        "Nhập dữ liệu từ AI", 
        !isAdmin 
          ? `Gửi yêu cầu duyệt ${importedCount} tạp chí từ quét AI`
          : `Đã nhập thành công ${importedCount} tạp chí quét bằng AI.`, 
        "ai"
      );

      // Remove successfully imported rows from the preview list
      const importedIds = selectedRows.map(r => r.tempId);
      setAiExtractedRows(prev => {
        const remaining = prev.filter(r => !importedIds.includes(r.tempId));
        if (remaining.length === 0) {
          setActiveSubTab("list");
        }
        return remaining;
      });

      await loadData();
    } catch (err) {
      console.error("Lỗi khi nhập dữ liệu AI:", err);
      showNotification("error", "Có lỗi xảy ra khi lưu dữ liệu AI lên cơ sở dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  // Export all database journals to an Excel file
  const handleExportAll = () => {
    if (journals.length === 0) {
      showNotification("warning", "Không có dữ liệu tạp chí để xuất.");
      return;
    }

    const headers = [
      "TT",
      "TÊN TẠP CHÍ", 
      "ISSN", 
      "LOẠI", 
      "CƠ QUAN XUẤT BẢN", 
      "NGÀNH", 
      "ĐIỂM"
    ];

    const rowsData = journals.map((j, idx) => [
      idx + 1,
      j.name,
      j.issn || "",
      j.type || "Tạp chí",
      j.publisher || "—",
      j.field || "Chưa phân loại",
      j.score || "0"
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rowsData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách Tạp chí");
    XLSX.writeFile(wb, "Danh_sach_bao_khoa_hoc_he_thong.xlsx");
    showNotification("success", `Đã xuất toàn bộ ${journals.length} tạp chí ra file Excel thành công!`);
  };

  // Upload scanned PDF using Gemini API to auto-fill
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Convert PDF to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Str = reader.result as string;
      setProcessingAI(true);
      showNotification("warning", "AI đang quét và phân tích file PDF. Vui lòng đợi trong giây lát...");

      try {
        const response = await fetch("/api/journal/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pdfBase64: base64Str,
            fileName: file.name
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData?.error || "Không thể phân tích PDF.");
        }

        const extractedData = await response.json();
        
        let list: any[] = [];
        if (extractedData.journals && Array.isArray(extractedData.journals)) {
          list = extractedData.journals;
        } else if (extractedData.name) {
          list = [extractedData];
        }

        const rowsWithTempId = list.map((item, index) => ({
          ...item,
          tempId: `ai-row-${Date.now()}-${index}`,
          issn: item.issn || "",
          type: item.type || "Tạp chí",
          publisher: item.publisher || "—",
          field: item.field || "",
          score: String(item.score || "1.0"),
          establishedDate: item.establishedDate || "N/A",
          paperCount: Number(item.paperCount) || 100,
          rating: Number(item.rating) || 3,
          description: item.description || ""
        }));

        setAiExtractedRows(rowsWithTempId);
        setIsEditing(false);
        setActiveSubTab("ai");
        addHistoryLog("Quét tài liệu bằng AI", `Phân tích thành công ${rowsWithTempId.length} tạp chí từ file "${file.name}"`, "ai");
        showNotification("success", `AI đã trích xuất thành công ${rowsWithTempId.length} tạp chí! Vui lòng kiểm tra, hiệu chỉnh và nhập vào CSDL.`);
      } catch (error: any) {
        console.error("Lỗi AI quét PDF:", error);
        showNotification("error", `Không quét được PDF: ${error.message}`);
      } finally {
        setProcessingAI(false);
        if (pdfInputRef.current) pdfInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // Global settings: Save default image
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveDefaultSettingsToSupabase(settings);
      showNotification("success", "Đã cập nhật cấu hình mặc định tạp chí khoa học!");
      setActiveSubTab("list");
    } catch (err) {
      showNotification("error", "Lỗi lưu cấu hình.");
    }
  };

  // Helper checkbox state
  const handleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectTrashId = (id: string) => {
    setSelectedTrashIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Helper filters for pending/approved status
  const approvedJournals = journals.filter(j => j.status === 'approved' || !j.status);
  const pendingJournals = journals.filter(j => j.status === 'pending');
  const myPendingJournals = journals.filter(j => j.status === 'pending' && j.createdBy === currentUser.id);
  const pendingCount = isAdmin ? pendingJournals.length : myPendingJournals.length;

  // Extract unique filters for dropdowns
  const fields = ["all", ...Array.from(new Set([...fieldsList.map(f => f.name), ...approvedJournals.map(j => j.field)])).filter(Boolean)];
  const types = ["all", ...Array.from(new Set([...typesList.map(t => t.name), ...approvedJournals.map(j => j.type)])).filter(Boolean)];
  const scoreFilters = ["all", "0 – 0,25", "0 – 0,5", "0 – 0,75", "0 – 1,0", "0 – 1,5", "0 – 3,0"];

  const parseDateImported = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  // Filtering list
  const filteredJournals = approvedJournals.filter(j => {
    const matchesSearch = 
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (j.issn || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.publisher || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.field || "").toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesField = selectedField === "all" || j.field === selectedField;
    const matchesType = selectedType === "all" || j.type === selectedType;
    const matchesScore = selectedScore === "all" || 
      j.score === selectedScore || 
      (j.score && String(j.score).includes(selectedScore));

    const matchesTime = (() => {
      if (selectedTime === "all") return true;
      const date = parseDateImported(j.dateImported);
      if (!date) return false;
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (selectedTime === "today") {
        return date >= startOfToday;
      }
      if (selectedTime === "3days") {
        const limit = new Date(startOfToday);
        limit.setDate(limit.getDate() - 3);
        return date >= limit;
      }
      if (selectedTime === "7days") {
        const limit = new Date(startOfToday);
        limit.setDate(limit.getDate() - 7);
        return date >= limit;
      }
      if (selectedTime === "30days") {
        const limit = new Date(startOfToday);
        limit.setDate(limit.getDate() - 30);
        return date >= limit;
      }
      if (selectedTime === "thismonth") {
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
      }
      if (selectedTime === "thisyear") {
        return date.getFullYear() === now.getFullYear();
      }
      return true;
    })();

    return matchesSearch && matchesField && matchesType && matchesScore && matchesTime;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedField, selectedType, selectedScore, selectedTime]);

  const totalPages = Math.ceil(filteredJournals.length / itemsPerPage);
  const paginatedJournals = filteredJournals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading && !hasLoadedOnce) {
    return (
      <div className="p-20 text-center space-y-4 min-h-[65vh] flex flex-col items-center justify-center animate-fadeIn">
        <Loader2 className="w-10 h-10 animate-spin text-brand mx-auto" />
        <p className="text-xs font-bold text-slate-500 animate-pulse">Đang tải cấu hình & danh mục tạp chí...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Dashboard */}
      {isBannerVisible && (
        <div className="bg-brand rounded-3xl p-8 text-white relative overflow-hidden shadow-lg animate-fadeIn" style={{ ...(settings?.journalBannerImage ? { backgroundImage: `url(${settings.journalBannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) }}>
        {settings?.journalBannerImage && <div className="absolute inset-0 bg-black/40" />}
          {isAdmin && (
            <button onClick={() => setShowBannerSettings(true)} className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer">
              <Settings className="w-5 h-5" />
            </button>
          )}
          {/* Banner Settings Removed */}

          <div className="flex flex-col items-start gap-4">
            {/* Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs relative z-10">
              <ChipIcon className="w-3.5 h-3.5 text-brand-light" />
              <span>{settings?.journalBannerLabel || "ĐIỂM BÁO KHOA HỌC"}</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-1 relative z-10">
              <h1 className="text-3xl font-extrabold tracking-tight">{settings?.journalBannerTitle || "Quản lý điểm báo khoa học"}</h1>
              <p className="text-xs text-white/90 opacity-90 max-w-lg">{settings?.journalBannerDescription || "Quản lý, tra cứu và cập nhật các tạp chí khoa học được tính điểm."}</p>
            </div>
          </div>
        </div>
      )}

      {showBannerSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-left animate-fadeIn text-slate-800">
            <h2 className="text-sm font-extrabold text-slate-800">Cài đặt Banner Module Điểm Báo</h2>
            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Biểu tượng</label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(BANNER_ICONS).map(([iconName, IconComp]) => (
                    <button key={iconName} type="button" onClick={() => setBannerIcon(iconName)} title={iconName} className={bannerIcon === iconName ? "p-2 rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-700 flex items-center justify-center" : "p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"}>
                      <IconComp className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Tiêu đề</label>
                <input type="text" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Nhãn phụ (Badge)</label>
                <input type="text" value={bannerLabel} onChange={e => setBannerLabel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Mô tả</label>
                <textarea value={bannerDesc} onChange={e => setBannerDesc(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50" rows={2}></textarea>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase flex justify-between items-center">
                  <span>Ảnh bìa (Tùy chọn)</span>
                  {bannerImg && (
                    <button type="button" onClick={() => setBannerImg('')} className="text-rose-500 hover:text-rose-600 text-[10px] flex items-center gap-1">
                      <X className="w-3 h-3" /> Xóa ảnh (Dùng màu nền)
                    </button>
                  )}
                </label>
                <MediaSourcePicker onSelect={setBannerImg} accept="image/*" resourceType="image" folder="module-banners/journals" category="Ảnh bìa báo khoa học" label="Chọn ảnh bìa" disabled={isUploading} />
                {bannerImg && <img src={bannerImg} alt="Preview" className="h-16 rounded-xl object-cover mt-2" />}
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowBannerSettings(false)} className="px-4 py-2 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-100">Hủy</button>
                <button type="submit" disabled={isUploading} className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold shadow-sm">{isUploading ? 'Đang tải...' : 'Lưu cài đặt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banner Notifications */}
      {alertMessage && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border shadow-xs animate-slideDown ${
          alertMessage.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
            : alertMessage.type === "warning"
            ? "bg-amber-50 text-amber-800 border-amber-100"
            : "bg-rose-50 text-rose-800 border-rose-100"
        }`}>
          <div className="shrink-0 mt-0.5">
            {alertMessage.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            {alertMessage.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            {alertMessage.type === "error" && <Info className="w-5 h-5 text-rose-500" />}
          </div>
          <div className="text-xs font-semibold">{alertMessage.text}</div>
        </div>
      )}

      {/* Quick Statistics Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Tổng số tạp chí</span>
            <span className="text-2.5xl font-extrabold text-slate-900 leading-none block">{approvedJournals.length}</span>
            <span className="text-[11px] text-slate-500 font-medium block">Tạp chí khoa học đã được duyệt</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Ngành/Lĩnh vực</span>
            <span className="text-2.5xl font-extrabold text-slate-900 leading-none block">
              {fieldsList.length}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">Số lượng chuyên ngành đa dạng</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <Microscope className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div ref={tabContainerRef} className="flex border-b border-slate-200 overflow-x-auto scrollbar-none gap-2 bg-slate-50 p-1.5 rounded-2xl">
        <button
          onClick={() => { setActiveSubTab("list"); setIsEditing(false); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "list" 
              ? "bg-white text-brand shadow-xs border border-slate-200/60" 
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <List className="w-4 h-4" />
          <span>Danh sách</span>
        </button>

        {(hasCreatePermission || isEditing) && (
          <button
            onClick={() => {
              setActiveSubTab("manual");
              if (!isEditing) {
                setFormState({
                  name: "",
                  issn: "",
                  type: "Tạp chí",
                  publisher: "",
                  field: "",
                  score: "0 – 0,75",
                  establishedDate: "",
                  paperCount: 100,
                  rating: 3,
                  description: "",
                  coverImage: ""
                });
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "manual" 
                ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isEditing ? "Sửa thông tin" : "Thêm thủ công"}</span>
          </button>
        )}

        {(hasImportPermission || hasCreatePermission) && (
          <button
            onClick={() => { setActiveSubTab("excel"); setIsEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "excel" 
                ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Nhập Excel</span>
          </button>
        )}

        <button
          onClick={() => { setActiveSubTab("pending"); setIsEditing(false); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "pending" 
              ? "bg-white text-amber-600 shadow-xs border border-amber-200" 
              : pendingCount > 0
                ? "text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 animate-pulse font-bold"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Chờ duyệt ({pendingCount})</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => { setActiveSubTab("history"); setIsEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "history" 
                ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử</span>
          </button>
        )}

        {(hasImportPermission || hasCreatePermission) && (
          <button
            onClick={() => { setActiveSubTab("tools"); setIsEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "tools" 
                ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Công cụ & AI</span>
          </button>
        )}

        {(hasImportPermission || hasCreatePermission) && aiExtractedRows.length > 0 && (
          <button
            onClick={() => { setActiveSubTab("ai"); setIsEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "ai" 
                ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                : "text-brand bg-brand/10 hover:bg-brand/20 border border-brand/20"
            }`}
          >
            <Sparkles className="w-4 h-4 text-brand" />
            <span>Kết quả quét AI ({aiExtractedRows.length})</span>
          </button>
        )}

        {hasManageCatsPermission && (
          <button
            onClick={() => { setActiveSubTab("categories"); setIsEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "categories" 
                ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Microscope className="w-4 h-4" />
            <span>Quản lý Ngành/Loại</span>
          </button>
        )}

        {hasDeletePermission && (
          <button
            onClick={() => { setActiveSubTab("trash"); setIsEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "trash" 
                ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Trash className="w-4 h-4" />
            <span>Thùng rác ({deletedJournals.length})</span>
          </button>
        )}

        {hasManageSettingsPermission && (
          <button
            onClick={() => { setActiveSubTab("settings"); setIsEditing(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === "settings" 
                ? "bg-white text-brand shadow-xs border border-slate-200/60" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Cài đặt</span>
          </button>
        )}
      </div>

      {/* Render sub-tabs */}
      {activeSubTab === "list" && (
        <div className="space-y-4">
          {/* Filters card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
            {/* Search Bar on top and full-width */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm theo tên tạp chí, ISSN, lĩnh vực, nhà xuất bản..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>

            {/* Filters layout below */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100/60">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Phân loại:</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả loại</option>
                  {types.filter(t => t !== "all").map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ngành:</span>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[150px] truncate"
                >
                  <option value="all">Tất cả ngành</option>
                  {fields.filter(f => f !== "all").map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Điểm:</span>
                <select
                  value={selectedScore}
                  onChange={(e) => setSelectedScore(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả điểm</option>
                  {scoreFilters.filter(s => s !== "all").map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Thời gian:</span>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả thời gian</option>
                  <option value="today">Hôm nay</option>
                  <option value="3days">3 ngày gần đây</option>
                  <option value="7days">7 ngày gần đây</option>
                  <option value="30days">30 ngày gần đây</option>
                  <option value="thismonth">Tháng này</option>
                  <option value="thisyear">Năm nay</option>
                </select>
              </div>
            </div>

            {/* Operations list */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {hasDeletePermission && (
                  <button
                    disabled={selectedIds.length === 0}
                    onClick={handleDeleteBulk}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedIds.length > 0 
                        ? "bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700" 
                        : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa đã chọn ({selectedIds.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedIds(filteredJournals.map(j => j.id))}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Chọn tất cả
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>

              <span className="text-xs font-bold text-slate-500">
                {filteredJournals.length} kết quả
              </span>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-20 text-center space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-brand mx-auto animate-pulse" />
                <p className="text-xs font-bold text-slate-500">Đang tải danh sách tạp chí...</p>
              </div>
            ) : filteredJournals.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">Không tìm thấy tạp chí nào</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Vui lòng điều chỉnh bộ lọc hoặc tạo thêm mới tạp chí.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">
                      <th className="py-4 px-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredJournals.length > 0 && filteredJournals.every(j => selectedIds.includes(j.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allFilteredIds = filteredJournals.map(j => j.id);
                              setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                            } else {
                              const allFilteredIds = filteredJournals.map(j => j.id);
                              setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                            }
                          }}
                          className="rounded border-slate-300 text-brand focus:ring-brand w-3.5 h-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="py-4 px-4 w-12 text-center">TT</th>
                      <th className="py-4 px-4">TÊN TẠP CHÍ</th>
                      <th className="py-4 px-4">ISSN</th>
                      <th className="py-4 px-4">LOẠI</th>
                      <th className="py-4 px-4">CƠ QUAN XB</th>
                      <th className="py-4 px-4">NGÀNH / LĨNH VỰC</th>
                      <th className="py-4 px-4 text-center">ĐIỂM</th>
                      <th className="py-4 px-4 text-center">NGÀY NHẬP</th>
                      <th className="py-4 px-4 text-right">HÀNH ĐỘNG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {paginatedJournals.map((j, index) => {
                      const imageToShow = j.coverImage || settings.defaultCoverImage;
                      const isSelected = selectedIds.includes(j.id);
                      return (
                        <tr 
                          key={j.id} 
                          className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                            isSelected ? "bg-brand/5" : ""
                          }`}
                          onClick={() => handleSelectId(j.id)}
                        >
                          <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectId(j.id)}
                              className="rounded border-slate-300 text-brand focus:ring-brand w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-[11px] text-slate-400">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="py-4 px-4 max-w-sm">
                            <div className="flex items-center gap-3">
                              <img 
                                src={imageToShow} 
                                alt={j.name} 
                                className="w-10 h-10 object-cover rounded-lg shadow-xs shrink-0 bg-slate-100" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = settings.defaultCoverImage;
                                }}
                              />
                              <div className="text-left">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedJournal(j); }}
                                  className="text-left font-bold text-slate-800 hover:text-brand hover:underline cursor-pointer group transition-all"
                                >
                                  {j.name}
                                </button>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{j.publisher}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-[11px] text-slate-500">
                            {j.issn || "—"}
                          </td>
                          <td className="py-4 px-4 text-left">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-light text-brand border border-brand-light">
                              {j.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-600 truncate max-w-[150px] text-left" title={j.publisher}>
                            {j.publisher}
                          </td>
                          <td className="py-4 px-4 text-left">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50/70 text-indigo-700">
                              {j.field || "N/A"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-brand text-xs">
                            {j.score || "0"}
                          </td>
                          <td className="py-4 px-4 text-center text-slate-400 text-[10px] font-semibold">
                            {j.dateImported || "—"}
                          </td>
                          <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditClick(j)}
                                className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all cursor-pointer"
                                title="Chỉnh sửa thông tin"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {hasDeletePermission && (
                                <button
                                  onClick={() => handleDeleteSingle(j.id, j.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Xoá tạp chí"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Hiển thị {Math.min(filteredJournals.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredJournals.length, currentPage * itemsPerPage)} trên {filteredJournals.length} tạp chí
                  </div>
                  <div className="flex gap-2">
                    <select value={itemsPerPage} onChange={(e) => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className="text-xs border rounded-lg p-1.5 bg-slate-50 border-slate-200">
                      <option value="50">50</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                    </select>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-50">Trước</button>
                    <span className="text-xs self-center font-bold">Trang {currentPage} / {totalPages || 1}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold disabled:opacity-50">Sau</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "pending" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="space-y-1 text-left">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>{isAdmin ? "Danh sách phê duyệt tạp chí" : "Tạp chí bạn đóng góp đang chờ duyệt"}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isAdmin 
                    ? "Dưới đây là danh sách các tạp chí do các thành viên đóng góp cần được duyệt trước khi xuất hiện công khai trên danh sách chính."
                    : "Dưới đây là các tạp chí bạn đã gửi yêu cầu thêm mới. Trạng thái của tạp chí sẽ chuyển sang 'Đã duyệt' sau khi Ban quản trị (Admin) phê duyệt."
                  }
                </p>
              </div>
            </div>

            {/* List Table */}
            {(isAdmin ? pendingJournals : myPendingJournals).length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">Không có tạp chí nào đang chờ duyệt</p>
                  <p className="text-xs text-slate-400">
                    {isAdmin ? "Tất cả các yêu cầu đóng góp đã được giải quyết." : "Bạn chưa gửi yêu cầu thêm mới nào hoặc các yêu cầu đã được duyệt."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-[11px] text-slate-500 uppercase bg-slate-50/70 border-b border-slate-100 font-extrabold">
                    <tr>
                      <th scope="col" className="py-3.5 px-4 text-left">Tên tạp chí khoa học</th>
                      <th scope="col" className="py-3.5 px-4 text-left">ISSN</th>
                      <th scope="col" className="py-3.5 px-4 text-left">Loại hình</th>
                      <th scope="col" className="py-3.5 px-4 text-left">Nhà xuất bản</th>
                      <th scope="col" className="py-3.5 px-4 text-left">Lĩnh vực</th>
                      <th scope="col" className="py-3.5 px-4 text-center">Điểm HĐ</th>
                      {isAdmin && <th scope="col" className="py-3.5 px-4 text-left">Người gửi</th>}
                      <th scope="col" className="py-3.5 px-4 text-center">Trạng thái</th>
                      <th scope="col" className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70">
                    {(isAdmin ? pendingJournals : myPendingJournals).map((j) => (
                      <tr 
                        key={j.id} 
                        className="hover:bg-slate-50/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedJournal(j)}
                      >
                        <td className="py-4 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <img 
                              src={j.coverImage || settings.defaultCoverImage} 
                              alt={j.name} 
                              className="w-10 h-10 object-cover rounded-lg shadow-xs shrink-0 bg-slate-100" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = settings.defaultCoverImage;
                              }}
                            />
                            <div className="text-left">
                              <span className="font-bold text-slate-800 hover:text-brand transition-all">
                                {j.name}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{j.publisher}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-[11px] text-slate-500">
                          {j.issn || "—"}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                            {j.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600 truncate max-w-[150px] text-left" title={j.publisher}>
                          {j.publisher}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50/70 text-indigo-700">
                            {j.field || "N/A"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-brand text-xs">
                          {j.score || "0"}
                        </td>
                        {isAdmin && (
                          <td className="py-4 px-4 text-left">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <User className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">{j.createdByName || "Thành viên"}</span>
                            </div>
                          </td>
                        )}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>Chờ duyệt</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => handleApproveJournal(j.id, j.name)}
                                  className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all hover:scale-105 cursor-pointer"
                                  title="Phê duyệt tạp chí"
                                >
                                  <span>Duyệt</span>
                                </button>
                                <button
                                  onClick={() => handleRejectJournal(j.id, j.name)}
                                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all hover:scale-105 cursor-pointer"
                                  title="Từ chối yêu cầu"
                                >
                                  <span>Từ chối</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleCancelPendingRequest(j.id, j.name)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="Hủy yêu cầu gửi"
                              >
                                <span>Hủy yêu cầu</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === "manual" && (
        <JournalManualForm
          formState={formState}
          setFormState={setFormState}
          isEditing={isEditing}
          handleFormSubmit={handleFormSubmit}
          onCancel={() => { setActiveSubTab("list"); setIsEditing(false); }}
          fieldsList={fieldsList}
          typesList={typesList}
        />
      )}

      {activeSubTab === "excel" && (
        <JournalExcelImport
          handleExportTemplate={handleExportTemplate}
          handleExportAll={handleExportAll}
          skipDuplicates={skipDuplicates}
          setSkipDuplicates={setSkipDuplicates}
          excelInputRef={excelInputRef}
          handleExcelUpload={handleExcelUpload}
          previewRows={previewRows}
          setPreviewRows={setPreviewRows}
          uploadedFileName={uploadedFileName}
          setUploadedFileName={setUploadedFileName}
          selectedImportField={selectedImportField}
          setSelectedImportField={setSelectedImportField}
          journals={journals}
          handleImportParsedRows={handleImportParsedRows}
          loading={loading}
          fieldsList={fieldsList}
          importProgress={importProgress}
        />
      )}

      {activeSubTab === "history" && isAdmin && (
        <JournalHistory importHistory={importHistory} onUndo={(action) => showNotification("warning", `Tính năng hoàn tác cho "${action}" chưa được phát triển.`)} />
      )}

      {activeSubTab === "tools" && (
        <JournalTools
          isAdmin={isAdmin}
          handleClearDuplicates={handleClearDuplicates}
          processingAI={processingAI}
          pdfInputRef={pdfInputRef}
          handlePdfUpload={handlePdfUpload}
          journals={journals}
          fieldsList={fieldsList}
          typesList={typesList}
          onRefreshData={loadData}
        />
      )}

      {activeSubTab === "ai" && (
        <JournalAIImport
          extractedRows={aiExtractedRows}
          setExtractedRows={setAiExtractedRows}
          fieldsList={fieldsList}
          typesList={typesList}
          onImportSelected={handleAiImportSelected}
          onClear={() => {
            setAiExtractedRows([]);
            setActiveSubTab("tools");
            showNotification("success", "Đã dọn dẹp danh sách quét AI.");
          }}
          loading={loading}
        />
      )}

      {activeSubTab === "settings" && (
        <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
          {/* Scientific Journals Permission Settings (Admins Only) */}
          {isAdmin && users.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 text-left">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand" />
                  <span>Phân quyền chuyên sâu điểm báo khoa học</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Thiết lập các quyền thao tác cho từng người dùng thường trong hệ thống.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100 tracking-wider">
                      <th className="py-3 px-4">Thành viên</th>
                      <th className="py-3 px-4 text-center">Thêm mới</th>
                      <th className="py-3 px-4 text-center">Chỉnh sửa</th>
                      <th className="py-3 px-4 text-center">Xóa bỏ</th>
                      <th className="py-3 px-4 text-center">Nhập Excel/AI</th>
                      <th className="py-3 px-4 text-center">Ngành/Thể loại</th>
                      <th className="py-3 px-4 text-center">Cài đặt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {users.map(user => {
                      const isUserAdminRole = user.role === 'admin';
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-xs shrink-0 border border-brand/20">
                                {user.fullName?.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{user.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              disabled={isUserAdminRole}
                              onClick={() => handleToggleJournalPermission(user, 'canCreateJournal')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isUserAdminRole || user.canCreateJournal 
                                  ? 'bg-brand-light text-brand border border-brand/30' 
                                  : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {isUserAdminRole || user.canCreateJournal ? 'Đã cho phép' : 'Chưa cấp'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              disabled={isUserAdminRole}
                              onClick={() => handleToggleJournalPermission(user, 'canEditJournal')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isUserAdminRole || user.canEditJournal 
                                  ? 'bg-brand-light text-brand border border-brand/30' 
                                  : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {isUserAdminRole || user.canEditJournal ? 'Đã cho phép' : 'Chưa cấp'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              disabled={isUserAdminRole}
                              onClick={() => handleToggleJournalPermission(user, 'canDeleteJournal')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isUserAdminRole || user.canDeleteJournal 
                                  ? 'bg-brand-light text-brand border border-brand/30' 
                                  : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {isUserAdminRole || user.canDeleteJournal ? 'Đã cho phép' : 'Chưa cấp'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              disabled={isUserAdminRole}
                              onClick={() => handleToggleJournalPermission(user, 'canImportJournal')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isUserAdminRole || user.canImportJournal 
                                  ? 'bg-brand-light text-brand border border-brand/30' 
                                  : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {isUserAdminRole || user.canImportJournal ? 'Đã cho phép' : 'Chưa cấp'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              disabled={isUserAdminRole}
                              onClick={() => handleToggleJournalPermission(user, 'canManageJournalCats')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isUserAdminRole || user.canManageJournalCats 
                                  ? 'bg-brand-light text-brand border border-brand/30' 
                                  : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {isUserAdminRole || user.canManageJournalCats ? 'Đã cho phép' : 'Chưa cấp'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              disabled={isUserAdminRole}
                              onClick={() => handleToggleJournalPermission(user, 'canManageJournalSettings')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isUserAdminRole || user.canManageJournalSettings 
                                  ? 'bg-brand-light text-brand border border-brand/30' 
                                  : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {isUserAdminRole || user.canManageJournalSettings ? 'Đã cho phép' : 'Chưa cấp'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "categories" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lĩnh vực / Ngành học */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Microscope className="w-4 h-4 text-brand" />
                  <span>Quản lý Ngành / Lĩnh vực</span>
                </h3>
                <span className="text-[10px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
                  {fieldsList.length} ngành
                </span>
              </div>

              {/* Add form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập tên ngành mới..."
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
                <button
                  onClick={async () => {
                    const normalizedName = newFieldName.normalize("NFC").replace(/\s+/g, ' ').trim();
                    if (!normalizedName) return;

                    const normHelper = (str: string) => str.normalize("NFC").replace(/\s+/g, ' ').trim().toLowerCase();
                    const alreadyExists = fieldsList.some(f => normHelper(f.name) === normHelper(normalizedName));
                    if (alreadyExists) {
                      showNotification("error", "Ngành học này đã tồn tại trong hệ thống!");
                      return;
                    }

                    try {
                      const id = `field-${Date.now()}`;
                      await saveJournalFieldToSupabase({ id, name: normalizedName });
                      setNewFieldName("");
                      showNotification("success", "Đã thêm ngành thành công!");
                      await loadData();
                    } catch (err) {
                      showNotification("error", "Lỗi khi thêm ngành mới.");
                    }
                  }}
                  className="px-3 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {fieldsList.map(field => {
                  const isEditingThis = editingFieldId === field.id;
                  return (
                    <div key={field.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-100 transition-all">
                      {isEditingThis ? (
                        <div className="flex gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingFieldName}
                            onChange={(e) => setEditingFieldName(e.target.value)}
                            className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                          />
                          <button
                            onClick={async () => {
                              const normalizedName = editingFieldName.normalize("NFC").replace(/\s+/g, ' ').trim();
                              if (!normalizedName) return;

                              const normHelper = (str: string) => str.normalize("NFC").replace(/\s+/g, ' ').trim().toLowerCase();
                              const alreadyExists = fieldsList.some(f => f.id !== field.id && normHelper(f.name) === normHelper(normalizedName));
                              if (alreadyExists) {
                                showNotification("error", "Tên ngành này đã trùng với ngành khác!");
                                return;
                              }

                              try {
                                await saveJournalFieldToSupabase({ id: field.id, name: normalizedName });
                                setEditingFieldId(null);
                                showNotification("success", "Đã cập nhật ngành học!");
                                await loadData();
                              } catch (err) {
                                showNotification("error", "Lỗi khi cập nhật ngành.");
                              }
                            }}
                            className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-all cursor-pointer"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingFieldId(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-300 transition-all cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-slate-700">{field.name}</span>
                          <div className="flex items-center gap-1">
                            {isDefaultField(field.id) ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-lg">
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>Mặc định (Khóa)</span>
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingFieldId(field.id);
                                    setEditingFieldName(field.name);
                                  }}
                                  className="p-1 text-slate-400 hover:text-brand hover:bg-white rounded-lg transition-all cursor-pointer"
                                  title="Chỉnh sửa"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFieldClick(field)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phân loại tạp chí */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand" />
                  <span>Quản lý Phân loại tạp chí</span>
                </h3>
                <span className="text-[10px] font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full">
                  {typesList.length} loại
                </span>
              </div>

              {/* Add form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập tên phân loại mới..."
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
                <button
                  onClick={async () => {
                    const normalizedName = newTypeName.normalize("NFC").replace(/\s+/g, ' ').trim();
                    if (!normalizedName) return;

                    const normHelper = (str: string) => str.normalize("NFC").replace(/\s+/g, ' ').trim().toLowerCase();
                    const alreadyExists = typesList.some(t => normHelper(t.name) === normHelper(normalizedName));
                    if (alreadyExists) {
                      showNotification("error", "Phân loại này đã tồn tại trong hệ thống!");
                      return;
                    }

                    try {
                      const id = `type-${Date.now()}`;
                      await saveJournalTypeToSupabase({ id, name: normalizedName });
                      setNewTypeName("");
                      showNotification("success", "Đã thêm loại thành công!");
                      await loadData();
                    } catch (err) {
                      showNotification("error", "Lỗi khi thêm phân loại mới.");
                    }
                  }}
                  className="px-3 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {typesList.map(type => {
                  const isEditingThis = editingTypeId === type.id;
                  return (
                    <div key={type.id} className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-100 transition-all">
                      {isEditingThis ? (
                        <div className="flex gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingTypeName}
                            onChange={(e) => setEditingTypeName(e.target.value)}
                            className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                          />
                          <button
                            onClick={async () => {
                              const normalizedName = editingTypeName.normalize("NFC").replace(/\s+/g, ' ').trim();
                              if (!normalizedName) return;

                              const normHelper = (str: string) => str.normalize("NFC").replace(/\s+/g, ' ').trim().toLowerCase();
                              const alreadyExists = typesList.some(t => t.id !== type.id && normHelper(t.name) === normHelper(normalizedName));
                              if (alreadyExists) {
                                showNotification("error", "Tên phân loại này đã trùng với một phân loại khác!");
                                return;
                              }

                              try {
                                await saveJournalTypeToSupabase({ id: type.id, name: normalizedName });
                                setEditingTypeId(null);
                                showNotification("success", "Đã cập nhật phân loại!");
                                await loadData();
                              } catch (err) {
                                showNotification("error", "Lỗi khi cập nhật phân loại.");
                              }
                            }}
                            className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-all cursor-pointer"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingTypeId(null)}
                            className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-300 transition-all cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-slate-700">{type.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingTypeId(type.id);
                                setEditingTypeName(type.name);
                              }}
                              className="p-1 text-slate-400 hover:text-brand hover:bg-white rounded-lg transition-all cursor-pointer"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (await confirm('Xác nhận xóa phân loại', `Bạn có chắc chắn muốn xóa phân loại "${type.name}"? Tạp chí thuộc loại này sẽ chuyển về "Tạp chí".`)) {
                                  try {
                                    await deleteJournalTypeFromSupabase(type.id);
                                    showNotification("success", "Đã xóa loại thành công.");
                                    await loadData();
                                  } catch (err) {
                                    showNotification("error", "Lỗi khi xóa phân loại.");
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "trash" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-left">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Trash className="w-5 h-5 text-rose-600" />
                <span>Thùng rác danh mục tạp chí</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Danh sách các tạp chí đã xoá tạm thời. Bạn có thể khôi phục lại hoặc xoá vĩnh viễn khỏi hệ thống.
              </p>
            </div>
            
             {deletedJournals.length > 0 && (
               <div className="flex flex-wrap gap-2 justify-end items-center">
                 {selectedTrashIds.length > 0 && (
                   <>
                     <button
                       onClick={async () => {
                         if (await confirm("Xác nhận khôi phục hàng loạt", `Bạn có chắc chắn muốn khôi phục lại ${selectedTrashIds.length} tạp chí đã chọn?`)) {
                           setLoading(true);
                           try {
                             await restoreMultipleJournalsFromSupabase(selectedTrashIds);
                             showNotification("success", `Đã khôi phục thành công ${selectedTrashIds.length} tạp chí!`);
                             await loadData();
                           } catch (err) {
                             showNotification("error", "Lỗi khi khôi phục các tạp chí đã chọn.");
                           } finally {
                             setLoading(false);
                           }
                         }
                       }}
                       className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                     >
                       <span>Khôi phục đã chọn ({selectedTrashIds.length})</span>
                     </button>
                     <button
                       onClick={async () => {
                         if (await confirm("Xác nhận xóa vĩnh viễn hàng loạt", `CẢNH BÁO: Bạn có chắc chắn muốn xoá vĩnh viễn ${selectedTrashIds.length} tạp chí đã chọn? Hành động này không thể hoàn tác.`)) {
                           setLoading(true);
                           try {
                             await hardDeleteMultipleJournalsFromSupabase(selectedTrashIds);
                             showNotification("success", `Đã xoá vĩnh viễn thành công ${selectedTrashIds.length} tạp chí!`);
                             await loadData();
                           } catch (err) {
                             showNotification("error", "Lỗi khi xoá vĩnh viễn các tạp chí đã chọn.");
                           } finally {
                             setLoading(false);
                           }
                         }
                       }}
                       className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                     >
                       <span>Xoá vĩnh viễn đã chọn ({selectedTrashIds.length})</span>
                     </button>
                     <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                   </>
                 )}
                 <button
                   onClick={async () => {
                     if (await confirm("Xác nhận khôi phục tất cả", "Bạn có chắc chắn muốn khôi phục lại TOÀN BỘ tạp chí trong thùng rác không?")) {
                       setLoading(true);
                       try {
                         await restoreAllDeletedJournalsFromSupabase();
                         showNotification("success", "Đã khôi phục toàn bộ tạp chí thành công!");
                         await loadData();
                       } catch (err) {
                         showNotification("error", "Lỗi khi khôi phục toàn bộ tạp chí.");
                       } finally {
                         setLoading(false);
                       }
                     }
                   }}
                   className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition-all cursor-pointer"
                 >
                   Khôi phục tất cả
                 </button>
                 <button
                   onClick={async () => {
                     if (await confirm("Xác nhận xóa vĩnh viễn tất cả", "CẢNH BÁO: Bạn có chắc chắn muốn xoá vĩnh viễn TOÀN BỘ tạp chí trong thùng rác không? Hành động này KHÔNG THỂ khôi phục.")) {
                       setLoading(true);
                       try {
                         await hardDeleteAllDeletedJournalsFromSupabase();
                         showNotification("success", "Đã dọn sạch thùng rác vĩnh viễn thành công!");
                         await loadData();
                       } catch (err) {
                         showNotification("error", "Lỗi khi xóa vĩnh viễn toàn bộ tạp chí.");
                       } finally {
                         setLoading(false);
                       }
                     }
                   }}
                   className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-all cursor-pointer"
                 >
                   Xoá vĩnh viễn tất cả
                 </button>
               </div>
             )}
          </div>

          {deletedJournals.length === 0 ? (
            <div className="p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Trash className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Thùng rác trống</p>
                <p className="text-xs text-slate-400">Không có tạp chí nào bị xoá tạm thời.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">
                    <th className="py-4 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={deletedJournals.length > 0 && deletedJournals.every(j => selectedTrashIds.includes(j.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTrashIds(deletedJournals.map(j => j.id));
                          } else {
                            setSelectedTrashIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-brand focus:ring-brand w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="py-4 px-4 text-left">Tên Tạp Chí</th>
                    <th className="py-4 px-4 text-left">ISSN</th>
                    <th className="py-4 px-4 text-left">Phân Loại</th>
                    <th className="py-4 px-4 text-left">Ngành Học</th>
                    <th className="py-4 px-4 text-center">Điểm số</th>
                    <th className="py-4 px-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedJournals.map(j => {
                    const isSelected = selectedTrashIds.includes(j.id);
                    return (
                      <tr 
                        key={j.id} 
                        className={`border-b border-slate-50 hover:bg-slate-50/40 text-slate-600 text-xs font-semibold cursor-pointer ${
                          isSelected ? "bg-brand/5" : ""
                        }`}
                        onClick={() => handleSelectTrashId(j.id)}
                      >
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectTrashId(j.id)}
                            className="rounded border-slate-300 text-brand focus:ring-brand w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 text-left max-w-sm">{j.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-left">{j.issn || "—"}</td>
                        <td className="py-3 px-4 text-left">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px]">
                            {j.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-left">{j.field || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-brand/10 text-brand font-extrabold px-2 py-0.5 rounded-md text-[10px] border border-brand/20">
                            {j.score || "0"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              onClick={async () => {
                                if (await confirm("Xác nhận khôi phục", `Bạn có chắc chắn muốn khôi phục tạp chí "${j.name}"?`)) {
                                  setLoading(true);
                                  try {
                                    await restoreJournalFromSupabase(j.id);
                                    showNotification("success", `Đã khôi phục tạp chí "${j.name}" thành công.`);
                                    await loadData();
                                  } catch (err) {
                                    showNotification("error", "Lỗi khi khôi phục tạp chí: " + (err as Error).message);
                                  } finally {
                                    setLoading(false);
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-xl border border-emerald-100 transition-all cursor-pointer"
                            >
                              Khôi phục
                            </button>
                            <button
                              onClick={async () => {
                                if (await confirm("Xác nhận xóa vĩnh viễn", `CẢNH BÁO VĨNH VIỄN: Bạn có chắc chắn muốn xóa vĩnh viễn tạp chí "${j.name}"? Hành động này không thể hoàn tác.`)) {
                                  setLoading(true);
                                  try {
                                    await hardDeleteJournalFromSupabase(j.id);
                                    showNotification("success", `Đã xóa vĩnh viễn tạp chí "${j.name}" thành công.`);
                                    await loadData();
                                  } catch (err) {
                                    showNotification("error", "Lỗi khi xóa vĩnh viễn tạp chí: " + (err as Error).message);
                                  } finally {
                                    setLoading(false);
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-xl border border-rose-100 transition-all cursor-pointer"
                            >
                              Xóa vĩnh viễn
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* POPUP DETAIL MODAL */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setSelectedJournal(null)} />
          
          {/* Modal Container */}
          <div className="bg-white rounded-3xl w-full max-w-2xl relative overflow-hidden shadow-2xl z-10 animate-scaleUp flex flex-col max-h-[90vh]">
            {/* Upper Banner Section with Cover Image */}
            <div className="h-44 relative bg-slate-900">
              <img 
                src={selectedJournal.coverImage || settings.defaultCoverImage} 
                alt={selectedJournal.name} 
                className="w-full h-full object-cover opacity-60"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = settings.defaultCoverImage;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedJournal(null)}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-xs transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              {/* Float Category */}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-brand/90 text-white uppercase tracking-wider backdrop-blur-xs">
                  {selectedJournal.type}
                </span>
              </div>

              {/* Title & Stars on Banner */}
              <div className="absolute bottom-4 left-6 right-6 space-y-1 text-left">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: selectedJournal.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                  {Array.from({ length: 5 - selectedJournal.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-slate-500/60" />
                  ))}
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight drop-shadow-sm font-display line-clamp-2">
                  {selectedJournal.name}
                </h2>
              </div>
            </div>

            {/* Info Body */}
            <div className="p-6 lg:p-8 space-y-6 overflow-y-auto flex-1 text-left">
              {/* Grid 2x3 */}
              <div className="grid grid-cols-2 gap-4 lg:gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-2.5">
                  <Hash className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã ISSN</p>
                    <p className="text-xs font-semibold text-slate-800 font-mono mt-0.5">{selectedJournal.issn || "Chưa cập nhật"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cơ quan xuất bản</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-1">{selectedJournal.publisher}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngành / Lĩnh vực</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-1">{selectedJournal.field}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm số tính toán</p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{selectedJournal.score || "0"} điểm</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Năm thành lập</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedJournal.establishedDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số lượng bài báo</p>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedJournal.paperCount.toLocaleString("vi-VN")} bài viết</p>
                  </div>
                </div>
              </div>

              {/* Long Intro Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span>Giới thiệu chi tiết tạp chí</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </h3>
                <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {selectedJournal.description}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">
              <button 
                onClick={() => setSelectedJournal(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Deletion & Migration Dialog Modal */}
      {deletingField && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all">
            {/* Header */}
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start gap-4">
              <div className="p-3 bg-rose-500 text-white rounded-2xl shrink-0 shadow-lg shadow-rose-500/20">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">Xóa ngành học: {deletingField.name}</h3>
                <p className="text-xs font-semibold text-rose-700">
                  Phát hiện <strong className="font-extrabold">{associatedJournalsCount} tạp chí khoa học</strong> đang thuộc ngành này.
                </p>
              </div>
              <button 
                onClick={() => setDeletingField(null)}
                className="ml-auto text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Vui lòng lựa chọn phương án xử lý dữ liệu trước khi thực hiện xóa ngành học này khỏi hệ thống:
              </p>

              {/* Selection Options */}
              <div className="space-y-3">
                {/* Option 1: Transfer */}
                <label 
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                    deleteFieldAction === 'transfer' 
                      ? 'border-brand bg-brand/5 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="deleteAction" 
                    value="transfer"
                    checked={deleteFieldAction === 'transfer'}
                    onChange={() => setDeleteFieldAction('transfer')}
                    className="mt-1 text-brand focus:ring-brand cursor-pointer"
                  />
                  <div className="space-y-2 flex-1">
                    <p className="text-xs font-extrabold text-slate-800">
                      Phương án 1: Chuyển dữ liệu sang ngành học khác
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Tất cả {associatedJournalsCount} tạp chí thuộc ngành này sẽ được tự động đổi sang ngành học mới do bạn lựa chọn.
                    </p>
                    
                    {deleteFieldAction === 'transfer' && (
                      <div className="pt-2 animate-fadeIn">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Chọn ngành học nhận chuyển giao:</p>
                        <select
                          value={transferTargetFieldId}
                          onChange={(e) => setTransferTargetFieldId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer"
                        >
                          {fieldsList
                            .filter(f => f.id !== deletingField.id)
                            .map(f => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))
                          }
                        </select>
                        {fieldsList.filter(f => f.id !== deletingField.id).length === 0 && (
                          <p className="text-[10px] font-bold text-rose-600 mt-1">
                            * Không còn ngành nào khác trong hệ thống để thực hiện chuyển dữ liệu.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </label>

                {/* Option 2: Delete All */}
                <label 
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                    deleteFieldAction === 'delete_all' 
                      ? 'border-rose-500 bg-rose-50/50 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="deleteAction" 
                    value="delete_all"
                    checked={deleteFieldAction === 'delete_all'}
                    onChange={() => setDeleteFieldAction('delete_all')}
                    className="mt-1 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="space-y-1 flex-1">
                    <p className="text-xs font-extrabold text-rose-800">
                      Phương án 2: Xoá toàn bộ cả ngành lẫn dữ liệu báo
                    </p>
                    <p className="text-[11px] font-medium text-rose-600/75">
                      Xóa vĩnh viễn ngành học này và đưa cả {associatedJournalsCount} tạp chí khoa học liên kết vào Thùng rác.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingField(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={loading || (deleteFieldAction === 'transfer' && !transferTargetFieldId)}
                onClick={handleExecuteFieldDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-rose-600/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận thực hiện</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Settings Removed */}
    </div>
  );
}
