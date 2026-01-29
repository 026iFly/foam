import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getAllUsers, inviteUser, isAdmin } from '@/lib/supabase-auth';

// GET: List all users (admin only)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    const users = await getAllUsers();

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Kunde inte hämta användare' },
      { status: 500 }
    );
  }
}

// POST: Invite new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Behörighet saknas' },
        { status: 403 }
      );
    }

    const { email, firstName, lastName, role } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'E-post krävs' },
        { status: 400 }
      );
    }

    // Validate role
    if (role && !['admin', 'installer'].includes(role)) {
      return NextResponse.json(
        { error: 'Ogiltig roll' },
        { status: 400 }
      );
    }

    const { user, error } = await inviteUser(
      email,
      firstName,
      lastName,
      role || 'installer'
    );

    if (error) {
      console.error('Invite error:', error);
      return NextResponse.json(
        { error: 'Kunde inte bjuda in användare: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Kunde inte bjuda in användare' },
      { status: 500 }
    );
  }
}
