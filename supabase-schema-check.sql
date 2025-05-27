-- Comprehensive schema check for Supabase tables

-- Check all tables in the public schema
SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
ORDER BY 
  table_name;

-- Check columns for profiles table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM 
  information_schema.columns 
WHERE 
  table_name = 'profiles' 
ORDER BY 
  ordinal_position;

-- Check columns for student_profiles table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM 
  information_schema.columns 
WHERE 
  table_name = 'student_profiles' 
ORDER BY 
  ordinal_position;

-- Check columns for groups table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM 
  information_schema.columns 
WHERE 
  table_name = 'groups' 
ORDER BY 
  ordinal_position;

-- Check columns for group_members table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM 
  information_schema.columns 
WHERE 
  table_name = 'group_members' 
ORDER BY 
  ordinal_position;

-- Check all views in the public schema
SELECT 
  table_name 
FROM 
  information_schema.views 
WHERE 
  table_schema = 'public' 
ORDER BY 
  table_name;

-- Check all functions in the public schema
SELECT 
  routine_name,
  routine_type,
  data_type AS return_type
FROM 
  information_schema.routines 
WHERE 
  routine_schema = 'public' 
ORDER BY 
  routine_name;

-- Check foreign key relationships
SELECT
  tc.table_schema, 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
JOIN 
  information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN 
  information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY 
  tc.table_name, 
  kcu.column_name;
