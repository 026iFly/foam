import { Resend } from 'resend';

// Lazy instantiation of Resend client to avoid errors during build
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface SendQuoteEmailParams {
  to: string;
  customerName: string;
  quoteNumber: string;
  validUntil: string;
  totalAmount: number;
  pdfBuffer: Buffer;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
}

export async function sendQuoteEmail({
  to,
  customerName,
  quoteNumber,
  validUntil,
  totalAmount,
  pdfBuffer,
  companyName,
  companyEmail,
  companyPhone,
}: SendQuoteEmailParams): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.EMAIL_FROM || 'pelle@gronteknik.nu';

  const formattedAmount = totalAmount.toLocaleString('sv-SE');
  const formattedDate = new Date(validUntil).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offert ${quoteNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #16a34a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
  </div>

  <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hej ${customerName}!</h2>

    <p>Tack för ditt intresse för våra tjänster. Bifogat finner du din offert för isolering med sprutskum.</p>

    <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Offertnummer:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #16a34a;">${quoteNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Giltig t.o.m:</td>
          <td style="padding: 8px 0; text-align: right;">${formattedDate}</td>
        </tr>
        <tr style="border-top: 2px solid #16a34a;">
          <td style="padding: 12px 0; font-weight: bold; color: #1f2937;">Totalt att betala:</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 20px; color: #16a34a;">${formattedAmount} kr</td>
        </tr>
      </table>
    </div>

    <p>Offerten finns bifogad som PDF. Om du har några frågor eller vill boka ett besök, tveka inte att kontakta oss.</p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <h3 style="color: #1f2937; margin-bottom: 10px;">Kontakta oss</h3>
      <p style="margin: 5px 0; color: #6b7280;">
        <strong>Telefon:</strong> ${companyPhone}<br>
        <strong>E-post:</strong> ${companyEmail}
      </p>
    </div>

    <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
      Med vänliga hälsningar,<br>
      <strong style="color: #1f2937;">${companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>Detta är ett automatiskt meddelande. Du kan svara direkt på detta e-postmeddelande om du har frågor.</p>
  </div>
</body>
</html>
`;

  const textContent = `
Hej ${customerName}!

Tack för ditt intresse för våra tjänster. Bifogat finner du din offert för isolering med sprutskum.

Offertnummer: ${quoteNumber}
Giltig t.o.m: ${formattedDate}
Totalt att betala: ${formattedAmount} kr

Offerten finns bifogad som PDF. Om du har några frågor eller vill boka ett besök, tveka inte att kontakta oss.

Kontakta oss:
Telefon: ${companyPhone}
E-post: ${companyEmail}

Med vänliga hälsningar,
${companyName}
`;

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [to],
      subject: `Offert ${quoteNumber} - Isolering med sprutskum`,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: `offert-${quoteNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
