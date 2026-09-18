
-- Schools table
CREATE TABLE IF NOT EXISTS edu_schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id TEXT
);

-- Classes table
CREATE TABLE IF NOT EXISTS edu_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES edu_schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id TEXT
);

-- Users (Students) table
CREATE TABLE IF NOT EXISTS edu_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES edu_classes(id) ON DELETE CASCADE,
    stt INTEGER,
    full_name TEXT NOT NULL,
    mssv TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, mssv)
);

-- Grade Columns table
CREATE TABLE IF NOT EXISTS edu_grade_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES edu_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER DEFAULT 0,
    is_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS edu_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES edu_classes(id) ON DELETE CASCADE,
    grade_column_id UUID REFERENCES edu_grade_columns(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    allowed_file_types TEXT[],
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    share_link_id TEXT UNIQUE DEFAULT substring(md5(random()::text), 0, 10)
);

-- Submissions table
CREATE TABLE IF NOT EXISTS edu_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES edu_assignments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES edu_users(id) ON DELETE CASCADE,
    mssv TEXT NOT NULL,
    files JSONB DEFAULT '[]'::jsonb,
    content TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    first_submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, mssv)
);

-- Grades table
CREATE TABLE IF NOT EXISTS edu_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_column_id UUID REFERENCES edu_grade_columns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES edu_users(id) ON DELETE CASCADE,
    score NUMERIC,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grade_column_id, user_id)
);
