import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient'; // Ensure this path matches where you put the client

export async function GET(request: Request) {
  try {
    // 1. SELECT data from your specific table
    // Replace 'plans' with the exact name of your table in Supabase
    const { data, error } = await supabase
      .from('plans') 
      .select('*')         // '*' means select all columns. You can specify 'id, name, price' instead.
      .order('id', { ascending: true }); // Optional: sorts the results

    // 2. Handle Supabase errors
    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3. Return the data as JSON
    return NextResponse.json({ plans: data }, { status: 200 });

  } catch (err) {
    console.error('Unexpected Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}