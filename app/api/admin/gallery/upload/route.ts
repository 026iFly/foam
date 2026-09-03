import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import { supabase } from '@/lib/supabase';

// POST /api/admin/gallery/upload
// Body: { dataUrl: "data:image/jpeg;base64,..." }  (already web-optimized client-side)
// Stores the image in the public 'gallery' bucket and returns its public URL.
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { dataUrl } = await request.json();
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Ogiltig bild' }, { status: 400 });
    }

    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Bildformat stöds inte (jpeg/png/webp)' }, { status: 400 });
    }
    const contentType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Bilden är för stor (max 10 MB efter optimering)' }, { status: 400 });
    }

    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `projects/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage.from('gallery').upload(path, buffer, {
      contentType,
      upsert: false,
      cacheControl: '31536000',
    });
    if (error) {
      console.error('Gallery upload error:', error);
      return NextResponse.json({ error: 'Kunde inte ladda upp bilden' }, { status: 500 });
    }

    const { data } = supabase.storage.from('gallery').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (err) {
    console.error('Gallery upload error:', err);
    return NextResponse.json({ error: 'Serverfel vid uppladdning' }, { status: 500 });
  }
}
