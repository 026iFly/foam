import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, updateUserRole, getUserById } from '@/lib/supabase-auth';

// PUT: Change user role (admin only)
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

    const { role } = await request.json();

    if (!role || !['admin', 'installer'].includes(role)) {
      return NextResponse.json(
        { error: 'Ogiltig roll' },
        { status: 400 }
      );
    }

    // Prevent changing own role
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'Du kan inte ändra din egen roll' },
        { status: 400 }
      );
    }

    const success = await updateUserRole(id, role);

    if (!success) {
      return NextResponse.json(
        { error: 'Kunde inte ändra roll' },
        { status: 500 }
      );
    }

    const user = await getUserById(id);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error changing user role:', error);
    return NextResponse.json(
      { error: 'Kunde inte ändra roll' },
      { status: 500 }
    );
  }
}
