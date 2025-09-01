# 💳 Payment Processing Logic - Ödeme İşlemleri İş Mantığı

## 🏗️ Genel Mimari

7P Education platformunda Stripe tabanlı ödeme işlemleri ve iş mantığı detayları.

## 💰 Ödeme Türleri

### 1. One-time Payments (Tek Seferlik)
```typescript
interface OneTimePayment {
  courseId: string;
  amount: number; // cents cinsinden
  currency: 'TRY' | 'USD' | 'EUR';
  paymentMethod: 'card' | 'bank_transfer';
  discountCode?: string;
}
```

### 2. Subscription Payments (Abonelik)
```typescript
interface SubscriptionPayment {
  planType: 'basic' | 'premium' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  trialPeriod: number; // gün cinsinden
  autoRenewal: boolean;
  priceId: string; // Stripe Price ID
}
```

## 🔄 Payment Flow

### Checkout Process
```typescript
const createCheckoutSession = async (paymentData: PaymentRequest) => {
  // 1. Kullanıcı doğrulaması
  const user = await validateUser(paymentData.userId);
  
  // 2. İndirim kodu kontrolü
  const discount = await validateDiscountCode(paymentData.discountCode);
  
  // 3. Final tutar hesaplama
  const finalAmount = calculateFinalAmount(paymentData.amount, discount);
  
  // 4. Stripe checkout session oluşturma
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: paymentData.currency,
        product_data: {
          name: paymentData.courseName,
        },
        unit_amount: finalAmount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.DOMAIN}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.DOMAIN}/payment/cancel`,
    metadata: {
      userId: paymentData.userId,
      courseId: paymentData.courseId,
      originalAmount: paymentData.amount.toString()
    }
  });
  
  return session;
};
```

### Payment Verification
```typescript
const verifyPayment = async (sessionId: string) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      // Ödeme başarılı - enrollment işlemi
      await processSuccessfulPayment(session);
      return { success: true, session };
    } else {
      // Ödeme başarısız
      await logFailedPayment(session);
      return { success: false, error: 'Payment not completed' };
    }
  } catch (error) {
    await handlePaymentError(error);
    throw error;
  }
};
```

## 💲 Pricing Logic

### Dynamic Pricing
```typescript
interface PricingRules {
  basePrices: {
    [courseId: string]: {
      TRY: number;
      USD: number;
      EUR: number;
    };
  };
  discountRules: DiscountRule[];
  taxRates: TaxRule[];
  currencyConversion: ExchangeRates;
}

const calculateCoursePrice = async (courseId: string, currency: string, userId?: string) => {
  const basePrice = await getBasePriceForCourse(courseId, currency);
  
  // Kullanıcıya özel indirimler
  const userDiscounts = userId ? await getUserDiscounts(userId) : [];
  
  // Kampanya indirimleri
  const activePromotions = await getActivePromotions(courseId);
  
  // En yüksek indirim oranını uygula
  const bestDiscount = Math.max(...userDiscounts, ...activePromotions);
  
  const discountedPrice = basePrice * (1 - bestDiscount / 100);
  
  // KDV hesaplama
  const taxRate = await getTaxRate(currency);
  const finalPrice = discountedPrice * (1 + taxRate / 100);
  
  return {
    basePrice,
    discount: bestDiscount,
    discountedPrice,
    taxRate,
    finalPrice: Math.round(finalPrice * 100) // cents
  };
};
```

### Bundle Pricing
```typescript
const calculateBundlePrice = (courseIds: string[]) => {
  const individualPrices = courseIds.map(id => getBasePriceForCourse(id));
  const totalIndividualPrice = individualPrices.reduce((sum, price) => sum + price, 0);
  
  // Bundle indirimi (örn: %20)
  const bundleDiscount = 0.20;
  const bundlePrice = totalIndividualPrice * (1 - bundleDiscount);
  
  return {
    individualTotal: totalIndividualPrice,
    bundlePrice,
    savings: totalIndividualPrice - bundlePrice,
    discountPercentage: bundleDiscount * 100
  };
};
```

## 🎟️ Discount & Coupon Logic

### Coupon Types
```typescript
interface CouponRule {
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usedCount: number;
  applicableCourses?: string[];
  userRestrictions?: string[];
}
```

### Discount Validation
```typescript
const validateDiscountCode = async (code: string, userId: string, courseId: string, amount: number) => {
  const coupon = await getCouponByCode(code);
  
  if (!coupon) {
    throw new Error('Geçersiz kupon kodu');
  }
  
  // Süre kontrolü
  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validUntil) {
    throw new Error('Kupon kodunun geçerlilik süresi dolmuş');
  }
  
  // Kullanım limiti kontrolü
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new Error('Kupon kullanım limiti aşılmış');
  }
  
  // Minimum tutar kontrolü
  if (coupon.minAmount && amount < coupon.minAmount) {
    throw new Error(`Minimum ${coupon.minAmount} TL alışveriş gerekli`);
  }
  
  // Kurs uygunluk kontrolü
  if (coupon.applicableCourses && !coupon.applicableCourses.includes(courseId)) {
    throw new Error('Bu kupon bu kurs için geçerli değil');
  }
  
  // Kullanıcı kısıtlaması kontrolü
  if (coupon.userRestrictions && !coupon.userRestrictions.includes(userId)) {
    throw new Error('Bu kupon sizin için geçerli değil');
  }
  
  return coupon;
};
```

## 🔄 Refund Logic

### Refund Policy
```typescript
interface RefundPolicy {
  standardRefundPeriod: 14; // gün
  partialRefundThreshold: 0.25; // %25 ilerleme
  noRefundThreshold: 0.75; // %75 ilerleme
}

const processRefund = async (enrollmentId: string, reason: string) => {
  const enrollment = await getEnrollment(enrollmentId);
  const courseProgress = await getCourseProgress(enrollmentId);
  
  // İade uygunluk kontrolü
  const refundEligibility = await checkRefundEligibility(enrollment, courseProgress);
  
  if (!refundEligibility.eligible) {
    throw new Error(refundEligibility.reason);
  }
  
  // İade tutarı hesaplama
  const refundAmount = calculateRefundAmount(enrollment, courseProgress);
  
  // Stripe üzerinden iade işlemi
  const refund = await stripe.refunds.create({
    payment_intent: enrollment.paymentIntentId,
    amount: refundAmount,
    reason: 'requested_by_customer',
    metadata: {
      enrollmentId: enrollmentId,
      refundReason: reason
    }
  });
  
  // Enrollment durumunu güncelle
  await updateEnrollmentStatus(enrollmentId, 'refunded');
  
  // Kullanıcıya bildirim gönder
  await sendRefundNotification(enrollment.userId, refundAmount);
  
  return refund;
};
```

## 📊 Payment Analytics

### Revenue Tracking
```typescript
interface RevenueMetrics {
  period: 'daily' | 'weekly' | 'monthly';
  totalRevenue: number;
  courseRevenue: { [courseId: string]: number };
  refundAmount: number;
  netRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
}

const generateRevenueReport = async (startDate: Date, endDate: Date) => {
  const payments = await getPaymentsByDateRange(startDate, endDate);
  const refunds = await getRefundsByDateRange(startDate, endDate);
  
  return {
    totalRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
    refundAmount: refunds.reduce((sum, refund) => sum + refund.amount, 0),
    transactionCount: payments.length,
    averageOrderValue: payments.reduce((sum, payment) => sum + payment.amount, 0) / payments.length,
    topCourses: await getTopSellingCourses(startDate, endDate),
    paymentMethods: await getPaymentMethodBreakdown(startDate, endDate)
  };
};
```

### Failed Payment Analysis
```typescript
const analyzeFailedPayments = async (period: string) => {
  const failedPayments = await getFailedPayments(period);
  
  const analysis = {
    totalFailed: failedPayments.length,
    failureReasons: groupBy(failedPayments, 'failure_reason'),
    affectedUsers: unique(failedPayments.map(p => p.userId)),
    lostRevenue: failedPayments.reduce((sum, payment) => sum + payment.amount, 0),
    recoveryOpportunities: await identifyRecoveryOpportunities(failedPayments)
  };
  
  return analysis;
};
```

## 🔐 Security Measures

### Fraud Detection
```typescript
const detectSuspiciousPayment = (paymentData: PaymentRequest) => {
  const riskFactors = [];
  
  // Yüksek miktar kontrolü
  if (paymentData.amount > 100000) { // 1000 TL üzeri
    riskFactors.push('HIGH_AMOUNT');
  }
  
  // Hızlı ardışık ödemeler
  const recentPayments = getUserRecentPayments(paymentData.userId, 24); // son 24 saat
  if (recentPayments.length > 5) {
    riskFactors.push('RAPID_PAYMENTS');
  }
  
  // Farklı ülkelerden ödemeler
  const userCountry = getUserCountry(paymentData.userId);
  const paymentCountry = getPaymentCountry(paymentData.paymentMethod);
  if (userCountry !== paymentCountry) {
    riskFactors.push('COUNTRY_MISMATCH');
  }
  
  return {
    riskScore: riskFactors.length * 0.3,
    riskFactors,
    requiresManualReview: riskFactors.length >= 2
  };
};
```

---

*Bu dokümantasyon, 7P Education platformunun ödeme işlemleri iş mantığı ve güvenlik önlemlerini detaylandırmaktadır.*