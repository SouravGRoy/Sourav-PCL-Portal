-- Assignment Management System Database Schema
-- This file contains the SQL schema for comprehensive assignment management
-- Updated to work with existing profiles table structure

-- First, let's add missing columns to existing assignments table
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS max_score INTEGER NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS group_size INTEGER,
ADD COLUMN IF NOT EXISTS group_formation_type TEXT,
ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_submission_penalty DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS enable_peer_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add constraints for type and status
DO $$
BEGIN
    -- Add check constraint for assignment type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'assignments_type_check'
    ) THEN
        ALTER TABLE public.assignments 
        ADD CONSTRAINT assignments_type_check 
        CHECK (type IN ('individual', 'group'));
    END IF;
    
    -- Add check constraint for assignment status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'assignments_status_check'
    ) THEN
        ALTER TABLE public.assignments 
        ADD CONSTRAINT assignments_status_check 
        CHECK (status IN ('draft', 'active', 'completed', 'archived'));
    END IF;
    
    -- Add check constraint for group formation type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'assignments_group_formation_check'
    ) THEN
        ALTER TABLE public.assignments 
        ADD CONSTRAINT assignments_group_formation_check 
        CHECK (group_formation_type IN ('random', 'manual', 'self_select') OR group_formation_type IS NULL);
    END IF;
    
    -- Add check constraint for group size logic
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'assignments_group_size_check'
    ) THEN
        ALTER TABLE public.assignments 
        ADD CONSTRAINT assignments_group_size_check 
        CHECK (
            (type = 'individual' AND group_size IS NULL) OR 
            (type = 'group' AND group_size IS NOT NULL AND group_size >= 2)
        );
    END IF;
END $$;
    
-- Assignment rubrics table for grading criteria
CREATE TABLE IF NOT EXISTS public.assignment_rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    criteria_name VARCHAR(255) NOT NULL,
    criteria_description TEXT,
    max_points INTEGER NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_points CHECK (max_points > 0)
);

-- Assignment groups table (for group assignments)
CREATE TABLE IF NOT EXISTS public.assignment_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    group_name VARCHAR(255),
    group_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT assignment_groups_unique_number UNIQUE(assignment_id, group_number)
);

-- Assignment group members table
CREATE TABLE IF NOT EXISTS public.assignment_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_group_id UUID NOT NULL REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT assignment_group_members_unique UNIQUE(assignment_group_id, student_id)
);

-- Enhanced assignment submissions table (extending existing submissions)
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_group_id UUID REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
    
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
    graded_by UUID REFERENCES public.profiles(id),
    feedback TEXT,
    
    -- Status
    status TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
    
    CONSTRAINT submission_student_or_group CHECK (
        (student_id IS NOT NULL AND assignment_group_id IS NULL) OR
        (student_id IS NULL AND assignment_group_id IS NOT NULL)
    ),
    CONSTRAINT valid_score CHECK (total_score >= 0)
);

-- Assignment submission rubric scores table
CREATE TABLE IF NOT EXISTS public.assignment_submission_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES public.assignment_rubrics(id) ON DELETE CASCADE,
    score DECIMAL(6,2) NOT NULL,
    feedback TEXT,
    graded_by UUID NOT NULL REFERENCES public.profiles(id),
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT assignment_submission_scores_unique UNIQUE(submission_id, rubric_id),
    CONSTRAINT valid_rubric_score CHECK (score >= 0)
);

-- Assignment resources table (for attachments, links, etc.)
CREATE TABLE IF NOT EXISTS public.assignment_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'link', 'video', 'document')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT,
    file_metadata JSONB,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Assignment notifications table
CREATE TABLE IF NOT EXISTS public.assignment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'assignment_created', 
        'assignment_due_reminder', 
        'submission_received', 
        'grade_released',
        'feedback_available'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON public.assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignment_rubrics_assignment_id ON public.assignment_rubrics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_groups_assignment_id ON public.assignment_groups(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON public.assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submission_scores_submission_id ON public.assignment_submission_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_assignment_resources_assignment_id ON public.assignment_resources(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_recipient_id ON public.assignment_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_assignment_id ON public.assignment_notifications(assignment_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to assignments table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_assignments_updated_at'
    ) THEN
        CREATE TRIGGER update_assignments_updated_at 
            BEFORE UPDATE ON public.assignments 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS (Row Level Security) policies
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submission_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignments
DROP POLICY IF EXISTS "Users can view assignments from their groups" ON public.assignments;
CREATE POLICY "Users can view assignments from their groups" ON public.assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_members gm 
            WHERE gm.group_id = assignments.group_id 
            AND gm.student_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.groups g 
            WHERE g.id = assignments.group_id 
            AND g.faculty_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Faculty can manage assignments for their groups" ON public.assignments;
CREATE POLICY "Faculty can manage assignments for their groups" ON public.assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.groups g 
            WHERE g.id = assignments.group_id 
            AND g.faculty_id = auth.uid()
        )
    );

-- RLS Policies for submissions
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can view their own submissions" ON public.assignment_submissions
    FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.assignment_group_members agm
            WHERE agm.assignment_group_id = assignment_submissions.assignment_group_id
            AND agm.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Faculty can view all submissions for their assignments" ON public.assignment_submissions;
CREATE POLICY "Faculty can view all submissions for their assignments" ON public.assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assignments a
            JOIN public.groups g ON g.id = a.group_id
            WHERE a.id = assignment_submissions.assignment_id
            AND g.faculty_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Students can manage their own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can manage their own submissions" ON public.assignment_submissions
    FOR ALL USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.assignment_group_members agm
            WHERE agm.assignment_group_id = assignment_submissions.assignment_group_id
            AND agm.student_id = auth.uid()
        )
    );

-- Add helpful functions
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
            SELECT COUNT(*) FROM public.group_members gm 
            JOIN public.assignments a ON a.group_id = gm.group_id 
            WHERE a.id = p_assignment_id
        ), 0)), 0) as submission_rate
    FROM public.assignment_submissions 
    WHERE assignment_id = p_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-create groups for group assignments
CREATE OR REPLACE FUNCTION create_assignment_groups(
    p_assignment_id UUID,
    p_group_size INTEGER,
    p_formation_type TEXT
) RETURNS INTEGER AS $$
DECLARE
    student_count INTEGER;
    group_count INTEGER;
    students_cursor CURSOR FOR 
        SELECT gm.student_id 
        FROM public.group_members gm 
        JOIN public.assignments a ON a.group_id = gm.group_id 
        WHERE a.id = p_assignment_id 
        ORDER BY CASE WHEN p_formation_type = 'random' THEN RANDOM() ELSE gm.student_id::text END;
    
    current_group_id UUID;
    current_group_number INTEGER := 1;
    students_in_current_group INTEGER := 0;
    student_record RECORD;
BEGIN
    -- Get total student count
    SELECT COUNT(*) INTO student_count
    FROM public.group_members gm 
    JOIN public.assignments a ON a.group_id = gm.group_id 
    WHERE a.id = p_assignment_id;
    
    -- Calculate number of groups needed
    group_count := CEIL(student_count::DECIMAL / p_group_size);
    
    -- Create groups and assign students
    FOR student_record IN students_cursor LOOP
        -- Create new group if needed
        IF students_in_current_group = 0 THEN
            INSERT INTO public.assignment_groups (assignment_id, group_name, group_number)
            VALUES (p_assignment_id, 'Group ' || current_group_number, current_group_number)
            RETURNING id INTO current_group_id;
        END IF;
        
        -- Add student to current group
        INSERT INTO public.assignment_group_members (assignment_group_id, student_id)
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
