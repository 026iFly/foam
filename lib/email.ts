/**
 * Email sending utility using nodemailer
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Send an email
 */
export async function sendEmail(
  options: EmailOptions,
  logMeta?: { event_type?: string; reference_type?: string; reference_id?: number }
): Promise<boolean> {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!fromAddress) {
    console.error('SMTP_FROM or SMTP_USER not configured');
    await logNotification('email', logMeta?.event_type || 'unknown', options.to, 'failed', 'SMTP not configured', logMeta);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Intellifoam" <${fromAddress}>`,
      replyTo: process.env.SMTP_REPLY_TO || 'info@intellifoam.se',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
      headers: {
        'X-Mailer': 'Intellifoam',
        'List-Unsubscribe': `<mailto:info@intellifoam.se?subject=unsubscribe>`,
      },
    });

    console.log(`Email sent to ${options.to}: ${options.subject}`);
    await logNotification('email', logMeta?.event_type || 'custom', options.to, 'sent', undefined, logMeta);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    await logNotification('email', logMeta?.event_type || 'custom', options.to, 'failed', String(error), logMeta);
    return false;
  }
}

async function logNotification(
  channel: string,
  event_type: string,
  recipient: string,
  status: string,
  error_message?: string,
  meta?: { reference_type?: string; reference_id?: number }
) {
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel,
      event_type,
      recipient,
      reference_type: meta?.reference_type,
      reference_id: meta?.reference_id,
      status,
      error_message: error_message || null,
    });
  } catch (err) {
    console.error('Failed to log notification:', err);
  }
}

/**
 * Get a message template by type
 */
export async function getTemplate(type: string): Promise<{
  subject: string;
  body: string;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('message_templates')
    .select('subject, body')
    .eq('type', type)
    .eq('is_default', true)
    .single();

  if (error || !data) {
    // Return fallback templates
    const fallbacks: Record<string, { subject: string; body: string }> = {
      offer: {
        subject: 'Offert från Intellifoam - {{offer_number}}',
        body: `Hej {{customer_name}},

Tack för din förfrågan! Bifogat hittar du vår offert för sprutisoleringen.

Offerten är giltig till {{valid_until}}.

Klicka här för att se och godkänna offerten:
{{offer_link}}

Har du frågor? Kontakta oss på 010 703 74 00 eller info@intellifoam.se.

Med vänliga hälsningar,
Intellifoam`,
      },
      rot_link: {
        subject: 'Underlag för ROT-avdrag - Intellifoam',
        body: `Hej {{customer_name}},

För att vi ska kunna hjälpa dig med ROT-avdraget behöver vi lite uppgifter.

Klicka på länken nedan för att fylla i formuläret:
{{rot_link}}

Med vänliga hälsningar,
Intellifoam`,
      },
      follow_up: {
        subject: 'Påminnelse: Din offert från Intellifoam',
        body: `Hej {{customer_name}},

Vi vill bara påminna om offerten vi skickade. Den är fortfarande giltig till {{valid_until}}.

Se offerten här:
{{offer_link}}

Hör av dig om du har frågor!

Med vänliga hälsningar,
Intellifoam`,
      },
      order_confirmation: {
        subject: 'Tack för din beställning - Intellifoam',
        body: `Hej {{customer_name}},

Tack för din beställning! Vi har tagit emot den och börjar planera din installation.

Logga in på din kundportal för att välja installationsdatum och se detaljer:
{{portal_link}}

Har du frågor? Kontakta oss på 010 703 74 00 eller info@intellifoam.se.

Med vänliga hälsningar,
Intellifoam`,
      },
      installer_confirmation: {
        subject: 'Ny bokning att bekräfta - {{customer_name}}',
        body: `Hej {{installer_name}},

Du har tilldelats en ny installation som behöver bekräftas.

Kund: {{customer_name}}
Adress: {{customer_address}}
Datum: {{installation_date}}
Tid: {{slot_type}}

Klicka här för att acceptera eller avböja:
{{confirm_link}}

Med vänliga hälsningar,
Intellifoam`,
      },
      booking_confirmation: {
        subject: 'Bekräftelse av din installation - Intellifoam',
        body: `Hej {{customer_name}},

Din installation är nu bekräftad!

Datum: {{installation_date}}
Adress: {{customer_address}}

Vi ser fram emot att hjälpa dig. Har du frågor? Kontakta oss på 010 703 74 00.

Med vänliga hälsningar,
Intellifoam`,
      },
    };

    return fallbacks[type] || null;
  }

  return data;
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }

  return result;
}

/**
 * Send offer email to customer
 */
export async function sendOfferEmail(
  quote: {
    id: number;
    customer_name: string;
    customer_email: string;
    quote_number?: string;
    quote_valid_until?: string;
    offer_token: string;
  },
  pdfBuffer?: Buffer
): Promise<boolean> {
  const template = await getTemplate('offer');
  if (!template) {
    console.error('Offer template not found');
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
  const offerLink = `${baseUrl}/offert/${quote.offer_token}`;

  const validUntil = quote.quote_valid_until
    ? new Date(quote.quote_valid_until).toLocaleDateString('sv-SE')
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE');

  const variables = {
    customer_name: quote.customer_name,
    offer_number: quote.quote_number || `#${quote.id}`,
    valid_until: validUntil,
    offer_link: offerLink,
    company_name: 'Intellifoam',
  };

  const subject = replaceTemplateVariables(template.subject, variables);
  const text = replaceTemplateVariables(template.body, variables);

  const attachments = pdfBuffer
    ? [
        {
          filename: `Offert-${quote.quote_number || quote.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ]
    : undefined;

  return sendEmail({
    to: quote.customer_email,
    subject,
    text,
    html: text.replace(/\n/g, '<br>'),
    attachments,
  }, { event_type: 'offer_sent', reference_type: 'quote', reference_id: quote.id });
}

/**
 * Send ROT link email to customer
 */
export async function sendRotLinkEmail(
  quote: {
    customer_name: string;
    customer_email: string;
    rot_info_token: string;
  }
): Promise<boolean> {
  const template = await getTemplate('rot_link');
  if (!template) {
    console.error('ROT link template not found');
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
  const rotLink = `${baseUrl}/rot-info/${quote.rot_info_token}`;

  const variables = {
    customer_name: quote.customer_name,
    rot_link: rotLink,
    company_name: 'Intellifoam',
  };

  const subject = replaceTemplateVariables(template.subject, variables);
  const text = replaceTemplateVariables(template.body, variables);

  return sendEmail({
    to: quote.customer_email,
    subject,
    text,
    html: text.replace(/\n/g, '<br>'),
  });
}

/**
 * Send follow-up email to customer
 */
export async function sendFollowUpEmail(
  quote: {
    customer_name: string;
    customer_email: string;
    quote_number?: string;
    quote_valid_until?: string;
    offer_token: string;
  }
): Promise<boolean> {
  const template = await getTemplate('follow_up');
  if (!template) {
    console.error('Follow-up template not found');
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
  const offerLink = `${baseUrl}/offert/${quote.offer_token}`;

  const validUntil = quote.quote_valid_until
    ? new Date(quote.quote_valid_until).toLocaleDateString('sv-SE')
    : 'snart';

  const variables = {
    customer_name: quote.customer_name,
    offer_number: quote.quote_number || 'din offert',
    valid_until: validUntil,
    offer_link: offerLink,
    company_name: 'Intellifoam',
  };

  const subject = replaceTemplateVariables(template.subject, variables);
  const text = replaceTemplateVariables(template.body, variables);

  return sendEmail({
    to: quote.customer_email,
    subject,
    text,
    html: text.replace(/\n/g, '<br>'),
  });
}

/**
 * Send order confirmation email with customer portal link
 */
export async function sendOrderConfirmationEmail(
  customer: {
    customer_name: string;
    customer_email: string;
    customer_token: string;
  }
): Promise<boolean> {
  const template = await getTemplate('order_confirmation');
  if (!template) {
    console.error('Order confirmation template not found');
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
  const portalLink = `${baseUrl}/kund/${customer.customer_token}`;

  const variables = {
    customer_name: customer.customer_name,
    portal_link: portalLink,
    company_name: 'Intellifoam',
  };

  const subject = replaceTemplateVariables(template.subject, variables);
  const text = replaceTemplateVariables(template.body, variables);

  return sendEmail({
    to: customer.customer_email,
    subject,
    text,
    html: text.replace(/\n/g, '<br>'),
  });
}

/**
 * Send installer confirmation request email
 */
export async function sendInstallerConfirmationEmail(
  installer: {
    name: string;
    email: string;
  },
  booking: {
    customer_name: string;
    customer_address: string;
    installation_date: string;
    slot_type: string;
    confirm_token: string;
    booking_type?: string;
  }
): Promise<boolean> {
  const template = await getTemplate('installer_confirmation');
  if (!template) {
    console.error('Installer confirmation template not found');
    return false;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intellifoam.se';
  const confirmLink = `${baseUrl}/confirm/${booking.confirm_token}`;

  const slotLabel = booking.slot_type === 'morning' ? 'Förmiddag' : booking.slot_type === 'afternoon' ? 'Eftermiddag' : 'Heldag';
  const isHomeVisit = booking.booking_type === 'visit';
  const bookingTypeLabel = isHomeVisit ? 'hembesök' : 'installation';

  const variables = {
    installer_name: installer.name,
    customer_name: booking.customer_name,
    customer_address: booking.customer_address,
    installation_date: new Date(booking.installation_date).toLocaleDateString('sv-SE', {
      weekday: 'long', day: 'numeric', month: 'long',
    }),
    slot_type: slotLabel,
    confirm_link: confirmLink,
    company_name: 'Intellifoam',
    booking_type: bookingTypeLabel,
  };

  // Override subject for home visits
  const subjectTemplate = isHomeVisit
    ? 'Nytt hembesök att bekräfta - {{customer_name}}'
    : template.subject;

  const subject = replaceTemplateVariables(subjectTemplate, variables);
  const bodyTemplate = isHomeVisit
    ? template.body.replace('en ny installation', 'ett nytt hembesök')
    : template.body;
  const text = replaceTemplateVariables(bodyTemplate, variables);

  return sendEmail({
    to: installer.email,
    subject,
    text,
    html: text.replace(/\n/g, '<br>'),
  }, { event_type: 'installer_confirmation' });
}

/**
 * Send booking confirmation email to customer (when all installers accepted)
 */
export async function sendBookingConfirmationEmail(
  customer: {
    customer_name: string;
    customer_email: string;
    customer_address: string;
    installation_date: string;
  }
): Promise<boolean> {
  const template = await getTemplate('booking_confirmation');
  if (!template) {
    console.error('Booking confirmation template not found');
    return false;
  }

  const formattedDate = new Date(customer.installation_date).toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const variables = {
    customer_name: customer.customer_name,
    customer_address: customer.customer_address,
    installation_date: formattedDate,
    company_name: 'Intellifoam',
  };

  const subject = replaceTemplateVariables(template.subject, variables);
  const text = replaceTemplateVariables(template.body, variables);

  return sendEmail({
    to: customer.customer_email,
    subject,
    text,
    html: text.replace(/\n/g, '<br>'),
  });
}

/**
 * Send custom email
 */
export async function sendCustomEmail(
  to: string,
  subject: string,
  body: string,
  variables?: Record<string, string>
): Promise<boolean> {
  let finalSubject = subject;
  let finalBody = body;

  if (variables) {
    finalSubject = replaceTemplateVariables(subject, variables);
    finalBody = replaceTemplateVariables(body, variables);
  }

  return sendEmail({
    to,
    subject: finalSubject,
    text: finalBody,
    html: finalBody.replace(/\n/g, '<br>'),
  });
}
