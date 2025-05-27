-- Get all tables in the public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- For each table, get its columns
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM 
  information_schema.tables t
JOIN 
  information_schema.columns c 
  ON t.table_name = c.table_name
WHERE 
  t.table_schema = 'public' 
  AND c.table_schema = 'public'
ORDER BY 
  t.table_name, 
  c.ordinal_position;
