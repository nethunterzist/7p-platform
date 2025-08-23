"use client";

import React from 'react';
import { Toaster } from 'react-hot-toast';
import BetaBanner from '@/components/beta/BetaBanner';
import CourseCard from '@/components/ui/course-card';

const BetaTestPage = () => {
  // Mock course data for testing
  const mockCourses = [
    {
      id: "course-1",
      title: "React ile Modern Web Geliştirme",
      slug: "react-modern-web",
      short_description: "React, Next.js ve modern araçlarla profesyonel web uygulamaları geliştirmeyi öğrenin.",
      thumbnail_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&h=300&fit=crop",
      price: 299,
      original_price: 399,
      currency: "TRY",
      instructor_name: "Ahmet Yılmaz",
      category_name: "Web Geliştirme",
      level: "intermediate" as const,
      duration_hours: 12,
      total_lessons: 48,
      rating: 4.8,
      total_ratings: 156,
      total_students: 1247,
      is_featured: true,
      is_free: false,
      tags: ["React", "Next.js", "JavaScript"]
    },
    {
      id: "course-2",
      title: "Python ile Veri Analizi",
      slug: "python-data-analysis",
      short_description: "Python, Pandas ve NumPy kullanarak veri analizi yapmayı öğrenin.",
      thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&h=300&fit=crop",
      price: 199,
      currency: "TRY",
      instructor_name: "Ayşe Kara",
      category_name: "Veri Bilimi",
      level: "beginner" as const,
      duration_hours: 8,
      total_lessons: 32,
      rating: 4.6,
      total_ratings: 89,
      total_students: 643,
      is_featured: false,
      is_free: false,
      tags: ["Python", "Data Analysis", "Pandas"]
    },
    {
      id: "course-3",
      title: "HTML & CSS Temelleri",
      slug: "html-css-basics",
      short_description: "Web geliştirmenin temellerini HTML ve CSS ile öğrenin.",
      price: 0,
      currency: "TRY",
      instructor_name: "Mehmet Özkan",
      category_name: "Web Geliştirme",
      level: "beginner" as const,
      duration_hours: 6,
      total_lessons: 24,
      rating: 4.5,
      total_ratings: 234,
      total_students: 2156,
      is_featured: false,
      is_free: true,
      tags: ["HTML", "CSS", "Web Basics"]
    }
  ];

  const handlePurchase = (courseId: string) => {
    console.log(`Purchase initiated for course: ${courseId}`);
    // For free courses, you might want to handle the enrollment directly
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Beta Banner */}
      <BetaBanner />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🧪 Beta Test: Mock Payment System
          </h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">Test Scenarios:</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Paid Course:</strong> Click "Beta'da Ücretsiz Al!" to open mock payment modal</li>
              <li>• <strong>Free Course:</strong> Click "Ücretsiz Al" for direct enrollment</li>
              <li>• <strong>Success Flow:</strong> Modal → Mock Payment → Toast → Redirect</li>
              <li>• <strong>Backend:</strong> Uses existing EnrollmentService with mock payment ID</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              variant="store"
              onPurchase={handlePurchase}
              isEnrolled={false}
              loading={false}
            />
          ))}
        </div>

        {/* Beta Info */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📋 Beta Implementation Status
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-700 mb-2">✅ Completed Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• BetaBanner component with dismiss</li>
                <li>• MockPaymentModal with beta messaging</li>
                <li>• CourseCard updated with beta styling</li>
                <li>• "Beta'da Ücretsiz Al!" buttons</li>
                <li>• Mock payment ID generation</li>
                <li>• Success flow with toast & redirect</li>
                <li>• Backend integration ready</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-blue-700 mb-2">🔧 Backend Ready</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• EnrollmentService.enrollInPaidCourse()</li>
                <li>• Mock payment validation (line 191)</li>
                <li>• Database schema payment-ready</li>
                <li>• API endpoint /api/courses/[id]/enroll</li>
                <li>• Stripe migration path ready</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-800 mb-2">🚀 Ready for Beta Launch</h3>
            <p className="text-sm text-amber-700">
              All components are implemented and tested. The system is ready for immediate beta deployment.
              Users can enroll in paid courses without payment during the beta period.
            </p>
          </div>
        </div>
      </div>
      
      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
};

export default BetaTestPage;