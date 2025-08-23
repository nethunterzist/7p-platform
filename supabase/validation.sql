
-- Validation: Check created tables
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check sample data
SELECT 'users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'courses' as table_name, COUNT(*) as count FROM public.courses
UNION ALL
SELECT 'course_modules' as table_name, COUNT(*) as count FROM public.course_modules
UNION ALL
SELECT 'lessons' as table_name, COUNT(*) as count FROM public.lessons;
