-- Create announcements table
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  group_id uuid NOT NULL,
  faculty_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT announcements_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX idx_announcements_group_id ON public.announcements(group_id);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements
-- Faculty can create, read, update, delete their own announcements
CREATE POLICY "Faculty can manage their announcements" ON public.announcements
  FOR ALL USING (faculty_id = auth.uid());

-- Students can read announcements from groups they are members of
CREATE POLICY "Students can read group announcements" ON public.announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = announcements.group_id 
      AND student_id = auth.uid()
    )
  );
