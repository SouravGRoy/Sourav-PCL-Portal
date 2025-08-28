-- Assignment Management Migration
-- Run this to add assignment management capabilities to your database
-- This version is compatible with your existing schema using 'profiles' table

-- First, create the necessary types
DO $$ 
BEGIN
    -- Assignment type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_type') THEN
        CREATE TYPE assignment_type AS ENUM ('individual', 'group');
    END IF;
    
    -- Assignment status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
        CREATE TYPE assignment_status AS ENUM ('draft', 'active', 'completed', 'archived');
    END IF;
    
    -- Group formation type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_formation_type') THEN
        CREATE TYPE group_formation_type AS ENUM ('random', 'manual', 'self_select');
    END IF;
    
    -- Submission status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'graded', 'returned');
    END IF;
END $$;

-- Update existing assignments table to add new columns
-- First, drop the existing table if it exists and recreate with enhanced schema
DROP TABLE IF EXISTS assignments CASCADE;

-- Create enhanced assignments table
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    type assignment_type NOT NULL DEFAULT 'individual',
    status assignment_status NOT NULL DEFAULT 'draft',
    max_score INTEGER NOT NULL DEFAULT 100,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES profiles(id),
    
    -- Group assignment specific fields
    group_size INTEGER DEFAULT NULL,
    group_formation_type group_formation_type DEFAULT NULL,
    
    -- Settings
    allow_late_submission BOOLEAN DEFAULT FALSE,
    late_submission_penalty DECIMAL(5,2) DEFAULT 0.00,
    enable_peer_review BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT assignments_group_size_check CHECK (
        (type = 'individual' AND group_size IS NULL) OR 
        (type = 'group' AND group_size IS NOT NULL AND group_size >= 2)
    )
);

-- Create assignment rubrics table
CREATE TABLE IF NOT EXISTS assignment_rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    criteria_name VARCHAR(255) NOT NULL,
    criteria_description TEXT,
    max_points INTEGER NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_points CHECK (max_points > 0)
);

-- Create assignment groups table (for group assignments)
CREATE TABLE IF NOT EXISTS assignment_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    group_name VARCHAR(255),
    group_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(assignment_id, group_number)
);

-- Create assignment group members table
CREATE TABLE IF NOT EXISTS assignment_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_group_id UUID NOT NULL REFERENCES assignment_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(assignment_group_id, student_id)
);

-- Enhanced assignment submissions table (replaces existing submissions table)
DROP TABLE IF EXISTS submissions CASCADE;
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assignment_group_id UUID REFERENCES assignment_groups(id) ON DELETE CASCADE,
    
    -- Submission content
    submission_text TEXT,
    file_attachments JSONB DEFAULT '[]', -- Array of file metadata
    submission_url TEXT,
    
    -- Submission metadata
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_late BOOLEAN DEFAULT FALSE,
    attempt_number INTEGER DEFAULT 1,
    
    -- Grading
    total_score DECIMAL(6,2),
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES profiles(id),
    feedback TEXT,
    
    -- Status
    status submission_status DEFAULT 'submitted',
    
    CONSTRAINT submission_student_or_group CHECK (
        (student_id IS NOT NULL AND assignment_group_id IS NULL) OR
        (student_id IS NULL AND assignment_group_id IS NOT NULL)
    ),
    CONSTRAINT valid_score CHECK (total_score >= 0)
);

-- Create assignment submission rubric scores table
CREATE TABLE IF NOT EXISTS assignment_submission_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES assignment_rubrics(id) ON DELETE CASCADE,
    score DECIMAL(6,2) NOT NULL,
    feedback TEXT,
    graded_by UUID NOT NULL REFERENCES profiles(id),
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(submission_id, rubric_id),
    CONSTRAINT valid_rubric_score CHECK (score >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_rubrics_assignment_id ON assignment_rubrics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_groups_assignment_id ON assignment_groups(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submission_scores_submission_id ON assignment_submission_scores(submission_id);

-- Create function to get assignment stats
CREATE OR REPLACE FUNCTION get_assignment_stats(p_assignment_id UUID)
RETURNS TABLE (
    total_submissions BIGINT,
    graded_submissions BIGINT,
    average_score DECIMAL,
    submission_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(COUNT(*), 0) as total_submissions,
        COALESCE(COUNT(*) FILTER (WHERE status = 'graded'), 0) as graded_submissions,
        COALESCE(AVG(total_score), 0) as average_score,
        COALESCE((COUNT(*) * 100.0 / NULLIF((
            SELECT COUNT(*) FROM group_members gm 
            JOIN assignments a ON a.group_id = gm.group_id 
            WHERE a.id = p_assignment_id
        ), 0)), 0) as submission_rate
    FROM assignment_submissions 
    WHERE assignment_id = p_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create groups for group assignments
CREATE OR REPLACE FUNCTION create_assignment_groups(
    p_assignment_id UUID,
    p_group_size INTEGER,
    p_formation_type group_formation_type
) RETURNS INTEGER AS $$
DECLARE
    student_count INTEGER;
    group_count INTEGER;
    students_cursor CURSOR FOR 
        SELECT gm.student_id 
        FROM group_members gm 
        JOIN assignments a ON a.group_id = gm.group_id 
        WHERE a.id = p_assignment_id 
        ORDER BY CASE WHEN p_formation_type = 'random' THEN RANDOM() ELSE gm.student_id::text END;
    
    current_group_id UUID;
    current_group_number INTEGER := 1;
    students_in_current_group INTEGER := 0;
    student_record RECORD;
BEGIN
    -- Get total student count
    SELECT COUNT(*) INTO student_count
    FROM group_members gm 
    JOIN assignments a ON a.group_id = gm.group_id 
    WHERE a.id = p_assignment_id;
    
    -- Calculate number of groups needed
    group_count := CEIL(student_count::DECIMAL / p_group_size);
    
    -- Create groups and assign students
    FOR student_record IN students_cursor LOOP
        -- Create new group if needed
        IF students_in_current_group = 0 THEN
            INSERT INTO assignment_groups (assignment_id, group_name, group_number)
            VALUES (p_assignment_id, 'Group ' || current_group_number, current_group_number)
            RETURNING id INTO current_group_id;
        END IF;
        
        -- Add student to current group
        INSERT INTO assignment_group_members (assignment_group_id, student_id)
        VALUES (current_group_id, student_record.student_id);
        
        students_in_current_group := students_in_current_group + 1;
        
        -- Move to next group if current is full
        IF students_in_current_group >= p_group_size THEN
            current_group_number := current_group_number + 1;
            students_in_current_group := 0;
        END IF;
    END LOOP;
    
    RETURN group_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submission_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view assignments from their groups" ON assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = assignments.group_id 
            AND gm.student_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM groups g 
            WHERE g.id = assignments.group_id 
            AND g.faculty_id = auth.uid()
        )
    );

CREATE POLICY "Faculty can manage assignments for their groups" ON assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM groups g 
            WHERE g.id = assignments.group_id 
            AND g.faculty_id = auth.uid()
        )
    );

-- Add policies for other tables
CREATE POLICY "Users can view rubrics for accessible assignments" ON assignment_rubrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN group_members gm ON gm.group_id = a.group_id
            WHERE a.id = assignment_rubrics.assignment_id
            AND gm.student_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN groups g ON g.id = a.group_id
            WHERE a.id = assignment_rubrics.assignment_id
            AND g.faculty_id = auth.uid()
        )
    );

CREATE POLICY "Faculty can manage rubrics for their assignments" ON assignment_rubrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN groups g ON g.id = a.group_id
            WHERE a.id = assignment_rubrics.assignment_id
            AND g.faculty_id = auth.uid()
        )
    );
