-- SQL script to update RLS policies for student_drive_links table

-- First, check if the table exists
CREATE TABLE IF NOT EXISTS public.student_drive_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES public.profiles(id),
  group_id UUID REFERENCES public.groups(id),
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_drive_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own drive links" ON public.student_drive_links;
DROP POLICY IF EXISTS "Students can add their own drive links" ON public.student_drive_links;
DROP POLICY IF EXISTS "Faculty can view all drive links" ON public.student_drive_links;
DROP POLICY IF EXISTS "Faculty can delete drive links" ON public.student_drive_links;

-- Create policies for student_drive_links table
-- Allow students to view their own drive links
CREATE POLICY "Students can view their own drive links" 
ON public.student_drive_links
FOR SELECT
USING (auth.uid() = student_id);

-- Allow students to add their own drive links (without requiring group membership)
CREATE POLICY "Students can add their own drive links" 
ON public.student_drive_links
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Allow faculty to view all drive links
CREATE POLICY "Faculty can view all drive links" 
ON public.student_drive_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'faculty'
  )
);

-- Allow faculty to delete drive links
CREATE POLICY "Faculty can delete drive links" 
ON public.student_drive_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'faculty'
  )
);

-- Grant permissions to authenticated users
GRANT ALL ON public.student_drive_links TO authenticated;
