-- SCRIPT CHUẨN KHỞI TẠO VÀ CẬP NHẬT DATABASE
-- Hướng dẫn: Copy toàn bộ nội dung này dán vào SQL Editor của Supabase và nhấn RUN.

-- 1. Bảng cấu hình hệ thống
CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    default_cover_image TEXT,
    theme_color TEXT,
    web_app_title TEXT,
    web_app_icon TEXT,
    sidebar_opacity NUMERIC(4,3) DEFAULT 0.92,
    footer_text TEXT,
    allow_public_access BOOLEAN DEFAULT TRUE,
    system_description TEXT,
    dashboard_banner_title TEXT,
    task_types JSONB,
    notification_banner_title TEXT,
    notification_banner_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS sidebar_opacity NUMERIC(4,3) DEFAULT 0.92;

-- Bảng thống kê truy cập
CREATE TABLE IF NOT EXISTS app_stats (
    id TEXT PRIMARY KEY,
    stats JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE app_stats DISABLE ROW LEVEL SECURITY;

-- 2. Bảng người dùng
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    email TEXT,
    role TEXT,
    permissions JSONB,
    can_assign_task BOOLEAN DEFAULT FALSE,
    can_receive_task BOOLEAN DEFAULT TRUE,
    can_run_pause_task BOOLEAN DEFAULT TRUE,
    can_complete_task BOOLEAN DEFAULT TRUE,
    can_delete_task BOOLEAN DEFAULT FALSE,
    can_create_task BOOLEAN DEFAULT FALSE,
    can_manage_settings BOOLEAN DEFAULT FALSE,
    can_create_journal BOOLEAN DEFAULT FALSE,
    can_edit_journal BOOLEAN DEFAULT FALSE,
    can_delete_journal BOOLEAN DEFAULT FALSE,
    can_import_journal BOOLEAN DEFAULT FALSE,
    can_manage_journal_cats BOOLEAN DEFAULT FALSE,
    can_manage_journal_settings BOOLEAN DEFAULT FALSE,
    can_create_qualitative BOOLEAN DEFAULT FALSE,
    can_edit_qualitative BOOLEAN DEFAULT FALSE,
    can_delete_qualitative BOOLEAN DEFAULT FALSE,
    can_import_qualitative BOOLEAN DEFAULT FALSE,
    can_export_qualitative BOOLEAN DEFAULT FALSE,
    can_manage_qualitative_settings BOOLEAN DEFAULT FALSE,
    can_create_quantitative BOOLEAN DEFAULT FALSE,
    can_edit_quantitative BOOLEAN DEFAULT FALSE,
    can_delete_quantitative BOOLEAN DEFAULT FALSE,
    can_import_quantitative BOOLEAN DEFAULT FALSE,
    can_export_quantitative BOOLEAN DEFAULT FALSE,
    can_manage_quantitative_settings BOOLEAN DEFAULT FALSE,
    created_at TEXT,
    password TEXT,
    fcm_tokens JSONB DEFAULT '[]'::jsonb
);
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Bảng tạp chí khoa học và danh mục
CREATE TABLE IF NOT EXISTS journal_fields (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);
ALTER TABLE journal_fields DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS journal_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);
ALTER TABLE journal_types DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS scientific_journals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    issn TEXT,
    type TEXT,
    publisher TEXT,
    field TEXT,
    score TEXT,
    established_date TEXT,
    paper_count INTEGER,
    rating INTEGER,
    description TEXT,
    cover_image TEXT,
    date_imported TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TEXT,
    status TEXT DEFAULT 'approved',
    created_by TEXT,
    created_by_name TEXT
);
ALTER TABLE scientific_journals DISABLE ROW LEVEL SECURITY;

-- 4. Các bảng dự án QDA
CREATE TABLE IF NOT EXISTS qda_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT,
    settings JSONB
);
ALTER TABLE qda_projects DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS qda_documents (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT NOT NULL,
    plain_text TEXT,
    metadata JSONB
);
ALTER TABLE qda_documents DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS qda_codes (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT NOT NULL,
    color TEXT,
    parent_code_id TEXT,
    description TEXT
);
ALTER TABLE qda_codes DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS qda_annotations (
    id TEXT PRIMARY KEY,
    doc_id TEXT,
    code_id TEXT,
    start_index INTEGER,
    end_index INTEGER,
    text TEXT,
    created_by TEXT
);
ALTER TABLE qda_annotations DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS qda_memos (
    id TEXT PRIMARY KEY,
    linked_entity_type TEXT,
    linked_entity_id TEXT,
    content TEXT,
    created_at TEXT
);
ALTER TABLE qda_memos DISABLE ROW LEVEL SECURITY;

-- 5. Bảng Công việc (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT,
    priority TEXT,
    type TEXT,
    assigned_to TEXT,
    assigned_to_name TEXT,
    created_by TEXT,
    created_by_name TEXT,
    start_date TEXT,
    end_date TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- 6. Bảng Thông báo hệ thống
CREATE TABLE IF NOT EXISTS system_notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT, -- info, success, warning, error, task, system
    target_audience TEXT, -- all, all_admins, custom_admins, custom_users
    target_user_ids JSONB DEFAULT '[]'::jsonb,
    sender_id TEXT,
    sender_name TEXT,
    timestamp TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal',
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE system_notifications DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- PHẦN CẬP NHẬT CỘT (Chạy lệnh này để sửa lỗi thiếu cột)
-- ==========================================
DO $$ BEGIN 
    -- Cập nhật users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='can_delete_journal') THEN
        ALTER TABLE users ADD COLUMN can_assign_task BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_receive_task BOOLEAN DEFAULT TRUE;
        ALTER TABLE users ADD COLUMN can_run_pause_task BOOLEAN DEFAULT TRUE;
        ALTER TABLE users ADD COLUMN can_complete_task BOOLEAN DEFAULT TRUE;
        ALTER TABLE users ADD COLUMN can_delete_task BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_create_task BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_manage_settings BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_create_journal BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_edit_journal BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_delete_journal BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_import_journal BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_manage_journal_cats BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_manage_journal_settings BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_create_qualitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_edit_qualitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_delete_qualitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_import_qualitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_export_qualitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_manage_qualitative_settings BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_create_quantitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_edit_quantitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_delete_quantitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_import_quantitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_export_quantitative BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN can_manage_quantitative_settings BOOLEAN DEFAULT FALSE;
    END IF;

    -- Cập nhật system_notifications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_notifications' AND column_name='priority') THEN
        ALTER TABLE system_notifications ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;

    -- Cập nhật scientific_journals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scientific_journals' AND column_name='cover_image') THEN
        ALTER TABLE scientific_journals ADD COLUMN cover_image TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scientific_journals' AND column_name='is_deleted') THEN
        ALTER TABLE scientific_journals ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scientific_journals' AND column_name='deleted_at') THEN
        ALTER TABLE scientific_journals ADD COLUMN deleted_at TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scientific_journals' AND column_name='status') THEN
        ALTER TABLE scientific_journals ADD COLUMN status TEXT DEFAULT 'approved';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scientific_journals' AND column_name='created_by') THEN
        ALTER TABLE scientific_journals ADD COLUMN created_by TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='scientific_journals' AND column_name='created_by_name') THEN
        ALTER TABLE scientific_journals ADD COLUMN created_by_name TEXT;
    END IF;

    -- Cập nhật app_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='notification_banner_title') THEN
        ALTER TABLE app_settings ADD COLUMN notification_banner_title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='notification_banner_description') THEN
        ALTER TABLE app_settings ADD COLUMN notification_banner_description TEXT;
    END IF;

    -- Cập nhật users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
        ALTER TABLE users ADD COLUMN password TEXT;
    END IF;
END $$;

-- ĐẢM BẢO TẮT RLS CHO TẤT CẢ CÁC BẢNG
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE scientific_journals DISABLE ROW LEVEL SECURITY;
ALTER TABLE qda_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE qda_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE qda_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE qda_annotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE qda_memos DISABLE ROW LEVEL SECURITY;

-e 
-- TẢI LẠI CACHE
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- MIGRATION: Icon banner cho 4 module + banner Phan tich dinh luong
-- Chay khoi nay trong Supabase SQL Editor neu gap loi thieu cot
-- ============================================================
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tasks_banner_icon text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS journals_banner_icon text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS qda_banner_icon text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS quant_banner_icon text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS quant_banner_title text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS quant_banner_description text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS quant_banner_label text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS quant_banner_image_url text;
