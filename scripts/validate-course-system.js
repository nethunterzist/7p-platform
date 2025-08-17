const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function validateCourseSystem() {
  console.log('🔍 Validating Course System...\n');

  try {
    // Check if required tables exist
    const tables = [
      'instructors',
      'course_categories', 
      'courses',
      'course_modules',
      'course_lessons',
      'user_courses',
      'user_lesson_progress',
      'course_reviews'
    ];

    console.log('📊 Checking database tables...');
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': OK`);
      }
    }

    // Check if sample data exists
    console.log('\n📝 Checking sample data...');
    
    const { data: categories } = await supabase
      .from('course_categories')
      .select('name');
    console.log(`📂 Categories: ${categories?.length || 0} found`);

    const { data: instructors } = await supabase
      .from('instructors')
      .select('display_name');
    console.log(`👨‍🏫 Instructors: ${instructors?.length || 0} found`);

    const { data: courses } = await supabase
      .from('courses')
      .select('title');
    console.log(`📚 Courses: ${courses?.length || 0} found`);

    // Test course marketplace query
    console.log('\n🛒 Testing marketplace query...');
    const { data: marketplaceCourses, error: marketplaceError } = await supabase
      .from('courses')
      .select(`
        *,
        instructors (
          display_name,
          avatar_url
        ),
        course_categories (
          name
        )
      `)
      .eq('is_published', true)
      .limit(5);

    if (marketplaceError) {
      console.log(`❌ Marketplace query failed: ${marketplaceError.message}`);
    } else {
      console.log(`✅ Marketplace query: ${marketplaceCourses?.length || 0} courses found`);
    }

    // Test course detail query
    console.log('\n📖 Testing course detail query...');
    if (courses && courses.length > 0) {
      const { data: courseDetail, error: detailError } = await supabase
        .from('courses')
        .select(`
          *,
          instructors (
            display_name,
            avatar_url,
            bio
          ),
          course_categories (
            name,
            slug
          ),
          course_modules (
            id,
            title,
            description,
            order_index,
            course_lessons (
              id,
              title,
              description,
              video_url,
              duration_seconds:video_duration,
              order_index,
              is_free
            )
          )
        `)
        .limit(1)
        .single();

      if (detailError) {
        console.log(`❌ Course detail query failed: ${detailError.message}`);
      } else {
        console.log(`✅ Course detail query: Success`);
        if (courseDetail?.course_modules?.length > 0) {
          console.log(`  📚 Modules: ${courseDetail.course_modules.length}`);
          const totalLessons = courseDetail.course_modules.reduce(
            (acc, module) => acc + (module.course_lessons?.length || 0), 0
          );
          console.log(`  📝 Lessons: ${totalLessons}`);
        }
      }
    }

    console.log('\n🎉 Course system validation completed!');

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

validateCourseSystem();