import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, updateUserProfile } from '@/lib/supabase-auth';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// GET: Get current user profile
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Inte inloggad' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Kunde inte hämta profil' },
      { status: 500 }
    );
  }
}

// PUT: Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Inte inloggad' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phone, currentPassword, newPassword } = body;

    // Update profile fields
    const updates: any = {};
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;

    if (Object.keys(updates).length > 0) {
      const updatedProfile = await updateUserProfile(user.id, updates);
      if (!updatedProfile) {
        return NextResponse.json(
          { error: 'Kunde inte uppdatera profil' },
          { status: 500 }
        );
      }
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Nuvarande lösenord krävs' },
          { status: 400 }
        );
      }

      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        }
      );

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return NextResponse.json(
          { error: 'Felaktigt nuvarande lösenord' },
          { status: 400 }
        );
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return NextResponse.json(
          { error: 'Kunde inte ändra lösenord: ' + updateError.message },
          { status: 500 }
        );
      }
    }

    // Fetch updated user
    const updatedUser = await getCurrentUser();

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        profile: updatedUser?.profile,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Kunde inte uppdatera profil' },
      { status: 500 }
    );
  }
}
