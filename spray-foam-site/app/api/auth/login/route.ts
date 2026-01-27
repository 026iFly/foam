import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Get credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    console.log('Login attempt:', { username, hasPassword: !!password });
    console.log('Expected username:', adminUsername);
    console.log('Has hash:', !!adminPasswordHash);

    if (!adminPasswordHash) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Check username
    if (username !== adminUsername) {
      console.log('Username mismatch');
      return NextResponse.json(
        { error: 'Ogiltigt användarnamn eller lösenord' },
        { status: 401 }
      );
    }

    // Verify password
    console.log('Comparing password with hash...');
    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);
    console.log('Password match:', passwordMatch);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Ogiltigt användarnamn eller lösenord' },
        { status: 401 }
      );
    }

    // Set session
    const session = await getSession();
    session.userId = '1';
    session.username = username;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid inloggning' },
      { status: 500 }
    );
  }
}
