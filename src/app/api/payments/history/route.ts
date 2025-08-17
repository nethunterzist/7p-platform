import { mockApi } from '@/lib/mock-api';
import { NextRequest, NextResponse } from 'next/server';
import { getUserPaymentHistory } from '@/lib/payments';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const maxLimit = 50; // Security: limit maximum results

    // Get user's payment history
    const transactions = await getUserPaymentHistory(
      user.id, 
      Math.min(limit, maxLimit)
    );

    return NextResponse.json({
      transactions,
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}