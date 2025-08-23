#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedDatabase() {
  console.log('🌱 DATABASE SEEDING STARTED');
  console.log('==================================================');
  console.log();

  // Initialize Supabase Admin Client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Step 1: Create instructor user via Admin API
    console.log('👤 Creating instructor user...');
    
    let { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'instructor@example.com',
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: {
        name: 'Test Instructor'
      }
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('User already registered') || authError.code === 'email_exists') {
        console.log('⚠️  User already exists, fetching existing user...');
        
        const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers();
        if (fetchError) throw fetchError;
        
        const existingUser = existingUsers.users.find(u => u.email === 'instructor@example.com');
        if (!existingUser) throw new Error('User exists but cannot be found');
        
        console.log('✅ Found existing user:', existingUser.id);
        authUser = { user: existingUser };
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Auth user created:', authUser.user.id);
    }

    const userId = authUser.user?.id || authUser.id;
    
    // Step 2: Update public.users profile (trigger should have created it)
    console.log('📝 Updating user profile...');
    
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: 'instructor@example.com',
        name: 'Test Instructor',
        role: 'instructor'
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('❌ Profile update failed:', profileError);
      throw profileError;
    }
    
    console.log('✅ User profile updated with instructor role');

    // Step 3: Create a sample course
    console.log('📚 Creating sample course...');
    
    // Check if course already exists
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('*')
      .eq('title', 'Introduction to Web Development')
      .eq('instructor_id', userId)
      .single();

    let course;
    if (existingCourse) {
      console.log('⚠️  Course already exists, using existing...');
      course = existingCourse;
    } else {
      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: 'Introduction to Web Development',
          description: 'Learn the basics of HTML, CSS, and JavaScript in this comprehensive course.',
          instructor_id: userId,
          category: 'Programming',
          level: 'beginner',
          price_amount: 9900, // $99.00
          price_currency: 'USD',
          published: true
        })
        .select()
        .single();

      if (courseError) {
        console.error('❌ Course creation failed:', courseError);
        throw courseError;
      }
      course = newCourse;
    }
    
    console.log('✅ Sample course created:', course.id);

    // Step 4: Create course modules and lessons
    console.log('📖 Creating course content...');
    
    // Check if module already exists
    const { data: existingModule } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', course.id)
      .eq('title', 'Getting Started')
      .single();

    let module;
    if (existingModule) {
      console.log('⚠️  Module already exists, using existing...');
      module = existingModule;
    } else {
      const { data: newModule, error: moduleError } = await supabase
        .from('course_modules')
        .insert({
          course_id: course.id,
          title: 'Getting Started',
          description: 'Introduction to web development concepts',
          order_index: 1
        })
        .select()
        .single();

      if (moduleError) {
        console.error('❌ Module creation failed:', moduleError);
        throw moduleError;
      }
      module = newModule;
    }

    // Check if lesson already exists
    const { data: existingLesson } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', module.id)
      .eq('title', 'What is HTML?')
      .single();

    if (!existingLesson) {
      const { error: lessonError } = await supabase
        .from('lessons')
        .insert({
          module_id: module.id,
          title: 'What is HTML?',
          content: 'HTML (HyperText Markup Language) is the standard markup language for creating web pages.',
          duration: 300, // 5 minutes
          order_index: 1
        });

      if (lessonError) {
        console.error('❌ Lesson creation failed:', lessonError);
        throw lessonError;
      }
    } else {
      console.log('⚠️  Lesson already exists, skipping...');
    }

    console.log('✅ Course content created (1 module, 1 lesson)');

    // Step 5: Create sample student user and course review
    console.log('👨‍🎓 Creating sample student and review...');
    
    // Create student user
    let studentUser;
    const { data: existingStudent, error: studentError } = await supabase.auth.admin.listUsers();
    const existingStudentUser = existingStudent.users.find(u => u.email === 'student@example.com');
    
    if (existingStudentUser) {
      console.log('⚠️  Student user already exists, using existing...');
      studentUser = { user: existingStudentUser };
    } else {
      const { data: newStudent, error: newStudentError } = await supabase.auth.admin.createUser({
        email: 'student@example.com',
        password: 'Test1234!',
        email_confirm: true,
        user_metadata: {
          name: 'Test Student'
        }
      });

      if (newStudentError) {
        console.error('⚠️  Student creation failed:', newStudentError.message);
      } else {
        console.log('✅ Student user created:', newStudent.user.id);
        studentUser = newStudent;
      }
    }

    if (studentUser) {
      const studentId = studentUser.user?.id || studentUser.id;
      
      // Update student profile
      await supabase
        .from('users')
        .upsert({
          id: studentId,
          email: 'student@example.com',
          name: 'Test Student',
          role: 'student'
        }, { onConflict: 'id' });

      // Create enrollment for student
      const { data: existingEnrollment } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', studentId)
        .eq('course_id', course.id)
        .single();

      if (!existingEnrollment) {
        const { error: enrollmentError } = await supabase
          .from('course_enrollments')
          .insert({
            user_id: studentId,
            course_id: course.id,
            progress_percentage: 25
          });

        if (enrollmentError) {
          console.error('⚠️  Enrollment creation failed:', enrollmentError);
        } else {
          console.log('✅ Student enrolled in course');
        }
      } else {
        console.log('⚠️  Student already enrolled, skipping...');
      }

      // Create sample review
      const { data: existingReview } = await supabase
        .from('course_reviews')
        .select('*')
        .eq('user_id', studentId)
        .eq('course_id', course.id)
        .single();

      if (!existingReview) {
        const { error: reviewError } = await supabase
          .from('course_reviews')
          .insert({
            course_id: course.id,
            user_id: studentId,
            rating: 5,
            review_text: 'Excellent course! Very informative and well-structured. The instructor explains concepts clearly.',
            is_approved: true,
            helpful_count: 3
          });

        if (reviewError) {
          console.error('⚠️  Review creation failed:', reviewError);
        } else {
          console.log('✅ Sample course review created');
        }
      } else {
        console.log('⚠️  Review already exists, skipping...');
      }
    }

    console.log();
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
    console.log('Created:');
    console.log('• 1 instructor user (instructor@example.com / Test1234!)');
    console.log('• 1 student user (student@example.com / Test1234!)');
    console.log('• 1 sample course (Introduction to Web Development)');
    console.log('• 1 course module (Getting Started)');
    console.log('• 1 lesson (What is HTML?)');
    console.log('• 1 course enrollment (student enrolled)');
    console.log('• 1 course review (5-star approved review)');
    console.log();
    console.log('✅ Seed OK');

  } catch (error) {
    console.error();
    console.error('💥 SEEDING FAILED:', error.message);
    console.error('Error details:', error);
    console.error();
    console.error('Possible causes:');
    console.error('1. Missing environment variables');
    console.error('2. Database tables not created (run npm run db:migrate first)');
    console.error('3. Incorrect service role key permissions');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };