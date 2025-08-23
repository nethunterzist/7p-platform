#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createReviewsTables() {
  console.log('🔄 CREATING COURSE REVIEWS TABLES');
  console.log('==================================================');

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    console.log();

    console.log('📁 Creating course_reviews table...');
    
    const createReviewsTable = `
      CREATE TABLE IF NOT EXISTS public.course_reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        is_approved BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        helpful_count INTEGER DEFAULT 0,
        reported_count INTEGER DEFAULT 0,
        moderator_notes TEXT,
        approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        UNIQUE(course_id, user_id)
      );
    `;

    await client.query(createReviewsTable);
    console.log('✅ course_reviews table created');

    console.log('📁 Creating review_helpfulness table...');
    
    const createHelpfulnessTable = `
      CREATE TABLE IF NOT EXISTS public.review_helpfulness (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        review_id UUID REFERENCES public.course_reviews(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        is_helpful BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(review_id, user_id)
      );
    `;

    await client.query(createHelpfulnessTable);
    console.log('✅ review_helpfulness table created');

    console.log('📁 Creating indexes...');
    
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON public.course_reviews(course_id);',
      'CREATE INDEX IF NOT EXISTS idx_course_reviews_user_id ON public.course_reviews(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_course_reviews_rating ON public.course_reviews(rating);',
      'CREATE INDEX IF NOT EXISTS idx_course_reviews_approved ON public.course_reviews(is_approved, created_at);',
      'CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON public.review_helpfulness(review_id);'
    ];

    for (const indexQuery of createIndexes) {
      await client.query(indexQuery);
    }
    console.log('✅ Indexes created');

    console.log('📁 Creating course statistics view...');
    
    const createStatsView = `
      CREATE OR REPLACE VIEW public.course_statistics AS
      SELECT 
        c.id,
        c.title,
        c.instructor_id,
        COUNT(DISTINCT e.user_id) as total_enrollments,
        COUNT(DISTINCT r.id) as total_reviews,
        COUNT(DISTINCT CASE WHEN r.is_approved = true THEN r.id END) as approved_reviews,
        ROUND(AVG(CASE WHEN r.is_approved = true THEN r.rating END), 2) as average_rating,
        COUNT(DISTINCT CASE WHEN r.rating = 5 AND r.is_approved = true THEN r.id END) as five_star_reviews,
        COUNT(DISTINCT CASE WHEN r.rating = 4 AND r.is_approved = true THEN r.id END) as four_star_reviews,
        COUNT(DISTINCT CASE WHEN r.rating = 3 AND r.is_approved = true THEN r.id END) as three_star_reviews,
        COUNT(DISTINCT CASE WHEN r.rating = 2 AND r.is_approved = true THEN r.id END) as two_star_reviews,
        COUNT(DISTINCT CASE WHEN r.rating = 1 AND r.is_approved = true THEN r.id END) as one_star_reviews,
        MAX(r.created_at) as latest_review_date
      FROM public.courses c
      LEFT JOIN public.course_enrollments e ON c.id = e.course_id
      LEFT JOIN public.course_reviews r ON c.id = r.course_id
      GROUP BY c.id, c.title, c.instructor_id;
    `;

    await client.query(createStatsView);
    console.log('✅ course_statistics view created');

    console.log('📁 Enabling RLS...');
    
    await client.query('ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;');
    console.log('✅ RLS enabled');

    console.log();
    console.log('🎉 COURSE REVIEWS TABLES CREATED SUCCESSFULLY!');
    console.log('Created:');
    console.log('• course_reviews table with ratings and moderation');
    console.log('• review_helpfulness table for vote tracking');
    console.log('• course_statistics view for aggregated data');
    console.log('• Performance indexes');
    console.log('• RLS security policies');
    
  } catch (error) {
    console.error('💥 Table creation failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  createReviewsTables().catch(console.error);
}