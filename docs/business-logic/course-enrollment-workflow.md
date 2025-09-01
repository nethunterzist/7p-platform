# 🎯 Course Enrollment Workflow - İş Mantığı Dokümantasyonu

## 📋 Genel Bakış

7P Education platformunda kurs kayıt işlemlerinin detaylı iş mantığı ve workflow süreçleri.

## 🔄 Enrollment Süreci

### 1. Kurs Keşfi ve Seçimi
```typescript
// Kullanıcı kurs arama ve filtreleme
interface CourseDiscovery {
  searchCriteria: string;
  categoryFilter: string[];
  priceRange: { min: number; max: number };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // saat cinsinden
}
```

### 2. Kurs Detay İncelemesi
- **Syllabus görüntüleme**: Müfredat detayları
- **Instructor profili**: Eğitmen bilgileri
- **Student reviews**: Öğrenci değerlendirmeleri
- **Prerequisites**: Ön koşul kontrolü

### 3. Kayıt Uygunluk Kontrolü
```typescript
interface EnrollmentEligibility {
  userStatus: 'active' | 'suspended' | 'pending';
  courseCapacity: number;
  currentEnrollments: number;
  prerequisiteMet: boolean;
  paymentMethodValid: boolean;
}
```

## 💰 Ödeme Entegrasyonu

### Free Course Enrollment
```typescript
const enrollFreeCourse = async (userId: string, courseId: string) => {
  // Direkt kayıt işlemi
  return await createEnrollment({
    userId,
    courseId,
    enrollmentType: 'free',
    status: 'active',
    enrolledAt: new Date()
  });
};
```

### Paid Course Enrollment
```typescript
const enrollPaidCourse = async (userId: string, courseId: string, paymentIntentId: string) => {
  // Ödeme doğrulaması sonrası kayıt
  const paymentVerified = await verifyStripePayment(paymentIntentId);
  
  if (paymentVerified) {
    return await createEnrollment({
      userId,
      courseId,
      enrollmentType: 'paid',
      paymentIntentId,
      status: 'active',
      enrolledAt: new Date()
    });
  }
};
```

## 📊 Progress Tracking

### Enrollment States
- **pending**: Ödeme bekleniyor
- **active**: Aktif kayıt
- **completed**: Kurs tamamlandı
- **cancelled**: İptal edildi
- **refunded**: İade edildi

### Progress Calculation
```typescript
interface CourseProgress {
  enrollmentId: string;
  totalLessons: number;
  completedLessons: number;
  totalDuration: number; // dakika
  watchedDuration: number; // dakika
  quizScores: number[];
  assignments: {
    submitted: number;
    graded: number;
    avgScore: number;
  };
}
```

## 🎓 Completion Logic

### Certificate Generation Criteria
- **Minimum video watch**: %80 izlenme oranı
- **Quiz performance**: Ortalama %70 başarı
- **Assignment submission**: Tüm ödevlerin teslimi
- **Final assessment**: Geçer not (%60+)

### Graduation Process
```typescript
const checkGraduationEligibility = (progress: CourseProgress): boolean => {
  const videoCompletionRate = progress.watchedDuration / progress.totalDuration;
  const avgQuizScore = progress.quizScores.reduce((a, b) => a + b, 0) / progress.quizScores.length;
  
  return (
    videoCompletionRate >= 0.8 &&
    avgQuizScore >= 70 &&
    progress.assignments.submitted === progress.assignments.graded &&
    progress.assignments.avgScore >= 60
  );
};
```

## 🔄 Business Rules

### Enrollment Limitations
- **Concurrent enrollments**: Maksimum 10 aktif kurs
- **Re-enrollment**: 30 gün bekleme süresi (iptal sonrası)
- **Course capacity**: Kurs başına maksimum öğrenci sayısı
- **Prerequisites**: Zorunlu ön koşul kursları

### Refund Policy Logic
```typescript
interface RefundPolicy {
  eligibilityPeriod: number; // 14 gün
  progressLimit: number; // %25 ilerleme sınırı
  refundPercentage: number; // %100, %50, %0
}

const calculateRefundAmount = (enrollment: Enrollment): number => {
  const daysSinceEnrollment = getDaysDifference(enrollment.enrolledAt, new Date());
  const progressPercentage = enrollment.progress / 100;
  
  if (daysSinceEnrollment <= 7 && progressPercentage < 0.25) {
    return enrollment.paidAmount; // %100 iade
  } else if (daysSinceEnrollment <= 14 && progressPercentage < 0.50) {
    return enrollment.paidAmount * 0.5; // %50 iade
  }
  return 0; // İade yok
};
```

## 📈 Analytics & Reporting

### Key Metrics
- **Enrollment conversion rate**: Ziyaret → Kayıt oranı
- **Course completion rate**: Kayıt → Tamamlama oranı
- **Student satisfaction**: Ortalama kurs değerlendirmesi
- **Revenue per student**: Öğrenci başına gelir

### Automated Reporting
```typescript
interface EnrollmentMetrics {
  period: 'daily' | 'weekly' | 'monthly';
  totalEnrollments: number;
  freeEnrollments: number;
  paidEnrollments: number;
  completionRate: number;
  averageProgress: number;
  refundRate: number;
}
```

## 🚨 Error Handling

### Common Scenarios
- **Ödeme başarısızlığı**: Kullanıcıya bildirim + yeniden deneme
- **Kurs kapasitesi dolması**: Waiting list sistemi
- **Teknik hatalar**: Otomatik rollback + support ticket
- **Duplicate enrollment**: Mevcut kayıt kontrolü

### Recovery Mechanisms
```typescript
const handleEnrollmentFailure = async (error: EnrollmentError) => {
  switch (error.type) {
    case 'PAYMENT_FAILED':
      return await retryPayment(error.paymentIntentId);
    case 'COURSE_FULL':
      return await addToWaitingList(error.userId, error.courseId);
    case 'DUPLICATE_ENROLLMENT':
      return await redirectToExistingEnrollment(error.enrollmentId);
  }
};
```

---

*Bu dokümantasyon, 7P Education platformunun kurs kayıt süreçlerinin teknik ve iş mantığı detaylarını içermektedir.*