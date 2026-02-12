/**
 * Auto-assignment engine for installer bookings
 *
 * Priority-based assignment with multi-channel confirmation
 */

import { createClient } from '@supabase/supabase-js';
import { getAvailableInstallers } from '@/lib/installer-availability';
import { sendInstallerConfirmationEmail, sendBookingConfirmationEmail } from '@/lib/email';
import { sendDiscordNotification, notifyInstallationBooked } from '@/lib/discord';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AutoAssignResult {
  success: boolean;
  assignedCount: number;
  totalNeeded: number;
  assignments: Array<{
    installer_id: string;
    installer_name: string;
    is_lead: boolean;
  }>;
  message: string;
}

/**
 * Auto-assign installers to a booking based on priority and availability
 */
export async function autoAssignInstallers(bookingId: number): Promise<AutoAssignResult> {
  // Fetch booking details
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select(`
      id, scheduled_date, slot_type, num_installers,
      quote_requests (customer_name, customer_address)
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return { success: false, assignedCount: 0, totalNeeded: 0, assignments: [], message: 'Bokning ej hittad' };
  }

  const numNeeded = booking.num_installers || 2;
  const slot = (booking.slot_type || 'full') as 'full' | 'morning' | 'afternoon';
  const quoteData = booking.quote_requests as unknown as { customer_name: string; customer_address: string } | null;

  // Get available installers sorted by priority
  const availability = await getAvailableInstallers(booking.scheduled_date, slot);
  const availableInstallers = availability.filter((i) => i.available);

  if (availableInstallers.length === 0) {
    // Notify admin
    await createAdminNotification(bookingId, 'Inga installatörer tillgängliga');
    return { success: false, assignedCount: 0, totalNeeded: numNeeded, assignments: [], message: 'Inga tillgängliga installatörer' };
  }

  // Pick top N by priority
  const selected = availableInstallers.slice(0, numNeeded);
  const assignments: AutoAssignResult['assignments'] = [];

  for (let i = 0; i < selected.length; i++) {
    const inst = selected[i];
    const isLead = i === 0;

    // Create booking_installer row
    await supabaseAdmin
      .from('booking_installers')
      .upsert({
        booking_id: bookingId,
        installer_id: inst.installerId,
        is_lead: isLead,
        status: 'pending',
      }, { onConflict: 'booking_id,installer_id' });

    // Send confirmation requests via all channels
    await sendInstallerNotifications(bookingId, inst.installerId, {
      customer_name: quoteData?.customer_name || '',
      customer_address: quoteData?.customer_address || '',
      installation_date: booking.scheduled_date,
      slot_type: slot,
    });

    assignments.push({
      installer_id: inst.installerId,
      installer_name: inst.installerName,
      is_lead: isLead,
    });
  }

  if (selected.length < numNeeded) {
    await createAdminNotification(
      bookingId,
      `Bara ${selected.length} av ${numNeeded} installatörer kunde tilldelas`
    );
  }

  return {
    success: selected.length >= numNeeded,
    assignedCount: selected.length,
    totalNeeded: numNeeded,
    assignments,
    message: selected.length >= numNeeded
      ? `${selected.length} installatörer tilldelade`
      : `Bara ${selected.length}/${numNeeded} tilldelade`,
  };
}

/**
 * Send confirmation requests to an installer via all channels
 * Exported as sendInstallerNotifications for use from booking creation
 */
export async function sendInstallerNotifications(
  bookingId: number,
  installerId: string,
  bookingInfo: {
    customer_name: string;
    customer_address: string;
    installation_date: string;
    slot_type: string;
  }
) {
  // Get installer details
  const { data: installer } = await supabaseAdmin
    .from('user_profiles')
    .select('first_name, last_name, email')
    .eq('id', installerId)
    .single();

  if (!installer) return;

  const installerName = `${installer.first_name || ''} ${installer.last_name || ''}`.trim();

  // Channel 1: Email
  const emailToken = crypto.randomUUID();
  await supabaseAdmin
    .from('booking_confirmation_requests')
    .insert({
      booking_id: bookingId,
      installer_id: installerId,
      channel: 'email',
      token: emailToken,
      status: 'pending',
    });

  sendInstallerConfirmationEmail(
    { name: installerName, email: installer.email },
    { ...bookingInfo, confirm_token: emailToken }
  ).catch(console.error);

  // Channel 2: Discord notification
  const discordToken = crypto.randomUUID();
  await supabaseAdmin
    .from('booking_confirmation_requests')
    .insert({
      booking_id: bookingId,
      installer_id: installerId,
      channel: 'discord',
      token: discordToken,
      status: 'pending',
    });

  const slotLabel = bookingInfo.slot_type === 'morning' ? 'Förmiddag' : bookingInfo.slot_type === 'afternoon' ? 'Eftermiddag' : 'Heldag';

  // Get booking type for correct label
  const { data: bookingData } = await supabaseAdmin
    .from('bookings')
    .select('booking_type, scheduled_time')
    .eq('id', bookingId)
    .single();

  const isHomeVisit = bookingData?.booking_type === 'visit';
  const embedTitle = isHomeVisit ? 'Nytt hembesök att bekräfta' : 'Ny installation att bekräfta';

  const discordFields = [
    { name: 'Kund', value: bookingInfo.customer_name, inline: true },
    { name: 'Adress', value: bookingInfo.customer_address, inline: true },
    { name: 'Datum', value: new Date(bookingInfo.installation_date).toLocaleDateString('sv-SE'), inline: true },
    { name: 'Tid', value: bookingData?.scheduled_time ? `${bookingData.scheduled_time} (${slotLabel})` : slotLabel, inline: true },
  ];

  sendDiscordNotification({
    embeds: [{
      title: embedTitle,
      description: `${installerName} - väntar på bekräftelse`,
      color: 0xeab308,
      fields: discordFields,
      footer: { text: `Token: ${discordToken}` },
    }],
  }).catch(console.error);

  // Channel 3: In-app task
  await supabaseAdmin
    .from('booking_confirmation_requests')
    .insert({
      booking_id: bookingId,
      installer_id: installerId,
      channel: 'in_app',
      status: 'pending',
    });

  await supabaseAdmin
    .from('tasks')
    .insert({
      title: `Bekräfta installation: ${bookingInfo.customer_name}`,
      description: `${bookingInfo.customer_address}\n${new Date(bookingInfo.installation_date).toLocaleDateString('sv-SE')} - ${slotLabel}`,
      status: 'pending',
      priority: 'urgent',
      assigned_to: installerId,
      booking_id: bookingId,
      task_type: 'booking_confirmation',
      due_date: bookingInfo.installation_date,
    });
}

/**
 * Handle installer decline - reassign to next available
 */
export async function handleInstallerDecline(
  bookingId: number,
  installerId: string
): Promise<{ reassigned: boolean; newInstallerId?: string }> {
  // Mark as declined
  await supabaseAdmin
    .from('booking_installers')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('installer_id', installerId);

  // Mark confirmation requests as declined
  await supabaseAdmin
    .from('booking_confirmation_requests')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('installer_id', installerId)
    .eq('status', 'pending');

  // Complete the in-app task
  await supabaseAdmin
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('assigned_to', installerId)
    .eq('task_type', 'booking_confirmation');

  // Find the booking
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select(`
      id, scheduled_date, slot_type, num_installers,
      quote_requests (customer_name, customer_address)
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) return { reassigned: false };

  const slot = (booking.slot_type || 'full') as 'full' | 'morning' | 'afternoon';
  const quoteData = booking.quote_requests as unknown as { customer_name: string; customer_address: string } | null;

  // Get all currently assigned (non-declined) installer IDs
  const { data: currentAssignments } = await supabaseAdmin
    .from('booking_installers')
    .select('installer_id')
    .eq('booking_id', bookingId)
    .neq('status', 'declined');

  const assignedIds = (currentAssignments || []).map((a) => a.installer_id);

  // Find next available installer not already assigned
  const availability = await getAvailableInstallers(booking.scheduled_date, slot);
  const nextAvailable = availability.find(
    (i) => i.available && !assignedIds.includes(i.installerId) && i.installerId !== installerId
  );

  if (!nextAvailable) {
    await createAdminNotification(bookingId, 'Ingen ersättare tillgänglig efter avböjning');
    return { reassigned: false };
  }

  // Assign new installer
  await supabaseAdmin
    .from('booking_installers')
    .insert({
      booking_id: bookingId,
      installer_id: nextAvailable.installerId,
      is_lead: false,
      status: 'pending',
    });

  // Send confirmation requests
  await sendInstallerNotifications(bookingId, nextAvailable.installerId, {
    customer_name: quoteData?.customer_name || '',
    customer_address: quoteData?.customer_address || '',
    installation_date: booking.scheduled_date,
    slot_type: slot,
  });

  return { reassigned: true, newInstallerId: nextAvailable.installerId };
}

/**
 * Handle installer accept
 */
export async function handleInstallerAccept(
  bookingId: number,
  installerId: string
): Promise<void> {
  // Mark as accepted
  await supabaseAdmin
    .from('booking_installers')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('installer_id', installerId);

  // Mark confirmation requests as accepted
  await supabaseAdmin
    .from('booking_confirmation_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('installer_id', installerId)
    .eq('status', 'pending');

  // Complete the in-app task
  await supabaseAdmin
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('booking_id', bookingId)
    .eq('assigned_to', installerId)
    .eq('task_type', 'booking_confirmation');

  // Check if all installers have accepted → update booking status
  const { data: allAssignments } = await supabaseAdmin
    .from('booking_installers')
    .select('status')
    .eq('booking_id', bookingId)
    .neq('status', 'declined');

  const allAccepted = allAssignments?.every((a) => a.status === 'accepted');
  if (allAccepted && allAssignments && allAssignments.length > 0) {
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    // Send customer confirmation email + Discord notification
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select(`
        scheduled_date,
        quote_requests (customer_name, customer_email, customer_address)
      `)
      .eq('id', bookingId)
      .single();

    if (booking) {
      const quoteData = booking.quote_requests as unknown as {
        customer_name: string;
        customer_email: string;
        customer_address: string;
      } | null;

      if (quoteData?.customer_email) {
        sendBookingConfirmationEmail({
          customer_name: quoteData.customer_name,
          customer_email: quoteData.customer_email,
          customer_address: quoteData.customer_address,
          installation_date: booking.scheduled_date,
        }).catch(console.error);
      }

      if (quoteData) {
        notifyInstallationBooked({
          customer_name: quoteData.customer_name,
          customer_address: quoteData.customer_address,
          scheduled_date: booking.scheduled_date,
        }).catch(console.error);
      }
    }
  }
}

async function createAdminNotification(bookingId: number, message: string) {
  await supabaseAdmin
    .from('tasks')
    .insert({
      title: message,
      description: `Bokning #${bookingId} behöver uppmärksamhet`,
      status: 'pending',
      priority: 'urgent',
      booking_id: bookingId,
      task_type: 'custom',
    });

  sendDiscordNotification({
    embeds: [{
      title: 'Kräver åtgärd',
      description: `${message} (Bokning #${bookingId})`,
      color: 0xef4444,
    }],
  }).catch(console.error);
}
