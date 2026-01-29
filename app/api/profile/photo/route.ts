import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, updateUserProfile, createSupabaseAdminClient } from '@/lib/supabase-auth';

// POST: Upload profile photo
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Inte inloggad' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Ingen fil vald' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Endast bilder tillåtna (JPEG, PNG, GIF, WebP)' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Filen är för stor (max 5MB)' },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/profile.${ext}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await adminClient.storage
      .from('profile-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Kunde inte ladda upp bild: ' + uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update user profile with photo URL
    const updated = await updateUserProfile(user.id, {
      profile_photo_url: publicUrl,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Kunde inte uppdatera profil' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: 'Kunde inte ladda upp bild' },
      { status: 500 }
    );
  }
}

// DELETE: Remove profile photo
export async function DELETE() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Inte inloggad' },
        { status: 401 }
      );
    }

    if (!user.profile?.profile_photo_url) {
      return NextResponse.json(
        { error: 'Ingen profilbild att ta bort' },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // Delete from storage
    const { error: deleteError } = await adminClient.storage
      .from('profile-photos')
      .remove([`${user.id}/profile.jpg`, `${user.id}/profile.png`, `${user.id}/profile.gif`, `${user.id}/profile.webp`]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      // Continue anyway to update profile
    }

    // Update user profile to remove photo URL
    await updateUserProfile(user.id, {
      profile_photo_url: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { error: 'Kunde inte ta bort bild' },
      { status: 500 }
    );
  }
}
