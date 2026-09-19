-- ============================================================
-- Bảng Công việc trên Supabase
-- Chạy toàn bộ tệp này trong Supabase, mục SQL Editor, rồi bấm Run.
-- Chạy lại nhiều lần vẫn an toàn vì mọi lệnh đều có kiểm tra tồn tại.
-- ============================================================

-- 1. Tạo bảng nếu chưa có
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    description TEXT,
    status TEXT,
    type TEXT,
    assigned_to TEXT,
    assigned_to_name TEXT,
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Bổ sung các cột mới mà module đang dùng
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS creator_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deadline TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.tasks ALTER COLUMN name SET DEFAULT '';

-- 3. Chỉ mục cho các cột hay lọc
CREATE INDEX IF NOT EXISTS tasks_creator_id_idx ON public.tasks (creator_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (status);

-- 4. Bật bảo mật theo dòng và cấp quyền cho người đã đăng nhập.
-- Hệ thống đăng nhập bằng Firebase, Supabase nhận token của Firebase nên mọi
-- người đã đăng nhập đều mang vai trò authenticated. Khách vãng lai không ghi được.
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_authenticated" ON public.tasks;
CREATE POLICY "tasks_select_authenticated"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "tasks_insert_authenticated" ON public.tasks;
CREATE POLICY "tasks_insert_authenticated"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_update_authenticated" ON public.tasks;
CREATE POLICY "tasks_update_authenticated"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "tasks_delete_authenticated" ON public.tasks;
CREATE POLICY "tasks_delete_authenticated"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (true);

-- 5. Bật cập nhật thời gian thực để mọi máy thấy thay đổi ngay
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    END IF;
END $$;

-- 6. Kiểm tra nhanh sau khi chạy
-- SELECT id, name, status, creator_id, assigned_to FROM public.tasks ORDER BY created_at DESC LIMIT 20;
