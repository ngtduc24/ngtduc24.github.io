
import { supabase } from './supabase';
import { db } from './firebase';
import { collection, addDoc, getDocs, getDoc, deleteDoc, deleteField, doc, query, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import { ScientificJournal, JournalField, JournalType, AppSettings, UserAccount, AppNotification } from '../types';

export const USERS_TABLE = 'users';
export const JOURNALS_TABLE = 'scientific_journals';
export const FIELDS_TABLE = 'journal_fields';
export const TYPES_TABLE = 'journal_types';
export const SETTINGS_TABLE = 'app_settings';
export const QDA_PROJECTS_TABLE = 'qda_projects';
export const QDA_DOCUMENTS_TABLE = 'qda_documents';
export const QDA_CODES_TABLE = 'qda_codes';
export const QDA_ANNOTATIONS_TABLE = 'qda_annotations';
export const QDA_MEMOS_TABLE = 'qda_memos';

export const NOTIFICATIONS_TABLE = 'system_notifications';
export const STATS_TABLE = 'app_stats';

function handleSupabaseError(error: any, context: string, tableName: string) {
  if (error.code === '42501' || error.message?.includes('row-level security')) {
    console.error(`❌ Lỗi bảo mật (RLS) tại ${context}: Bảng '${tableName}' đang bị khóa.`);
    console.error(`👉 Cách sửa: Chạy lệnh SQL 'ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;' trong Supabase.`);
  } else if (error.message?.includes('schema cache')) {
    console.error(`❌ Lỗi Cache tại ${context}: Supabase chưa nhận diện được cột mới của bảng '${tableName}'.`);
    console.error(`👉 Cách sửa: Hãy vào Supabase Dashboard -> Settings -> API -> Nhấn nút "Reload PostgREST" để xóa cache.`);
  } else if (error.code === '42703' || error.message?.includes('does not exist')) {
    console.error(`❌ Lỗi cấu trúc bảng tại ${context}: Bảng '${tableName}' thiếu cột dữ liệu.`);
    console.error(`👉 Cách sửa: Copy toàn bộ nội dung file SUPABASE_SCHEMA.sql và chạy lại trong SQL Editor của Supabase để cập nhật cấu trúc.`);
  } else {
    console.error(`❌ Lỗi tại ${context}:`, error.message || error);
  }
}

export async function testSupabaseConnection() {
  return true;
}

export async function getDefaultSettingsFromSupabase(): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    id: 'general_config',
    defaultCoverImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80',
    themeColor: 'green-black',
    webAppTitle: 'Smart Research VN',
    webAppIcon: '',
    footerText: 'Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng toàn diện.',
    allowPublicAccess: true,
    systemDescription: 'Hệ thống hỗ trợ tính toán phương pháp nghiên cứu định lượng chuẩn hóa.',
    dashboardBannerTitle: 'Hệ Thống Tính Toán Cỡ Mẫu Toàn Diện',
    taskTypes: ['Work', 'Client', 'School', 'Personal'],
    notificationBannerTitle: 'Trung tâm thông báo',
    notificationBannerDescription: 'Thiết lập và phát thông báo hệ thống trực tiếp đến toàn bộ thành viên hoặc các quản trị viên chỉ định trong thời gian thực.',
    notificationBannerText: 'Quản Trị Hệ Thống'
    ,sidebarOpacity: 0.92
  };

  try {
    const { data, error } = await supabase.from(SETTINGS_TABLE).select('*').eq('id', 'general_config').single();
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        await saveDefaultSettingsToSupabase(defaultSettings);
        return defaultSettings;
      }
      throw error;
    }
    
    return {
      ...defaultSettings,
      id: data.id,
      defaultCoverImage: data.default_cover_image || defaultSettings.defaultCoverImage,
      themeColor: data.theme_color || defaultSettings.themeColor,
      webAppTitle: data.web_app_title || defaultSettings.webAppTitle,
      webAppIcon: data.web_app_icon || defaultSettings.webAppIcon,
      sidebarOpacity: Number(data.sidebar_opacity ?? localStorage.getItem('sidebar_opacity') ?? defaultSettings.sidebarOpacity),
      footerText: data.footer_text || defaultSettings.footerText,
      allowPublicAccess: data.allow_public_access ?? defaultSettings.allowPublicAccess,
      systemDescription: data.system_description || defaultSettings.systemDescription,
      dashboardBannerTitle: data.dashboard_banner_title || defaultSettings.dashboardBannerTitle,
      dashboardBannerDescription: data.dashboard_banner_description || defaultSettings.dashboardBannerDescription,
      initialSeedDone: data.initial_seed_done ?? false,
      taskTypes: data.task_types || defaultSettings.taskTypes,
      notificationBannerTitle: data.notification_banner_title || defaultSettings.notificationBannerTitle,
      notificationBannerDescription: data.notification_banner_description || defaultSettings.notificationBannerDescription,
      taskBannerTitle: data.tasks_banner_title,
      taskBannerDescription: data.tasks_banner_description,
      taskBannerLabel: data.tasks_banner_label,
      taskBannerImage: data.tasks_banner_image_url,
      taskBannerIcon: data.tasks_banner_icon,
      journalBannerIcon: data.journals_banner_icon,
      qdaBannerIcon: data.qda_banner_icon,
      quantBannerIcon: data.quant_banner_icon,
      quantBannerTitle: data.quant_banner_title,
      quantBannerDescription: data.quant_banner_description,
      quantBannerLabel: data.quant_banner_label,
      quantBannerImage: data.quant_banner_image_url,
      journalBannerTitle: data.journals_banner_title,
      journalBannerDescription: data.journals_banner_description,
      journalBannerLabel: data.journals_banner_label,
      journalBannerImage: data.journals_banner_image_url,
      qdaBannerTitle: data.qda_banner_title,
      qdaBannerDescription: data.qda_banner_description,
      qdaBannerLabel: data.qda_banner_label,
      qdaBannerImage: data.qda_banner_image_url
    };
  } catch (error) {
    console.warn("Failed to fetch settings from Supabase, using local fallback:", error);
    return defaultSettings;
  }
}

export async function saveDefaultSettingsToSupabase(settings: AppSettings) {
  try {
    if (settings.sidebarOpacity !== undefined) localStorage.setItem('sidebar_opacity', String(settings.sidebarOpacity));
    const dbData = {
      id: settings.id,
      default_cover_image: settings.defaultCoverImage,
      theme_color: settings.themeColor,
      web_app_title: settings.webAppTitle,
      web_app_icon: settings.webAppIcon,
      footer_text: settings.footerText,
      allow_public_access: settings.allowPublicAccess,
      system_description: settings.systemDescription,
      dashboard_banner_title: settings.dashboardBannerTitle,
      dashboard_banner_description: settings.dashboardBannerDescription,
      initial_seed_done: settings.initialSeedDone,
      task_types: settings.taskTypes,
      notification_banner_title: settings.notificationBannerTitle,
      notification_banner_description: settings.notificationBannerDescription,
      tasks_banner_title: settings.taskBannerTitle,
      tasks_banner_description: settings.taskBannerDescription,
      tasks_banner_label: settings.taskBannerLabel,
      tasks_banner_image_url: settings.taskBannerImage,
      journals_banner_title: settings.journalBannerTitle,
      journals_banner_description: settings.journalBannerDescription,
      journals_banner_label: settings.journalBannerLabel,
      journals_banner_image_url: settings.journalBannerImage,
      qda_banner_title: settings.qdaBannerTitle,
      qda_banner_description: settings.qdaBannerDescription,
      qda_banner_label: settings.qdaBannerLabel,
      qda_banner_image_url: settings.qdaBannerImage
    };
    const { error } = await supabase.from(SETTINGS_TABLE).upsert(dbData);
    if (error) throw error;
    // Best-effort: luu icon banner va banner dinh luong (bo qua neu DB chua co cot)
    try {
      const extraCols: Record<string, unknown> = { id: settings.id };
      if (settings.taskBannerIcon !== undefined) extraCols.tasks_banner_icon = settings.taskBannerIcon;
      if (settings.journalBannerIcon !== undefined) extraCols.journals_banner_icon = settings.journalBannerIcon;
      if (settings.qdaBannerIcon !== undefined) extraCols.qda_banner_icon = settings.qdaBannerIcon;
      if (settings.quantBannerIcon !== undefined) extraCols.quant_banner_icon = settings.quantBannerIcon;
      if (settings.quantBannerTitle !== undefined) extraCols.quant_banner_title = settings.quantBannerTitle;
      if (settings.quantBannerDescription !== undefined) extraCols.quant_banner_description = settings.quantBannerDescription;
      if (settings.quantBannerLabel !== undefined) extraCols.quant_banner_label = settings.quantBannerLabel;
      if (settings.quantBannerImage !== undefined) extraCols.quant_banner_image_url = settings.quantBannerImage;
      if (settings.sidebarOpacity !== undefined) extraCols.sidebar_opacity = settings.sidebarOpacity;
      if (Object.keys(extraCols).length > 1) {
        const { error: extraError } = await supabase.from(SETTINGS_TABLE).upsert(extraCols);
        if (extraError) console.warn('Chua luu duoc icon/banner dinh luong (thieu cot trong DB?):', extraError.message);
      }
    } catch (extraE) {
      console.warn('Bo qua luu bo sung banner:', extraE);
    }
  } catch (error) {
    handleSupabaseError(error, "Lưu cài đặt hệ thống", SETTINGS_TABLE);
    throw error;
  }
}

export async function seedDefaultUsersIfNeeded() {
  // Disabled automatic seeding as per user request
  return;
  /*
  try {
    const { data, error } = await supabase.from(USERS_TABLE).select('*').limit(1);
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('schema cache')) {
        console.warn("⚠️ Bảng '" + USERS_TABLE + "' chưa được khởi tạo. Bỏ qua bước seed.");
        return;
      }
      throw error;
    }
    
    const adminUser: UserAccount = {
      id: 'admin-id',
      username: 'admin',
      fullName: 'Quản trị viên',
      email: 'admin@gmail.com',
      role: 'admin',
      permissions: ['dashboard', 'calculator', 'website', 'users', 'scientific_journals'],
      createdAt: '10/07/2026',
      password: '123'
    };

    if (!data || data.length === 0) {
      console.log("🌱 Đang khởi tạo dữ liệu người dùng mặc định...");
      const testUser: UserAccount = {
        id: 'user-id',
        username: 'ngtduc24',
        fullName: 'Đức Nguyễn',
        email: 'ngtduc24@gmail.com',
        role: 'user',
        permissions: ['dashboard', 'calculator', 'scientific_journals'],
        createdAt: '10/07/2026',
        password: '123456'
      };
      
      await saveUser(adminUser);
      await saveUser(testUser);
      console.log('✅ Đã khởi tạo người dùng mặc định!');
    } else {
      // Đảm bảo admin luôn có pass là 123
      await saveUser(adminUser);
      console.log('✅ Đã cập nhật thông tin admin mặc định.');
    }
  } catch (error: any) {
    console.error("❌ Lỗi khi seed dữ liệu người dùng:", error?.message || error);
  }
  */
}

export async function saveUser(user: UserAccount) {
  const { getAuth } = await import("firebase/auth");
  const authObj = getAuth();
  console.log("Current user before saveUser:", authObj.currentUser?.uid);

  try {
    const dbData = {
      id: user.id,
      username: user.username,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      can_assign_task: user.canAssignTask,
      can_receive_task: user.canReceiveTask,
      can_run_pause_task: user.canRunPauseTask,
      can_complete_task: user.canCompleteTask,
      can_delete_task: user.canDeleteTask,
      can_create_task: user.canCreateTask,
      can_manage_settings: user.canManageSettings,
      can_create_journal: user.canCreateJournal,
      can_edit_journal: user.canEditJournal,
      can_delete_journal: user.canDeleteJournal,
      can_import_journal: user.canImportJournal,
      can_manage_journal_cats: user.canManageJournalCats,
      can_manage_journal_settings: user.canManageJournalSettings,
      can_create_qualitative: user.canCreateQualitative,
      can_edit_qualitative: user.canEditQualitative,
      can_delete_qualitative: user.canDeleteQualitative,
      can_import_qualitative: user.canImportQualitative,
      can_export_qualitative: user.canExportQualitative,
      can_manage_qualitative_settings: user.canManageQualitativeSettings,
      can_create_quantitative: user.canCreateQuantitative,
      can_edit_quantitative: user.canEditQuantitative,
      can_delete_quantitative: user.canDeleteQuantitative,
      can_import_quantitative: user.canImportQuantitative,
      can_export_quantitative: user.canExportQuantitative,
      can_manage_quantitative_settings: user.canManageQuantitativeSettings,
      created_at: user.createdAt || new Date().toISOString(),
    };
    const removeUndefined = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(removeUndefined);
      if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, removeUndefined(v)])
        );
      }
      return obj;
    };
    const sanitizedData = removeUndefined(dbData);
    if (sanitizedData.password) {
      delete sanitizedData.password;
    }
    await setDoc(doc(db, USERS_TABLE, user.id), sanitizedData, { merge: true });
  } catch (error) {
    console.error(`Lỗi khi lưu người dùng ${user.username} vào Firebase:`, error);
    throw error;
  }
}

export async function deleteUser(userId: string) {
  try {
    await deleteDoc(doc(db, USERS_TABLE, userId));
  } catch (error) {
    console.error(`Lỗi khi xóa người dùng ${userId} khỏi Firebase:`, error);
    throw error;
  }
}

export function mapUserFromDB(u: any): UserAccount {
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    permissions: u.permissions || [],
    canAssignTask: u.can_assign_task,
    canReceiveTask: u.can_receive_task,
    canRunPauseTask: u.can_run_pause_task,
    canCompleteTask: u.can_complete_task,
    canDeleteTask: u.can_delete_task,
    canCreateTask: u.can_create_task,
    canManageSettings: u.can_manage_settings,
    canCreateJournal: u.can_create_journal,
    canEditJournal: u.can_edit_journal,
    canDeleteJournal: u.can_delete_journal,
    canImportJournal: u.can_import_journal,
    canManageJournalCats: u.can_manage_journal_cats,
    canManageJournalSettings: u.can_manage_journal_settings,
    canCreateQualitative: u.can_create_qualitative,
    canEditQualitative: u.can_edit_qualitative,
    canDeleteQualitative: u.can_delete_qualitative,
    canImportQualitative: u.can_import_qualitative,
    canExportQualitative: u.can_export_qualitative,
    canManageQualitativeSettings: u.can_manage_qualitative_settings,
    canCreateQuantitative: u.can_create_quantitative,
    canEditQuantitative: u.can_edit_quantitative,
    canDeleteQuantitative: u.can_delete_quantitative,
    canImportQuantitative: u.can_import_quantitative,
    canExportQuantitative: u.can_export_quantitative,
    canManageQuantitativeSettings: u.can_manage_quantitative_settings,
    createdAt: u.created_at,
  } as UserAccount;
}

export async function getUsers(): Promise<UserAccount[]> {
  try {
    const snapshot = await getDocs(collection(db, USERS_TABLE));
    return snapshot.docs.map(docSnap => mapUserFromDB({ id: docSnap.id, ...docSnap.data() }));
  } catch (error: any) {
    // If it's a permission error, it's expected if not logged in or restricted
    if (error.code !== 'permission-denied') {
      console.error("Lỗi khi lấy danh sách người dùng từ Firebase:", error);
    }
    return [];
  }
}

export async function getUserById(userId: string): Promise<UserAccount | null> {
  try {
    const snapshot = await getDoc(doc(db, USERS_TABLE, userId));
    if (!snapshot.exists()) return null;
    return mapUserFromDB({ id: snapshot.id, ...snapshot.data() });
  } catch (error) {
    console.error(`Lỗi khi lấy hồ sơ Firebase của UID ${userId}:`, error);
    return null;
  }
}

export async function getJournalsFromSupabase(): Promise<ScientificJournal[]> {
  try {
    let allData: any[] = [];
    let from = 0;
    const chunkSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from(JOURNALS_TABLE)
        .select('*')
        .or('is_deleted.is.null,is_deleted.eq.false')
        .range(from, from + chunkSize - 1);

      if (error) {
        console.warn("Failed to fetch journals with is_deleted filter, falling back to unfiltered paginated fetch:", error.message);
        
        // Fallback: paginated fetch without is_deleted filter
        let allFallbackData: any[] = [];
        let fallbackFrom = 0;
        let fallbackHasMore = true;
        while (fallbackHasMore) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(JOURNALS_TABLE)
            .select('*')
            .range(fallbackFrom, fallbackFrom + chunkSize - 1);
            
          if (fallbackError) throw fallbackError;
          if (!fallbackData || fallbackData.length === 0) {
            fallbackHasMore = false;
          } else {
            allFallbackData = [...allFallbackData, ...fallbackData];
            if (fallbackData.length < chunkSize) {
              fallbackHasMore = false;
            } else {
              fallbackFrom += chunkSize;
            }
          }
        }
        allData = allFallbackData.filter(j => !j.is_deleted);
        hasMore = false;
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        if (data.length < chunkSize) {
          hasMore = false;
        } else {
          from += chunkSize;
        }
      }
    }
    
    return allData.map(j => ({
      id: j.id,
      name: j.name,
      issn: j.issn,
      type: j.type,
      publisher: j.publisher,
      field: j.field,
      score: j.score,
      establishedDate: j.established_date,
      paperCount: j.paper_count,
      rating: j.rating,
      description: j.description,
      coverImage: j.cover_image,
      dateImported: j.date_imported,
      isDeleted: j.is_deleted || false,
      deletedAt: j.deleted_at,
      status: j.status || 'approved',
      createdBy: j.created_by,
      createdByName: j.created_by_name
    }));
  } catch (error) {
    handleSupabaseError(error, "Lấy danh sách tạp chí", JOURNALS_TABLE);
    return [];
  }
}

export async function getDeletedJournalsFromSupabase(): Promise<ScientificJournal[]> {
  try {
    const { data, error } = await supabase.from(JOURNALS_TABLE).select('*').eq('is_deleted', true);
    if (error) throw error;

    return (data || []).map(j => ({
      id: j.id,
      name: j.name,
      issn: j.issn,
      type: j.type,
      publisher: j.publisher,
      field: j.field,
      score: j.score,
      establishedDate: j.established_date,
      paperCount: j.paper_count,
      rating: j.rating,
      description: j.description,
      coverImage: j.cover_image,
      dateImported: j.date_imported,
      isDeleted: j.is_deleted,
      deletedAt: j.deleted_at,
      status: j.status || 'approved',
      createdBy: j.created_by,
      createdByName: j.created_by_name
    }));
  } catch (error) {
    handleSupabaseError(error, "Lấy danh sách tạp chí đã xóa", JOURNALS_TABLE);
    return [];
  }
}

export async function saveJournalToSupabase(journal: ScientificJournal) {
  try {
    const dbData: any = {
      id: journal.id,
      name: journal.name,
      issn: journal.issn,
      type: journal.type,
      publisher: journal.publisher,
      field: journal.field,
      score: journal.score,
      established_date: journal.establishedDate,
      paper_count: journal.paperCount,
      rating: journal.rating,
      description: journal.description,
      cover_image: journal.coverImage,
      date_imported: journal.dateImported,
      is_deleted: journal.isDeleted || false,
      deleted_at: journal.deletedAt || null,
      status: journal.status || 'approved',
      created_by: journal.createdBy || null,
      created_by_name: journal.createdByName || null
    };
    
    const { error } = await supabase.from(JOURNALS_TABLE).upsert(dbData);
    if (error) {
      if (error.code === '42703' || error.message?.includes('status') || error.message?.includes('created_by')) {
        console.warn("⚠️ Bảng 'scientific_journals' thiếu cột 'status' hoặc 'created_by'. Tiến hành lưu không có các trường này...");
        const fallbackDbData = { ...dbData };
        delete fallbackDbData.status;
        delete fallbackDbData.created_by;
        delete fallbackDbData.created_by_name;
        const { error: fallbackError } = await supabase.from(JOURNALS_TABLE).upsert(fallbackDbData);
        if (fallbackError) throw fallbackError;
      } else {
        throw error;
      }
    }
  } catch (error) {
    handleSupabaseError(error, `Lưu tạp chí ${journal.name}`, JOURNALS_TABLE);
    throw error;
  }
}

export async function saveJournalsBulkToSupabase(journals: ScientificJournal[]) {
  if (journals.length === 0) return;
  try {
    const dbDataList = journals.map(journal => ({
      id: journal.id,
      name: journal.name,
      issn: journal.issn,
      type: journal.type,
      publisher: journal.publisher,
      field: journal.field,
      score: journal.score,
      established_date: journal.establishedDate,
      paper_count: journal.paperCount,
      rating: journal.rating,
      description: journal.description,
      cover_image: journal.coverImage,
      date_imported: journal.dateImported,
      is_deleted: journal.isDeleted || false,
      deleted_at: journal.deletedAt || null,
      status: journal.status || 'approved',
      created_by: journal.createdBy || null,
      created_by_name: journal.createdByName || null
    }));

    const batchSize = 100;
    for (let i = 0; i < dbDataList.length; i += batchSize) {
      const batch = dbDataList.slice(i, i + batchSize);
      const { error } = await supabase.from(JOURNALS_TABLE).upsert(batch);
      if (error) {
        if (error.code === '42703' || error.message?.includes('status') || error.message?.includes('created_by')) {
          console.warn("⚠️ Bảng 'scientific_journals' thiếu cột 'status' hoặc 'created_by'. Tiến hành lưu fallback không có các trường này...");
          const fallbackBatch = batch.map((item: any) => {
            const copy = { ...item };
            delete copy.status;
            delete copy.created_by;
            delete copy.created_by_name;
            return copy;
          });
          const { error: fallbackError } = await supabase.from(JOURNALS_TABLE).upsert(fallbackBatch);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    handleSupabaseError(error, `Lưu hàng loạt tạp chí (${journals.length} mục)`, JOURNALS_TABLE);
    throw error;
  }
}

export async function deleteJournalFromSupabase(journalId: string) {
  const todayStr = new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN");
  try {
    const { error } = await supabase
      .from(JOURNALS_TABLE)
      .update({ is_deleted: true, deleted_at: todayStr })
      .eq('id', journalId);
    
    if (error) {
      // Fallback to hard delete on any error (like schema issue or permission mismatch)
      console.warn(`Soft delete failed for journal ${journalId}, attempting hard delete:`, error.message);
      return await hardDeleteJournalFromSupabase(journalId);
    }
  } catch (error) {
    console.warn(`Soft delete failed for journal ${journalId}, attempting hard delete:`, error);
    return await hardDeleteJournalFromSupabase(journalId);
  }
}

export async function restoreJournalFromSupabase(journalId: string) {
  try {
    const { error } = await supabase.from(JOURNALS_TABLE).update({ is_deleted: false, deleted_at: null }).eq('id', journalId);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to restore journal ${journalId} in Supabase:`, error);
    throw error;
  }
}

export async function restoreMultipleJournalsFromSupabase(journalIds: string[]) {
  try {
    const { error } = await supabase.from(JOURNALS_TABLE).update({ is_deleted: false, deleted_at: null }).in('id', journalIds);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to restore multiple journals in Supabase:`, error);
    throw error;
  }
}

export async function restoreAllDeletedJournalsFromSupabase() {
  try {
    const { error } = await supabase.from(JOURNALS_TABLE).update({ is_deleted: false, deleted_at: null }).eq('is_deleted', true);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to restore all deleted journals in Supabase:`, error);
    throw error;
  }
}

export async function hardDeleteJournalFromSupabase(journalId: string) {
  try {
    const { error } = await supabase.from(JOURNALS_TABLE).delete().eq('id', journalId);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to permanently delete journal ${journalId} in Supabase:`, error);
    throw error;
  }
}

export async function hardDeleteMultipleJournalsFromSupabase(journalIds: string[]) {
  try {
    const { error } = await supabase.from(JOURNALS_TABLE).delete().in('id', journalIds);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to permanently delete multiple journals in Supabase:`, error);
    throw error;
  }
}

export async function hardDeleteAllDeletedJournalsFromSupabase() {
  try {
    const { error } = await supabase.from(JOURNALS_TABLE).delete().eq('is_deleted', true);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to permanently delete all deleted journals in Supabase:`, error);
    throw error;
  }
}

export async function getJournalFieldsFromSupabase(): Promise<JournalField[]> {
  try {
    const { data, error } = await supabase.from(FIELDS_TABLE).select('*');
    if (error) throw error;
    return (data || []) as JournalField[];
  } catch (error) {
    console.warn("Failed to fetch journal fields from Supabase:", error);
    return [];
  }
}

export async function saveJournalFieldToSupabase(field: JournalField) {
  try {
    const { error } = await supabase.from(FIELDS_TABLE).upsert(field);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to save journal field ${field.name} in Supabase:`, error);
    throw error;
  }
}

export async function deleteJournalFieldFromSupabase(fieldId: string) {
  try {
    const { error } = await supabase.from(FIELDS_TABLE).delete().eq('id', fieldId);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to delete journal field ${fieldId} from Supabase:`, error);
    throw error;
  }
}

export async function transferJournalsFieldInSupabase(oldFieldName: string, newFieldName: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(JOURNALS_TABLE)
      .update({ field: newFieldName })
      .eq('field', oldFieldName);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to transfer journals from ${oldFieldName} to ${newFieldName}:`, error);
    throw error;
  }
}

export async function softDeleteJournalsByFieldInSupabase(fieldName: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(JOURNALS_TABLE)
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('field', fieldName);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to soft delete journals in field ${fieldName}:`, error);
    throw error;
  }
}

export async function getJournalTypesFromSupabase(): Promise<JournalType[]> {
  try {
    const { data, error } = await supabase.from(TYPES_TABLE).select('*');
    if (error) throw error;
    return (data || []) as JournalType[];
  } catch (error) {
    console.warn("Failed to fetch journal types from Supabase:", error);
    return [];
  }
}

export async function saveJournalTypeToSupabase(type: JournalType) {
  try {
    const { error } = await supabase.from(TYPES_TABLE).upsert(type);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to save journal type ${type.name} in Supabase:`, error);
    throw error;
  }
}

export async function deleteJournalTypeFromSupabase(typeId: string) {
  try {
    const { error } = await supabase.from(TYPES_TABLE).delete().eq('id', typeId);
    if (error) throw error;
  } catch (error) {
    console.warn(`Failed to delete journal type ${typeId} from Supabase:`, error);
    throw error;
  }
}

// --- QDA (Qualitative Data Analysis) Operations ---

export async function getQDAProjects(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from(QDA_PROJECTS_TABLE).select('*');
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.created_at,
      settings: p.settings
    }));
  } catch (error) {
    console.error("Lỗi lấy danh sách dự án QDA:", error);
    return [];
  }
}

export async function saveQDAProject(project: any) {
  try {
    const dbData = {
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: project.createdAt || new Date().toISOString(),
      settings: project.settings
    };
    const { error } = await supabase.from(QDA_PROJECTS_TABLE).upsert(dbData);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, "Lưu dự án QDA", QDA_PROJECTS_TABLE);
    throw error;
  }
}

export async function deleteQDAProject(projectId: string) {
  try {
    const { error } = await supabase.from(QDA_PROJECTS_TABLE).delete().eq('id', projectId);
    if (error) throw error;
  } catch (error) {
    console.error("Lỗi xóa dự án QDA:", error);
    throw error;
  }
}

export async function getQDADocuments(projectId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.from(QDA_DOCUMENTS_TABLE).select('*').eq('project_id', projectId);
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      projectId: d.project_id,
      name: d.name,
      plainText: d.plain_text,
      metadata: d.metadata
    }));
  } catch (error) {
    console.error("Lỗi lấy danh sách tài liệu QDA:", error);
    return [];
  }
}

export async function saveQDADocument(doc: any) {
  try {
    const dbData = {
      id: doc.id,
      project_id: doc.projectId,
      name: doc.name,
      plain_text: doc.plainText,
      metadata: doc.metadata
    };
    const { error } = await supabase.from(QDA_DOCUMENTS_TABLE).upsert(dbData);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, "Lưu tài liệu QDA", QDA_DOCUMENTS_TABLE);
    throw error;
  }
}

export async function deleteQDADocument(docId: string) {
  try {
    const { error } = await supabase.from(QDA_DOCUMENTS_TABLE).delete().eq('id', docId);
    if (error) throw error;
  } catch (error) {
    console.error("Lỗi xóa tài liệu QDA:", error);
    throw error;
  }
}

export async function getQDACodes(projectId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.from(QDA_CODES_TABLE).select('*').eq('project_id', projectId);
    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id,
      projectId: c.project_id,
      name: c.name,
      color: c.color,
      parentCodeId: c.parent_code_id,
      description: c.description
    }));
  } catch (error) {
    console.error("Lỗi lấy danh mục mã QDA:", error);
    return [];
  }
}

export async function saveQDACode(code: any) {
  try {
    const dbData = {
      id: code.id,
      project_id: code.projectId,
      name: code.name,
      color: code.color,
      parent_code_id: code.parentCodeId,
      description: code.description
    };
    const { error } = await supabase.from(QDA_CODES_TABLE).upsert(dbData);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, "Lưu mã QDA", QDA_CODES_TABLE);
    throw error;
  }
}

export async function deleteQDACode(codeId: string) {
  try {
    const { error } = await supabase.from(QDA_CODES_TABLE).delete().eq('id', codeId);
    if (error) throw error;
  } catch (error) {
    console.error("Lỗi xóa mã QDA:", error);
    throw error;
  }
}

export async function getQDAAnnotations(projectId: string): Promise<any[]> {
  try {
    const { data: docs } = await supabase.from(QDA_DOCUMENTS_TABLE).select('id').eq('project_id', projectId);
    if (!docs || docs.length === 0) return [];
    
    const docIds = docs.map(d => d.id);
    const { data, error } = await supabase.from(QDA_ANNOTATIONS_TABLE).select('*').in('doc_id', docIds);
    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id,
      docId: a.doc_id,
      codeId: a.code_id,
      startIndex: a.start_index,
      endIndex: a.end_index,
      text: a.text,
      createdBy: a.created_by
    }));
  } catch (error) {
    console.error("Lỗi lấy annotations QDA:", error);
    return [];
  }
}

export async function saveQDAAnnotation(ann: any) {
  try {
    const dbData = {
      id: ann.id,
      doc_id: ann.docId || ann.documentId,
      code_id: ann.codeId,
      start_index: ann.startIndex !== undefined ? ann.startIndex : ann.startOffset,
      end_index: ann.endIndex !== undefined ? ann.endIndex : ann.endOffset,
      text: ann.text,
      created_by: ann.createdBy
    };
    const { error } = await supabase.from(QDA_ANNOTATIONS_TABLE).upsert(dbData);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, "Lưu annotation QDA", QDA_ANNOTATIONS_TABLE);
    throw error;
  }
}

export async function deleteQDAAnnotation(annId: string) {
  try {
    const { error } = await supabase.from(QDA_ANNOTATIONS_TABLE).delete().eq('id', annId);
    if (error) throw error;
  } catch (error) {
    console.error("Lỗi xóa annotation QDA:", error);
    throw error;
  }
}

export async function getQDAMemos(projectId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.from(QDA_MEMOS_TABLE).select('*');
    if (error) throw error;
    return (data || []).map(m => ({
      id: m.id,
      linkedEntityType: m.linked_entity_type,
      linkedEntityId: m.linked_entity_id,
      content: m.content,
      createdAt: m.created_at
    }));
  } catch (error) {
    console.error("Lỗi lấy ghi chú QDA:", error);
    return [];
  }
}

export async function saveQDAMemo(memo: any) {
  try {
    const dbData = {
      id: memo.id,
      linked_entity_type: memo.linkedEntityType,
      linked_entity_id: memo.linkedEntityId,
      content: memo.content,
      created_at: memo.createdAt || new Date().toISOString()
    };
    const { error } = await supabase.from(QDA_MEMOS_TABLE).upsert(dbData);
    if (error) throw error;
  } catch (error) {
    handleSupabaseError(error, "Lưu ghi chú QDA", QDA_MEMOS_TABLE);
    throw error;
  }
}

export async function deleteQDAMemo(memoId: string) {
  try {
    const { error } = await supabase.from(QDA_MEMOS_TABLE).delete().eq('id', memoId);
    if (error) throw error;
  } catch (error) {
    console.error("Lỗi xóa ghi chú QDA:", error);
    throw error;
  }
}

export async function getStatsFromSupabase(): Promise<Record<string, number>> {
  const defaultStats = {
    calculator: 1420,
    journals: 845,
    public_search: 2578,
    users: 112
  };
  try {
    const { data, error } = await supabase
      .from('app_stats')
      .select('stats')
      .eq('id', 'visit_stats')
      .maybeSingle();
    
    if (error) throw error;
    
    if (data && data.stats) {
      return { ...defaultStats, ...data.stats };
    } else {
      return defaultStats;
    }
  } catch (error) {
    console.warn("Failed to fetch stats from Supabase:", error);
    return defaultStats;
  }
}

export async function incrementStatInSupabase(key: string) {
  try {
    const current = await getStatsFromSupabase();
    const updated = { ...current, [key]: (current[key] || 0) + 1 };
    const { error } = await supabase
      .from('app_stats')
      .upsert({ id: 'visit_stats', stats: updated });
    if (error) throw error;
  } catch (error) {
    console.error(`Lỗi tăng chỉ số ${key} trên Supabase:`, error);
  }
}

// === NOTIFICATIONS

export async function getNotificationsFromSupabase(): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('system_notifications')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(n => ({
      id: n.id,
      title: n.title,
      description: n.description,
      type: n.type,
      targetAudience: n.target_audience,
      targetUserIds: n.target_user_ids,
      senderId: n.sender_id,
      senderName: n.sender_name,
      timestamp: n.timestamp,
      isRead: n.is_read,
      link: n.link,
      metadata: n.metadata,
      priority: n.priority
    } as AppNotification));
  } catch (error) {
    console.error("Lỗi khi tải thông báo từ Supabase:", error);
    return [];
  }
}

export function subscribeToNotifications(callback: (notifications: AppNotification[]) => void) {
  // Use Supabase Realtime
  const channel = supabase
    .channel('system_notifications_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_notifications' }, () => {
      getNotificationsFromSupabase().then(callback);
    })
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function pushNotificationToSupabase(notif: Partial<AppNotification>) {
  try {
    const dbData = {
      title: notif.title || '',
      description: notif.description || '',
      type: notif.type || 'system',
      target_audience: notif.targetAudience || 'all',
      target_user_ids: notif.targetUserIds || [],
      sender_id: notif.senderId || '',
      sender_name: notif.senderName || '',
      timestamp: notif.timestamp || new Date().toISOString(),
      is_read: notif.isRead || false,
      link: notif.link || '',
      metadata: notif.metadata || {},
      priority: notif.priority || 'medium'
    };
    
    const { data, error } = await supabase
      .from('system_notifications')
      .insert(dbData)
      .select('id')
      .single();
      
    if (error) throw error;
    return data?.id;
  } catch (error) {
    console.error("Lỗi gửi thông báo đến Supabase:", error);
    throw error;
  }
}

export async function deleteNotificationFromSupabase(notifId: string) {
  try {
    const { error } = await supabase.from('system_notifications').delete().eq('id', notifId);
    if (error) throw error;
  } catch (error) {
    console.error("Lỗi xóa thông báo từ Supabase:", error);
    throw error;
  }
}

function slugifyVietnamese(str: string): string {
  const map: Record<string, string> = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'đ': 'd',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'Ă': 'A', 'Â': 'A', 'Đ': 'D', 'Ê': 'E', 'Ơ': 'O', 'Ô': 'O', 'Ư': 'U'
  };
  let result = str.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    result = result.replace(new RegExp(key, 'g'), val);
  }
  return result.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const DEFAULTS_28_FIELDS = [
  "Chăn nuôi - Thú y - Thuỷ sản",
  "Công nghệ thông tin",
  "Cơ học",
  "Cơ khí - Động lực",
  "Dược học",
  "Giao thông vận tải",
  "Hoá học - Công nghệ thực phẩm",
  "Khoa học An ninh",
  "Khoa học Giáo dục",
  "Khoa học Quân sự",
  "Khoa học Trái đất - Mỏ",
  "Kinh tế",
  "Luật học",
  "Luyện kim",
  "Ngôn ngữ học",
  "Nông nghiệp - Lâm nghiệp",
  "Sinh học",
  "Sử học - Khảo cổ - Dân tộc học",
  "Tâm lý học",
  "Thuỷ lợi",
  "Toán học",
  "Triết học - Xã hội học - Chính trị học",
  "Văn hoá - Nghệ thuật - TDTT (Thể dục Thể thao)",
  "Văn học",
  "Vật lý",
  "Xây dựng - Kiến trúc",
  "Y học",
  "Điện - Điện tử - Tự động hoá"
];

export function isDefaultField(fieldId: string): boolean {
  const defaultIds = DEFAULTS_28_FIELDS.map(name => slugifyVietnamese(name));
  return defaultIds.includes(fieldId);
}

export async function seedDefaultJournalsIfNeeded(): Promise<void> {
  // Disabled automatic seeding as per user request
  return;
  /*
  try {
    // Check if we already seeded to avoid re-adding after user deleted everything
    const settings = await getDefaultSettingsFromSupabase();
    if (settings.initialSeedDone) {
      console.log("⏭️ Seeding already done before, skipping.");
      return;
    }

    // 1. Seed Fields
    const fields = await getJournalFieldsFromSupabase();
    if (fields.length === 0) {
      for (const name of DEFAULTS_28_FIELDS) {
        await saveJournalFieldToSupabase({ 
          id: slugifyVietnamese(name), 
          name 
        });
      }
    }

    // 2. Seed Types
    const types = await getJournalTypesFromSupabase();
    if (types.length === 0) {
      const defaultTypes: JournalType[] = [
        { id: '1', name: "Tạp chí trong nước (HĐGSNN)" },
        { id: '2', name: "Tạp chí quốc tế (ISI/Scopus)" },
        { id: '3', name: "Kỷ yếu hội thảo quốc tế" },
        { id: '4', name: "Kỷ yếu hội thảo trong nước" }
      ];
      for (const t of defaultTypes) {
        await saveJournalTypeToSupabase(t);
      }
    }

    // 3. Seed Journals
    // Use a direct count to check if table is truly empty (including deleted ones)
    const { count, error: countError } = await supabase
      .from(JOURNALS_TABLE)
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;

    if (count === 0) {
      const DEFAULT_JOURNALS: ScientificJournal[] = [
        {
          id: 'journal-1',
          name: 'Tạp chí Khoa học & Công nghệ Việt Nam (VJST)',
          issn: '1859-0799',
          type: 'Tạp chí Trong nước',
          publisher: 'Bộ Khoa học và Công nghệ',
          field: 'Công nghệ thông tin, Sinh học, Vật lý',
          score: '1.2',
          establishedDate: '1959',
          paperCount: 450,
          rating: 4,
          description: 'Tạp chí uy tín hàng đầu Việt Nam về nghiên cứu cơ bản và ứng dụng khoa học kỹ thuật, được tính điểm tối đa bởi Hội đồng Giáo sư Nhà nước.',
          coverImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
          dateImported: new Date().toLocaleDateString("vi-VN")
        },
        {
          id: 'journal-2',
          name: 'Tạp chí Y học Dự phòng',
          issn: '0868-2836',
          type: 'Tạp chí Trong nước',
          publisher: 'Hội Y học Dự phòng Việt Nam',
          field: 'Y tế công cộng, Dịch tễ học, Y học dự phòng',
          score: '1.0',
          establishedDate: '1991',
          paperCount: 320,
          rating: 5,
          description: 'Nơi công bố các nghiên cứu khoa học chuyên sâu về dịch tễ học bệnh truyền nhiễm, dinh dưỡng cộng đồng, và các phương pháp phòng bệnh hiện đại.',
          coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80',
          dateImported: new Date().toLocaleDateString("vi-VN")
        }
      ];
      for (const j of DEFAULT_JOURNALS) {
        await saveJournalToSupabase(j);
      }
      
      // Mark as seeded
      await saveDefaultSettingsToSupabase({ ...settings, initialSeedDone: true });
      console.log("✅ Seeding completed and marked as done.");
    }
  } catch (error) {
    console.error("Lỗi seeding journals:", error);
  }
  */
}
