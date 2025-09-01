// Frontend payment service - no direct database access

export interface PaymentData {
  courseId: number;
  userId: number;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: number;
  transactionId?: string;
  error?: string;
}

export class PaymentService {
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  async getPaymentHistory(userId: number): Promise<any[]> {
    try {
      const response = await fetch(`/api/payments/history?userId=${userId}`);
      const result = await response.json();
      return result.payments || [];
    } catch (error) {
      console.error('Payment history error:', error);
      return [];
    }
  }

  async checkCourseAccess(userId: number, courseId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/courses/access?userId=${userId}&courseId=${courseId}`);
      const result = await response.json();
      return result.hasAccess || false;
    } catch (error) {
      console.error('Course access check error:', error);
      return false;
    }
  }

  async getUserCourses(userId: number): Promise<any[]> {
    try {
      const response = await fetch(`/api/courses/user?userId=${userId}`);
      const result = await response.json();
      return result.courses || [];
    } catch (error) {
      console.error('User courses error:', error);
      return [];
    }
  }
}

export const paymentService = new PaymentService();