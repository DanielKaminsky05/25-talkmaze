import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; // Import your specific client
import { cookies } from 'next/headers';
export async function GET(request: Request) {
  const supabase = await createClient();
  try {
    // 1. Get the user_id from the URL search params
    // Example usage: /api/me/payments?user_id=user_123
    const cookieStore = cookies()
    const userId = (await cookieStore).get('account_id')

    // 2. Validate that we actually got an ID
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required in the URL (e.g. ?user_id=...)' }, 
        { status: 400 }
      );
    }

    // 3. Query the 'payments' table in Supabase
    const { data: payments, error } = await supabase
      .from('student_subscriptions')          // Double-check your table name in Supabase!
      .select('*')
      .eq('user_id', userId)      // Filter by the ID we got from the URL
      .order('created_at', { ascending: false }); // Optional: Show newest first

    // 4. Handle Database Errors
    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Return the data
    return NextResponse.json({ payments }, { status: 200 });

  } catch (err) {
    console.error('Server Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}