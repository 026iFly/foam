import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/supabase-auth';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const testEmail = body.email;

  // Check env vars
  const envCheck = {
    SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
    SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
    SMTP_USER: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 5)}...` : 'NOT SET',
    SMTP_PASS: process.env.SMTP_PASS ? '***SET***' : 'NOT SET',
    SMTP_FROM: process.env.SMTP_FROM || 'NOT SET',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET',
  };

  console.log('Email config check:', envCheck);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({
      success: false,
      error: 'SMTP credentials not configured',
      config: envCheck,
    });
  }

  try {
    // Create transporter with explicit settings
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true,
      logger: true,
    });

    // Verify connection
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified!');

    // Send test email
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    const toAddress = testEmail || process.env.SMTP_USER;

    console.log(`Sending test email from ${fromAddress} to ${toAddress}...`);

    const info = await transporter.sendMail({
      from: `"Intellifoam Test" <${fromAddress}>`,
      to: toAddress,
      subject: 'Test email från Intellifoam',
      text: 'Detta är ett test-email för att verifiera att SMTP fungerar korrekt.',
      html: `
        <h2>Test email</h2>
        <p>Detta är ett test-email för att verifiera att SMTP fungerar korrekt.</p>
        <p>Skickat: ${new Date().toLocaleString('sv-SE')}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Intellifoam CRM</p>
      `,
    });

    console.log('Email sent successfully:', info);

    return NextResponse.json({
      success: true,
      message: `Test-email skickat till ${toAddress}`,
      messageId: info.messageId,
      config: envCheck,
    });
  } catch (error: unknown) {
    console.error('Email test error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as { code?: string })?.code;

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorCode: errorCode,
      config: envCheck,
      hint: errorCode === 'EAUTH'
        ? 'Autentiseringsfel. För Gmail: använd App Password (inte vanligt lösenord). Gå till myaccount.google.com > Security > 2-Step Verification > App passwords'
        : errorCode === 'ECONNECTION'
        ? 'Kunde inte ansluta till SMTP-server. Kontrollera host och port.'
        : 'Kontrollera SMTP-inställningar i Vercel.',
    });
  }
}

export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Just return config status
  const envCheck = {
    SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
    SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
    SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT SET',
    SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT SET',
    SMTP_FROM: process.env.SMTP_FROM || 'NOT SET',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET',
  };

  return NextResponse.json({
    config: envCheck,
    allSet: Object.values(envCheck).every(v => v !== 'NOT SET'),
  });
}
