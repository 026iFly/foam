import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  getUserById,
  updateUserProfile,
  deleteUser,
  sendPasswordReset,
  setUserPassword,
} from '@/lib/supabase-auth';

// GET: Get user by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'Användare hittades inte' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Kunde inte hämta användare' },
      { status: 500 }
    );
  }
}

// PUT: Update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, phone, email, newPassword, sendResetEmail, installer_type } = body;

    // Update profile fields
    const updates: any = {};
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (installer_type !== undefined) updates.installer_type = installer_type;

    if (Object.keys(updates).length > 0) {
      const updatedUser = await updateUserProfile(id, updates);
      if (!updatedUser) {
        return NextResponse.json(
          { error: 'Kunde inte uppdatera användare' },
          { status: 500 }
        );
      }
    }

    // Handle password reset
    if (sendResetEmail) {
      const user = await getUserById(id);
      if (user?.email) {
        const sent = await sendPasswordReset(user.email);
        if (!sent) {
          return NextResponse.json(
            { error: 'Kunde inte skicka återställningslänk' },
            { status: 500 }
          );
        }
      }
    }

    // Set password directly
    if (newPassword) {
      const success = await setUserPassword(id, newPassword);
      if (!success) {
        return NextResponse.json(
          { error: 'Kunde inte ändra lösenord' },
          { status: 500 }
        );
      }
    }

    const user = await getUserById(id);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Kunde inte uppdatera användare' },
      { status: 500 }
    );
  }
}

// DELETE: Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'Du kan inte ta bort ditt eget konto' },
        { status: 400 }
      );
    }

    const success = await deleteUser(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Kunde inte ta bort användare' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Kunde inte ta bort användare' },
      { status: 500 }
    );
  }
}
