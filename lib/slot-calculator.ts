/**
 * Slot/day calculator for installer scheduling
 *
 * Given total_hours and num_installers, calculates:
 * - hours per person
 * - slot type (morning/afternoon/full)
 * - number of days needed
 */

export interface SlotCalculation {
  hoursPerPerson: number;
  slotType: 'morning' | 'afternoon' | 'full';
  numDays: number;
  description: string;
}

/**
 * Calculate slot type and number of days based on total hours and installer count
 *
 * Rules:
 * - ≤3h/person → half day (morning or afternoon)
 * - ≤8h/person → full day
 * - >8h/person → ceil(hours/8) consecutive days
 */
export function calculateSlot(
  totalHours: number,
  numInstallers: number = 2
): SlotCalculation {
  const hoursPerPerson = totalHours / Math.max(numInstallers, 1);

  let slotType: SlotCalculation['slotType'];
  let numDays: number;

  if (hoursPerPerson <= 3) {
    slotType = 'morning';
    numDays = 1;
  } else if (hoursPerPerson <= 8) {
    slotType = 'full';
    numDays = 1;
  } else {
    slotType = 'full';
    numDays = Math.ceil(hoursPerPerson / 8);
  }

  const description = formatDescription(slotType, numDays, numInstallers);

  return { hoursPerPerson, slotType, numDays, description };
}

function formatDescription(
  slotType: SlotCalculation['slotType'],
  numDays: number,
  numInstallers: number
): string {
  const personLabel = numInstallers === 1 ? '1 installatör' : `${numInstallers} installatörer`;

  if (numDays === 1) {
    if (slotType === 'morning') return `Halvdag (förmiddag) - ${personLabel}`;
    if (slotType === 'afternoon') return `Halvdag (eftermiddag) - ${personLabel}`;
    return `Heldag - ${personLabel}`;
  }

  return `${numDays} dagar - ${personLabel}`;
}

/**
 * Extract total hours from quote calculation data
 */
export function getTotalHoursFromQuote(
  calculationData: Record<string, unknown> | string | null
): number {
  if (!calculationData) return 0;

  const data = typeof calculationData === 'string'
    ? JSON.parse(calculationData)
    : calculationData;

  return data?.totals?.totalHours || 0;
}
