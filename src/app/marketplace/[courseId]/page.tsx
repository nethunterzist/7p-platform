"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getCourseDetailBySlug,
  type CourseDetail,
  type Module,
  type Lesson
} from '@/data/courses';
import { 
  isUserEnrolledInCourse, 
  isUserLoggedIn,
  redirectToLogin,
  enrollUserInCourse
} from '@/lib/enrollment';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DashboardCard, DashboardSection } from '@/components/layout/DashboardContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle,
  Clock,
  Users,
  BookOpen,
  Star,
  Award,
  CheckCircle,
  Lock,
  ShoppingCart,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Shield,
  Globe,
  Download,
  Video,
  FileText,
  Heart,
  Share2,
  CreditCard,
  Zap,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';

export default function MarketplaceCourseDetailPage({ 
  params 
}: { 
  params: Promise<{ courseId: string }> 
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>('');
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setCourseId(resolvedParams.courseId);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);


  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if user is logged in
      if (!isUserLoggedIn()) {
        redirectToLogin(`/marketplace/${courseId}`);
        return;
      }

      // Get course details by slug (courseId is actually slug in this case)
      const courseData = getCourseDetailBySlug(courseId);
      if (!courseData) {
        throw new Error('Kurs bulunamadı');
      }

      setCourse(courseData);

    } catch (err: any) {
      console.error('Course fetch error:', err);
      setError(err.message || 'Kurs yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours?: number) => {
    if (!hours) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)}dk`;
    return `${Math.round(hours)}sa`;
  };

  const formatPrice = (price: number, currency: string = 'TRY') => {
    const symbol = currency === 'TRY' ? '₺' : '$';
    return `${symbol}${price.toLocaleString()}`;
  };

  const discountPercentage = course?.original_price 
    ? Math.round(((course.original_price - course.price) / course.original_price) * 100)
    : 0;

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating) 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">{rating}</span>
      </div>
    );
  };

  const handlePurchase = async () => {
    if (!course) return;

    try {
      setPurchaseLoading(true);

      // Check if already enrolled
      if (isUserEnrolledInCourse(course.id)) {
        toast.success('Bu kursa zaten kayıtlısınız! Kurslarım sayfasına yönlendiriliyor...');
        setTimeout(() => {
          router.push(`/courses/${course.slug}`);
        }, 1500);
        return;
      }

      // Show purchase process steps
      if (!course.is_free) {
        toast.loading('Ödeme işlemi başlatılıyor...', {
          duration: 1500,
          position: 'top-center'
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        toast.loading('Ödeme doğrulanıyor...', {
          duration: 1000,
          position: 'top-center'
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Enroll user in course
      const enrollmentSuccess = await enrollUserInCourse(course.id);
      
      if (enrollmentSuccess) {
        toast.success('🎉 Kurs başarıyla satın alındı! Kurslarım sayfasına yönlendiriliyor...', {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
            fontWeight: '500',
          },
        });
        
        // Show success animation and redirect
        setTimeout(() => {
          router.push(`/courses/${course.slug}`);
        }, 2000);
      } else {
        throw new Error('Kayıt işlemi başarısız');
      }

    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Satın alma işlemi başarısız. Lütfen tekrar deneyin.', {
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
    } finally {
      setPurchaseLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Kurs yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  };

  if (error || !course) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kurs Bulunamadı</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button asChild>
              <Link href="/marketplace">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Mağazaya Dön
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isEnrolled = isUserEnrolledInCourse(course.id);

  return (
    <DashboardLayout
    >
      {/* Main Container - Two Column Layout */}
      <div className="relative">
        {/* Course Header - Hero Section */}
        <div ref={heroRef} className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl text-white p-8 mb-8 relative overflow-visible">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Info - Left Column */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                {course.is_featured && (
                  <Badge className="bg-orange-500 text-white">
                    <Award className="h-3 w-3 mr-1" />
                    Öne Çıkan
                  </Badge>
                )}
                {course.is_free && (
                  <Badge className="bg-green-500 text-white">
                    ÜCRETSİZ
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              
              {/* Course Description - Moved from below */}
              <div className="mb-6">
                <p className="text-lg text-blue-100 leading-relaxed">
                  {course.description}
                </p>
              </div>

              {/* Course Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-xl font-bold mb-1">{course.total_students?.toLocaleString()}</div>
                  <div className="text-sm text-blue-200">Öğrenci</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold mb-1">{formatDuration(course.duration_hours)}</div>
                  <div className="text-sm text-blue-200">Süre</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold mb-1">{course.total_lessons}</div>
                  <div className="text-sm text-blue-200">Ders</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold mb-1">{course.rating}/5</div>
                  <div className="text-sm text-blue-200">Puan</div>
                </div>
              </div>

            </div>

            {/* Purchase Card - Right Column - Extends Beyond Hero */}
            <div className="lg:col-span-1 relative">
              <div 
                ref={cardRef}
                className="lg:absolute lg:top-0 lg:right-0 lg:w-full lg:z-10"
              >
                {/* Main Purchase Card - Extends Outside Hero */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="p-6">
                    {/* Video Preview */}
                    <div 
                      className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl mb-6 relative overflow-hidden group cursor-pointer"
                      onClick={() => {
                        // Find the first preview lesson in the course
                        const firstModule = course.modules?.find(module => 
                          module.lessons.some(lesson => lesson.is_preview)
                        );
                        
                        const firstPreviewLesson = firstModule?.lessons.find(lesson => lesson.is_preview);
                        
                        if (firstPreviewLesson && firstModule) {
                          // Navigate to the lesson page for preview
                          router.push(`/courses/${course.slug}/modules/${firstModule.id}/lessons/${firstPreviewLesson.id}`);
                        } else {
                          toast.info('Bu kurs için önizleme dersi bulunmuyor.');
                        }
                      }}
                    >
                      {course.thumbnail_url ? (
                        <>
                          <img 
                            src={course.thumbnail_url} 
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                            <div className="bg-white bg-opacity-90 rounded-full p-4 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                              <PlayCircle className="h-12 w-12 text-blue-600" />
                            </div>
                          </div>
                          <div className="absolute bottom-3 left-3">
                            <Badge className="bg-blue-600 text-white text-xs">
                              Önizleme
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <PlayCircle className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Ön İzleme Videosu</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price Section */}
                    <div className="text-center mb-6">
                      {course.is_free ? (
                        <div className="text-4xl font-bold text-green-600 mb-2">
                          ÜCRETSİZ
                        </div>
                      ) : (
                        <div>
                          <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
                            {formatPrice(course.price, course.currency)}
                          </div>
                          {course.original_price && course.original_price > course.price && (
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                                {formatPrice(course.original_price, course.currency)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-300">Tek seferlik ödeme</p>
                    </div>

                    {/* Purchase Button */}
                    {isEnrolled ? (
                      <Button asChild className="w-full mb-6 h-12 text-base bg-green-600 hover:bg-green-700 rounded-xl">
                        <Link href={`/courses/${course.slug}`}>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Kursa Git
                        </Link>
                      </Button>
                    ) : (
                      <Button 
                        onClick={handlePurchase}
                        disabled={purchaseLoading}
                        className="w-full mb-6 h-12 text-base bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {purchaseLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            İşleniyor...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            {course.is_free ? 'Ücretsiz Al' : 'Şimdi Satın Al'}
                          </>
                        )}
                      </Button>
                    )}

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Course Content Preview */}
      <div className="pt-24">
        <DashboardSection title="Kurs İçeriği" description="Dersler ve modüller (Önizleme)">
        <div className="space-y-4">
          {course.modules?.map((module, moduleIndex) => (
            <MarketplaceModuleAccordion
              key={module.id}
              module={module}
              moduleIndex={moduleIndex}
              isEnrolled={isEnrolled}
              courseSlug={course.slug}
            />
          ))}
        </div>
        </DashboardSection>
      </div>

      <Toaster />
    </DashboardLayout>
  );
}

// Marketplace Module Accordion Component (Locked content for non-enrolled users)
interface MarketplaceModuleAccordionProps {
  module: Module;
  moduleIndex: number;
  isEnrolled: boolean;
  courseSlug: string;
}

function MarketplaceModuleAccordion({ 
  module, 
  moduleIndex, 
  isEnrolled,
  courseSlug 
}: MarketplaceModuleAccordionProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(moduleIndex === 0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLessonClick = (lesson: Lesson) => {
    const isPreview = lesson.is_preview;
    const canAccess = isEnrolled || isPreview;
    
    if (canAccess) {
      router.push(`/courses/${courseSlug}/modules/${module.id}/lessons/${lesson.id}`);
    } else {
      toast.info('Bu derse erişim için kursa kayıt olmanız gerekiyor.');
    }
  };

  // Count video lessons only (exclude quiz lessons)
  const videoLessons = module.lessons.filter(lesson => lesson.type !== 'quiz');
  const previewLessons = videoLessons.filter(lesson => lesson.is_preview);

  return (
    <DashboardCard>
      {/* Module Header */}
      <button
        onClick={toggleExpanded}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center space-x-4 flex-1">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm">
            {moduleIndex + 1}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{module.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{module.description}</p>
            <div className="flex items-center space-x-4 mt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {videoLessons.length} ders
              </div>
              {!isEnrolled && previewLessons.length > 0 && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {previewLessons.length} önizleme dersi
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Lessons List */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="py-2">
            {module.lessons.filter(lesson => lesson.type !== 'quiz').map((lesson) => {
              const isPreview = lesson.is_preview;
              const canAccess = isEnrolled || isPreview;
              
              return (
                <div
                  key={lesson.id}
                  onClick={() => handleLessonClick(lesson)}
                  className={`flex items-center justify-between py-3 px-6 ${
                    canAccess ? 'hover:bg-white dark:hover:bg-gray-600 transition-colors cursor-pointer' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {lesson.order_index}
                    </div>
                    <div className="flex items-center space-x-2">
                      {canAccess ? (
                        <PlayCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={`text-sm ${canAccess ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {lesson.title}
                      </span>
                      {isPreview && (
                        <Badge variant="outline" className="text-xs">
                          Önizleme
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {lesson.duration}
                    </span>
                    {!canAccess && (
                      <Lock className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
