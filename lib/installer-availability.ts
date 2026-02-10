/**
 * Installer availability checking utility
 *
 * Checks multiple conditions to determine if an installer is available:
 * 1. Is active
 * 2. Hardplast certificate not expired
 * 3. Not blocked on the date
 * 4. Not already booked on the date
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AvailabilityResult {
  installerId: string;
  installerName: string;
  available: boolean;
  reason?: string;
  priorityOrder: number;
}

export interface InstallerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  installer_type: string | null;
  hourly_rate: number | null;
  hardplast_expiry: string | null;
  priority_order: number;
  is_active: boolean;
}

/**
 * Check availability for a single installer on a specific date/slot
 */
export async function checkInstallerAvailability(
  installerId: string,
  date: string,
  slot: 'full' | 'morning' | 'afternoon' = 'full'
): Promise<AvailabilityResult> {
  // Get installer profile
  const { data: installer } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', installerId)
    .single();

  if (!installer) {
    return { installerId, installerName: 'Unknown', available: false, reason: 'Installatör ej hittad', priorityOrder: 99 };
  }

  const name = `${installer.first_name || ''} ${installer.last_name || ''}`.trim();
  const base = { installerId, installerName: name, priorityOrder: installer.priority_order || 99 };

  // Check active
  if (!installer.is_active) {
    return { ...base, available: false, reason: 'Inaktiv' };
  }

  // Check hardplast
  if (installer.hardplast_expiry && new Date(installer.hardplast_expiry) < new Date()) {
    return { ...base, available: false, reason: 'Hardplast-certifikat utgånget' };
  }

  // Check blocked dates
  const { data: blocks } = await supabaseAdmin
    .from('installer_blocked_dates')
    .select('slot')
    .eq('installer_id', installerId)
    .eq('blocked_date', date);

  if (blocks && blocks.length > 0) {
    const isFullBlocked = blocks.some((b) => b.slot === 'full');
    const isSlotBlocked = blocks.some((b) => b.slot === slot);
    if (isFullBlocked || isSlotBlocked || slot === 'full') {
      return { ...base, available: false, reason: 'Blockerat datum' };
    }
  }

  // Check existing bookings
  const { data: existingBookings } = await supabaseAdmin
    .from('booking_installers')
    .select(`
      bookings!inner (scheduled_date, slot_type, status)
    `)
    .eq('installer_id', installerId)
    .neq('status', 'declined');

  if (existingBookings) {
    for (const bi of existingBookings) {
      const booking = bi.bookings as unknown as { scheduled_date: string; slot_type: string; status: string };
      if (!booking || booking.status === 'cancelled') continue;
      if (booking.scheduled_date !== date) continue;

      // If either the existing booking or new booking is full-day, it conflicts
      if (booking.slot_type === 'full' || slot === 'full') {
        return { ...base, available: false, reason: 'Redan bokad' };
      }
      // If same slot (both morning or both afternoon), it conflicts
      if (booking.slot_type === slot) {
        return { ...base, available: false, reason: 'Redan bokad' };
      }
    }
  }

  return { ...base, available: true };
}

/**
 * Get all installer availability for a date range
 */
export async function getAllAvailability(
  fromDate: string,
  toDate: string,
  slot: 'full' | 'morning' | 'afternoon' = 'full'
): Promise<Record<string, AvailabilityResult[]>> {
  // Get all active installers
  const { data: installers } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .not('installer_type', 'is', null)
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (!installers || installers.length === 0) return {};

  // Get all blocked dates in range
  const { data: allBlocks } = await supabaseAdmin
    .from('installer_blocked_dates')
    .select('*')
    .gte('blocked_date', fromDate)
    .lte('blocked_date', toDate);

  // Get all bookings in range
  const { data: allBookingInstallers } = await supabaseAdmin
    .from('booking_installers')
    .select(`
      installer_id,
      status,
      bookings!inner (scheduled_date, slot_type, status)
    `)
    .neq('status', 'declined');

  const result: Record<string, AvailabilityResult[]> = {};

  // Generate each date in range
  const current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    result[dateStr] = [];

    for (const installer of installers) {
      const name = `${installer.first_name || ''} ${installer.last_name || ''}`.trim();
      const base = {
        installerId: installer.id,
        installerName: name,
        priorityOrder: installer.priority_order || 99,
      };

      // Check hardplast
      if (installer.hardplast_expiry && new Date(installer.hardplast_expiry) < new Date()) {
        result[dateStr].push({ ...base, available: false, reason: 'Hardplast utgånget' });
        continue;
      }

      // Check blocked dates
      const blocks = (allBlocks || []).filter(
        (b) => b.installer_id === installer.id && b.blocked_date === dateStr
      );
      const isBlocked = blocks.some(
        (b) => b.slot === 'full' || b.slot === slot || slot === 'full'
      );
      if (isBlocked) {
        result[dateStr].push({ ...base, available: false, reason: 'Blockerat' });
        continue;
      }

      // Check existing bookings
      const installerBookings = (allBookingInstallers || []).filter(
        (bi) => bi.installer_id === installer.id
      );
      let booked = false;
      for (const bi of installerBookings) {
        const booking = bi.bookings as unknown as { scheduled_date: string; slot_type: string; status: string };
        if (!booking || booking.status === 'cancelled') continue;
        if (booking.scheduled_date !== dateStr) continue;
        if (booking.slot_type === 'full' || slot === 'full' || booking.slot_type === slot) {
          booked = true;
          break;
        }
      }
      if (booked) {
        result[dateStr].push({ ...base, available: false, reason: 'Bokad' });
        continue;
      }

      result[dateStr].push({ ...base, available: true });
    }

    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Get available installers for a specific date/slot
 */
export async function getAvailableInstallers(
  date: string,
  slot: 'full' | 'morning' | 'afternoon' = 'full'
): Promise<AvailabilityResult[]> {
  const { data: installers } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .not('installer_type', 'is', null)
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (!installers) return [];

  const results = await Promise.all(
    installers.map((inst) => checkInstallerAvailability(inst.id, date, slot))
  );

  return results;
}
