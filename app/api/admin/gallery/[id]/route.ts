import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { supabase } from '@/lib/supabase';

// DELETE /api/admin/gallery/[id] — remove a gallery project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await supabase.from('projects').delete().eq('id', parseInt(id));
  if (error) {
    return NextResponse.json({ error: 'Kunde inte ta bort projekt' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
