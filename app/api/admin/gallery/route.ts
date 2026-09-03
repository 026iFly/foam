import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { supabase } from '@/lib/supabase';

// GET /api/admin/gallery — list all gallery projects
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: 'Kunde inte hämta projekt' }, { status: 500 });
  }
  return NextResponse.json({ projects: data || [] });
}

// POST /api/admin/gallery — create a gallery project
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Titel krävs' }, { status: 400 });
    }
    const row = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      location: body.location?.trim() || null,
      project_type: body.project_type?.trim() || null,
      image_url: body.image_url || body.after_image_url || null,
      before_image_url: body.before_image_url || null,
      after_image_url: body.after_image_url || null,
      area_size: body.area_size ? Number(body.area_size) : null,
      completion_date: body.completion_date || null,
    };
    const { data, error } = await supabase.from('projects').insert(row).select().single();
    if (error) {
      console.error('Gallery create error:', error);
      return NextResponse.json({ error: 'Kunde inte spara projekt' }, { status: 500 });
    }
    return NextResponse.json({ success: true, project: data });
  } catch (err) {
    console.error('Gallery create error:', err);
    return NextResponse.json({ error: 'Serverfel' }, { status: 500 });
  }
}
