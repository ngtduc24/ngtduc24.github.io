-- Ngân hàng bài tập theo môn (Phương án 1)
-- Chạy 1 lần trên Supabase SQL Editor. Chỉ tạo bảng mới và thêm cột trống,
-- KHÔNG đụng vào dữ liệu cũ. Các bài tập đã giao vẫn nguyên vẹn.

-- Bảng Môn học
CREATE TABLE IF NOT EXISTS edu_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id TEXT
);

-- Bảng Ngân hàng bài tập (bài tập mẫu, không gắn với lớp nào)
CREATE TABLE IF NOT EXISTS edu_assignment_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES edu_subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    allowed_file_types TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id TEXT
);

-- Thêm 2 cột tùy chọn cho bảng bài tập hiện có để lưu vết nguồn gốc.
ALTER TABLE edu_assignments ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE edu_assignments ADD COLUMN IF NOT EXISTS bank_id UUID;
