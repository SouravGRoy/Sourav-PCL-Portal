-- Add grading fields to submissions table
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS max_score DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES profiles(id);

-- Create grading_rubrics table for assignment rubrics
CREATE TABLE IF NOT EXISTS grading_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  criteria_name TEXT NOT NULL,
  criteria_description TEXT,
  max_points DECIMAL(5,2) NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create individual rubric scores table
CREATE TABLE IF NOT EXISTS rubric_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES grading_rubrics(id) ON DELETE CASCADE,
  points_awarded DECIMAL(5,2) NOT NULL DEFAULT 0,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(submission_id, rubric_id)
);

-- Create student_grades table for overall performance tracking
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  semester TEXT,
  year TEXT,
  overall_gpa DECIMAL(3,2),
  total_assignments INTEGER DEFAULT 0,
  completed_assignments INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, group_id, semester, year)
);

-- Add RLS policies for new tables
ALTER TABLE grading_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

-- Policies for grading_rubrics
CREATE POLICY "Faculty can manage rubrics for their assignments" ON grading_rubrics
FOR ALL USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN groups g ON a.group_id = g.id
    WHERE g.faculty_id = auth.uid()
  )
);

CREATE POLICY "Students can view rubrics for their group assignments" ON grading_rubrics
FOR SELECT USING (
  assignment_id IN (
    SELECT a.id FROM assignments a
    JOIN groups g ON a.group_id = g.id
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.student_id = auth.uid()
  )
);

-- Policies for rubric_scores
CREATE POLICY "Faculty can manage rubric scores" ON rubric_scores
FOR ALL USING (
  submission_id IN (
    SELECT s.id FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN groups g ON a.group_id = g.id
    WHERE g.faculty_id = auth.uid()
  )
);

CREATE POLICY "Students can view their rubric scores" ON rubric_scores
FOR SELECT USING (
  submission_id IN (
    SELECT id FROM submissions WHERE student_id = auth.uid()
  )
);

-- Policies for student_grades
CREATE POLICY "Faculty can view grades for their group students" ON student_grades
FOR SELECT USING (
  group_id IN (
    SELECT id FROM groups WHERE faculty_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own grades" ON student_grades
FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Faculty can update grades for their group students" ON student_grades
FOR ALL USING (
  group_id IN (
    SELECT id FROM groups WHERE faculty_id = auth.uid()
  )
);

-- Function to calculate and update student GPA
CREATE OR REPLACE FUNCTION calculate_student_gpa(
  p_student_id UUID,
  p_group_id UUID,
  p_semester TEXT DEFAULT NULL,
  p_year TEXT DEFAULT NULL
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_total_points DECIMAL := 0;
  v_max_points DECIMAL := 0;
  v_gpa DECIMAL(3,2);
  v_assignment_count INTEGER := 0;
  v_completed_count INTEGER := 0;
BEGIN
  -- Calculate total points from all graded submissions
  SELECT 
    COALESCE(SUM(s.total_score), 0),
    COALESCE(SUM(s.max_score), 0),
    COUNT(DISTINCT a.id),
    COUNT(DISTINCT CASE WHEN s.status IN ('graded', 'reviewed') THEN s.id END)
  INTO v_total_points, v_max_points, v_assignment_count, v_completed_count
  FROM assignments a
  JOIN groups g ON a.group_id = g.id
  LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = p_student_id
  WHERE g.id = p_group_id
    AND (p_semester IS NULL OR g.semester = p_semester)
    AND (p_year IS NULL OR g.year = p_year);
  
  -- Convert percentage to 4.0 GPA scale
  IF v_max_points > 0 THEN
    v_gpa := ROUND(((v_total_points / v_max_points) * 4.0)::DECIMAL, 2);
  ELSE
    v_gpa := 0.00;
  END IF;
  
  -- Update or insert student grades record
  INSERT INTO student_grades (
    student_id, group_id, semester, year, overall_gpa, 
    total_assignments, completed_assignments, average_score, updated_at
  ) VALUES (
    p_student_id, p_group_id, p_semester, p_year, v_gpa,
    v_assignment_count, v_completed_count, 
    CASE WHEN v_max_points > 0 THEN ROUND((v_total_points / v_max_points * 100)::DECIMAL, 2) ELSE 0 END,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (student_id, group_id, semester, year) 
  DO UPDATE SET
    overall_gpa = v_gpa,
    total_assignments = v_assignment_count,
    completed_assignments = v_completed_count,
    average_score = CASE WHEN v_max_points > 0 THEN ROUND((v_total_points / v_max_points * 100)::DECIMAL, 2) ELSE 0 END,
    updated_at = CURRENT_TIMESTAMP;
    
  RETURN v_gpa;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate GPA when submissions are graded
CREATE OR REPLACE FUNCTION trigger_calculate_gpa()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate GPA for the student when their submission is graded
  IF (NEW.total_score IS NOT NULL AND NEW.total_score != OLD.total_score) 
     OR (NEW.status = 'graded' AND OLD.status != 'graded') THEN
    
    PERFORM calculate_student_gpa(
      NEW.student_id,
      (SELECT group_id FROM assignments WHERE id = NEW.assignment_id),
      NULL,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gpa_on_grade
  AFTER UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_gpa();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_grades_student_group ON student_grades(student_id, group_id);
CREATE INDEX IF NOT EXISTS idx_submissions_score ON submissions(total_score) WHERE total_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_assignment ON grading_rubrics(assignment_id);
CREATE INDEX IF NOT EXISTS idx_rubric_scores_submission ON rubric_scores(submission_id);
