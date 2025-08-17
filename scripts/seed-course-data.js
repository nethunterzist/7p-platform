#!/usr/bin/env node

/**
 * Seed Course Data Script
 * This script populates the course system with sample data
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample course data
const sampleCourses = [
    {
        id: 'full-mentoring',
        title: 'Full Mentorluk Programı',
        slug: 'full-mentorluk-programi',
        description: 'Kapsamlı mentorluk süreciyle kişisel ve profesyonel gelişiminizi tamamlayın. İş hayatında başarıya ulaşmak için gereken tüm becerileri kazanın.',
        short_description: '6 ay süren kapsamlı mentorluk programı ile kariyerinizi geliştirin',
        price: 2999.00,
        original_price: 3999.00,
        level: 'intermediate',
        duration_hours: 48.0,
        what_you_learn: [
            'Kişisel gelişim ve öz farkındalık teknikleri',
            'Etkili iletişim becerileri',
            'Liderlik ve takım yönetimi',
            'Zaman yönetimi ve verimlilik',
            'Kariyer planlama stratejileri',
            'Finansal okuryazarlık',
            'Networking ve ilişki kurma',
            'Problem çözme teknikleri',
            'Stres yönetimi',
            'Hedef belirleme ve motivasyon',
            'Sunum becerileri',
            'Girişimcilik temelleri'
        ],
        requirements: [
            'Kişisel gelişim konusunda istekli olmak',
            'Haftalık 4-6 saat ayırabilmek',
            'Interaktif katılım sağlayabilmek'
        ],
        target_audience: [
            'Kariyerinde yükselme hedefi olan profesyoneller',
            'Kişisel gelişim arayan bireyler',
            'Yöneticilik pozisyonuna hazırlananlar',
            'Girişimcilik hedefi olan kişiler'
        ],
        is_published: true,
        is_featured: true,
        published_at: new Date().toISOString(),
        status: 'published',
        tags: ['mentorluk', 'kişisel-gelişim', 'kariyer', 'liderlik'],
        modules: [
            {
                title: 'Kişisel Gelişim Temelleri',
                description: 'Öz farkındalık ve kişisel değerlerin keşfi',
                order_index: 1,
                duration_hours: 8.0,
                lessons: [
                    {
                        title: 'Öz Farkındalık ve Kişisel Değerler',
                        description: 'Kendinizi tanıma ve değerlerinizi keşfetme süreci',
                        order_index: 1,
                        lesson_type: 'video',
                        video_duration: 1800,
                        is_preview: true
                    },
                    {
                        title: 'Güçlü ve Zayıf Yönlerin Analizi',
                        description: 'SWOT analizi ile kişisel güçlü-zayıf yönlerin belirlenmesi',
                        order_index: 2,
                        lesson_type: 'video',
                        video_duration: 2100
                    },
                    {
                        title: 'Kişisel Vizyon ve Misyon Geliştirme',
                        description: 'Yaşam vizyonunuzu ve misyonunuzu oluşturma',
                        order_index: 3,
                        lesson_type: 'assignment',
                        video_duration: 1500
                    }
                ]
            },
            {
                title: 'İletişim ve İlişki Becerileri',
                description: 'Etkili iletişim ve güçlü ilişkiler kurma',
                order_index: 2,
                duration_hours: 10.0,
                lessons: [
                    {
                        title: 'Etkili İletişim Temelleri',
                        description: 'İletişimde temel prensipler ve dinleme becerileri',
                        order_index: 1,
                        lesson_type: 'video',
                        video_duration: 1900
                    },
                    {
                        title: 'Empati ve Duygusal Zeka',
                        description: 'Duygusal zekanızı geliştirme ve empati kurma',
                        order_index: 2,
                        lesson_type: 'video',
                        video_duration: 2000
                    }
                ]
            }
        ]
    },
    {
        id: 'ppc-training',
        title: 'PPC Reklam Uzmanlığı',
        slug: 'ppc-reklam-uzmanligi',
        description: 'Google Ads, Facebook Ads ve diğer platformlarda profesyonel PPC kampanyaları yönetmeyi öğrenin. Reklam bütçenizi en verimli şekilde kullanın.',
        short_description: 'Google Ads ve Facebook Ads ile profesyonel PPC kampanya yönetimi',
        price: 1799.00,
        original_price: 2299.00,
        level: 'beginner',
        duration_hours: 32.0,
        what_you_learn: [
            'Google Ads kampanya kurulumu ve yönetimi',
            'Facebook Ads stratejileri',
            'Anahtar kelime araştırması teknikleri',
            'Reklam metni yazma sanatı',
            'Landing page optimizasyonu',
            'Bütçe yönetimi ve teklif stratejileri',
            'Performans analizi ve optimizasyon',
            'Remarketing kampanyaları'
        ],
        requirements: [
            'Temel internet kullanım bilgisi',
            'Dijital pazarlama konusunda merak',
            'Haftalık 3-4 saat zaman ayırabilmek'
        ],
        target_audience: [
            'Dijital pazarlama öğrenmek isteyenler',
            'İşletme sahipleri',
            'Pazarlama profesyonelleri',
            'Freelance çalışmak isteyenler'
        ],
        is_published: true,
        published_at: new Date().toISOString(),
        status: 'published',
        tags: ['ppc', 'google-ads', 'facebook-ads', 'dijital-pazarlama']
    },
    {
        id: 'product-research',
        title: 'Ürün Araştırması Uzmanlığı',
        slug: 'urun-arastirmasi-uzmanligi',
        description: 'E-ticaret dünyasında başarılı ürünler keşfedin. Pazar analizi, trend takibi ve karlı ürün bulma tekniklerinde uzmanlaşın.',
        short_description: 'E-ticaret için ürün araştırması ve pazar analizi teknikleri',
        price: 1299.00,
        original_price: 1799.00,
        level: 'beginner',
        duration_hours: 24.0,
        what_you_learn: [
            'Ürün araştırması metodolojileri',
            'Pazar analizi teknikleri',
            'Trend takibi ve fırsat analizi',
            'Rakip analizi ve pozisyonlama',
            'Karlılık hesaplamaları',
            'Ürün doğrulama yöntemleri'
        ],
        requirements: [
            'E-ticaret konusunda temel bilgi',
            'Analitik düşünme yetisi',
            'Excel/Google Sheets kullanım bilgisi'
        ],
        target_audience: [
            'E-ticaret girişimcileri',
            'Amazon FBA satıcıları',
            'Online mağaza sahipleri',
            'Ürün yöneticileri'
        ],
        is_published: true,
        published_at: new Date().toISOString(),
        status: 'published',
        tags: ['e-ticaret', 'ürün-araştırması', 'pazar-analizi', 'amazon']
    }
];

async function seedCourseData() {
    try {
        console.log('🌱 Seeding course data...');
        
        // Get instructor ID
        const { data: instructors } = await supabase
            .from('instructors')
            .select('id')
            .limit(1);
        
        if (!instructors || instructors.length === 0) {
            throw new Error('No instructors found. Please run the schema migration first.');
        }
        
        const instructorId = instructors[0].id;
        
        // Get category IDs
        const { data: categories } = await supabase
            .from('course_categories')
            .select('id, slug');
        
        const categoryMap = {};
        categories?.forEach(cat => {
            categoryMap[cat.slug] = cat.id;
        });
        
        // Insert courses
        for (const courseData of sampleCourses) {
            console.log(`📚 Creating course: ${courseData.title}`);
            
            // Determine category
            let categoryId = null;
            if (courseData.id === 'full-mentoring') {
                categoryId = categoryMap['mentorluk'];
            } else if (courseData.id === 'ppc-training') {
                categoryId = categoryMap['dijital-pazarlama'];
            } else if (courseData.id === 'product-research') {
                categoryId = categoryMap['e-ticaret'];
            }
            
            // Insert course
            const { data: course, error: courseError } = await supabase
                .from('courses')
                .upsert({
                    title: courseData.title,
                    slug: courseData.slug,
                    description: courseData.description,
                    short_description: courseData.short_description,
                    price: courseData.price,
                    original_price: courseData.original_price,
                    instructor_id: instructorId,
                    category_id: categoryId,
                    level: courseData.level,
                    duration_hours: courseData.duration_hours,
                    what_you_learn: courseData.what_you_learn,
                    requirements: courseData.requirements,
                    target_audience: courseData.target_audience,
                    is_published: courseData.is_published,
                    is_featured: courseData.is_featured,
                    published_at: courseData.published_at,
                    status: courseData.status,
                    tags: courseData.tags,
                    total_lessons: courseData.modules?.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0) || 0
                })
                .select();
            
            if (courseError) {
                console.error(`❌ Error creating course ${courseData.title}:`, courseError);
                continue;
            }
            
            // Insert modules and lessons if provided
            if (courseData.modules && course && course.length > 0) {
                const courseId = course[0].id;
                
                for (const moduleData of courseData.modules) {
                    console.log(`  📁 Creating module: ${moduleData.title}`);
                    
                    const { data: module, error: moduleError } = await supabase
                        .from('course_modules')
                        .upsert({
                            course_id: courseId,
                            title: moduleData.title,
                            description: moduleData.description,
                            order_index: moduleData.order_index,
                            duration_hours: moduleData.duration_hours
                        })
                        .select();
                    
                    if (moduleError) {
                        console.error(`❌ Error creating module:`, moduleError);
                        continue;
                    }
                    
                    const moduleId = module[0].id;
                    
                    // Insert lessons
                    if (moduleData.lessons) {
                        for (const lessonData of moduleData.lessons) {
                            console.log(`    📝 Creating lesson: ${lessonData.title}`);
                            
                            const { error: lessonError } = await supabase
                                .from('course_lessons')
                                .upsert({
                                    module_id: moduleId,
                                    course_id: courseId,
                                    title: lessonData.title,
                                    slug: `${courseData.slug}-${moduleData.order_index}-${lessonData.order_index}`,
                                    description: lessonData.description,
                                    lesson_type: lessonData.lesson_type,
                                    order_index: lessonData.order_index,
                                    video_duration: lessonData.video_duration,
                                    is_preview: lessonData.is_preview || false
                                });
                            
                            if (lessonError) {
                                console.error(`❌ Error creating lesson:`, lessonError);
                            }
                        }
                    }
                }
            }
            
            console.log(`✅ Course "${courseData.title}" created successfully`);
        }
        
        console.log('🎉 Course data seeding completed successfully!');
        console.log('');
        console.log('Sample data created:');
        console.log('- 3 courses (Full Mentorluk, PPC Uzmanlığı, Ürün Araştırması)');
        console.log('- Course modules and lessons');
        console.log('- Course categories');
        console.log('- Instructor profiles');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

// Run the seeding
if (require.main === module) {
    seedCourseData();
}

module.exports = { seedCourseData };
