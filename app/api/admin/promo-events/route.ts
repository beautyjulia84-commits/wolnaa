import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {supabase} from '@/lib/supabase';
export async function GET(req:NextRequest) {
  const headers={'Cache-Control':'private, no-store'};
  if(!isAdminRequest(req)) return NextResponse.json({error:'Bitte im Adminbereich anmelden.'},{status:401,headers});
  const {data,error}=await supabase.from('events').select('id,title,date').order('date',{ascending:false});
  return error ? NextResponse.json({error:'Events konnten nicht geladen werden.'},{status:503,headers}) : NextResponse.json({events:data},{headers});
}
