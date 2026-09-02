/**
 * Build a Fortnox draft invoice (+ project) from a foam quote.
 *
 * - Creates/reuses a Fortnox project for the installation, with StartDate set to
 *   the offertförfrågan date so planning costs can be booked to it from the start.
 * - Upserts the customer (private person for ROT jobs, matched on personnummer).
 * - Creates an UNBOOKED invoice (a draft the user reviews and sends in Fortnox),
 *   tagged to the project, with the labour billed as ROT/husarbete (CONSTRUCTION)
 *   so Fortnox computes the ROT reduction. Material and travel are non-ROT rows.
 *
 * ROT applicant details (personnummer, fastighetsbeteckning, shares) are placed
 * in the invoice comment so the user completes the husarbete/Skatteverket filing
 * in Fortnox's guided flow when sending. (Automating the /taxreductions filing is
 * a follow-up once validated on a real invoice.)
 */

import { fortnoxFetch } from '@/lib/fortnox';
import { getQuoteRequest } from '@/lib/quotes';
import type { CalculationTotals } from '@/lib/types/quote';

export interface FortnoxInvoiceResult {
  documentNumber: string;
  projectNumber: string;
  customerNumber: string;
  total: number;
  url: string;
}

function stockholmToday(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
}

/** Best-effort split of a single-line Swedish address into Fortnox fields. */
function parseAddress(addr: string): { Address1: string; ZipCode: string; City: string } {
  if (!addr) return { Address1: '', ZipCode: '', City: '' };
  // Match "... , 123 45 Stad" or "... 12345 Stad"
  const m = addr.match(/^(.*?)[,\s]+(\d{3}\s?\d{2})\s+(.+)$/);
  if (m) {
    return { Address1: m[1].trim().replace(/,+$/, ''), ZipCode: m[2].replace(/\s/g, ''), City: m[3].trim() };
  }
  return { Address1: addr.trim(), ZipCode: '', City: '' };
}

type FortnoxCustomerList = { Customers?: Array<{ CustomerNumber: string }> };
type FortnoxCustomer = { Customer?: { CustomerNumber: string } };
type FortnoxProject = { Project?: { ProjectNumber: string } };
type FortnoxInvoice = { Invoice?: { DocumentNumber: string; Total?: number } };

async function findCustomerByOrgNr(orgnr: string): Promise<string | null> {
  if (!orgnr) return null;
  try {
    const data = (await fortnoxFetch(
      `/customers?organisationnumber=${encodeURIComponent(orgnr)}`
    )) as FortnoxCustomerList;
    return data.Customers?.[0]?.CustomerNumber ?? null;
  } catch {
    return null;
  }
}

async function upsertCustomer(input: {
  name: string;
  orgnr: string;
  isPrivate: boolean;
  email?: string;
  phone?: string;
  address: string;
}): Promise<string> {
  if (input.orgnr) {
    const existing = await findCustomerByOrgNr(input.orgnr);
    if (existing) return existing;
  }
  const { Address1, ZipCode, City } = parseAddress(input.address);
  const body = {
    Customer: {
      Name: input.name,
      Type: input.isPrivate ? 'PRIVATE' : 'COMPANY',
      OrganisationNumber: input.orgnr || undefined,
      Address1,
      ZipCode,
      City,
      Email: input.email || undefined,
      Phone1: input.phone || undefined,
    },
  };
  const created = (await fortnoxFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(body),
  })) as FortnoxCustomer;
  const num = created.Customer?.CustomerNumber;
  if (!num) throw new Error('Kunde inte skapa kund i Fortnox');
  return num;
}

async function createProject(description: string, startDate: string, fallbackNumber: string): Promise<string> {
  const base = { Description: description.slice(0, 200), StartDate: startDate, Status: 'ONGOING' };
  // Prefer Fortnox auto-numbering; fall back to a deterministic number if required.
  try {
    const created = (await fortnoxFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({ Project: base }),
    })) as FortnoxProject;
    if (created.Project?.ProjectNumber) return created.Project.ProjectNumber;
    throw new Error('no project number returned');
  } catch {
    const created = (await fortnoxFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({ Project: { ...base, ProjectNumber: fallbackNumber } }),
    })) as FortnoxProject;
    const num = created.Project?.ProjectNumber;
    if (!num) throw new Error('Kunde inte skapa projekt i Fortnox');
    return num;
  }
}

/**
 * Create a draft invoice + project in Fortnox for a quote. Throws on failure.
 * Does NOT persist anything locally — the caller stores the returned refs.
 */
export async function createInstallationInvoiceDraft(quoteId: number): Promise<FortnoxInvoiceResult> {
  const quote = await getQuoteRequest(quoteId);
  if (!quote) throw new Error('Offert ej hittad');

  const totals: CalculationTotals | null = (() => {
    const raw = quote.adjusted_data || quote.calculation_data;
    if (!raw) return null;
    try {
      return (typeof raw === 'string' ? JSON.parse(raw) : raw).totals ?? null;
    } catch {
      return null;
    }
  })();
  if (!totals) throw new Error('Offert saknar beräkningsdata');

  const rotInfo = (() => {
    if (!quote.rot_customer_info) return null;
    try {
      return typeof quote.rot_customer_info === 'string'
        ? JSON.parse(quote.rot_customer_info)
        : quote.rot_customer_info;
    } catch {
      return null;
    }
  })() as { fastighetsbeteckning?: string; customers?: Array<{ name: string; personnummer: string; share: number }> } | null;

  const isRot = !!quote.apply_rot_deduction && !!rotInfo?.customers?.length;
  const leadCustomer = rotInfo?.customers?.[0];

  // --- Customer ---
  const customerNumber = await upsertCustomer({
    name: quote.customer_name,
    orgnr: isRot ? (leadCustomer?.personnummer || '') : '',
    isPrivate: isRot,
    email: quote.customer_email || undefined,
    phone: quote.customer_phone || undefined,
    address: quote.customer_address || '',
  });

  // --- Project (start = offertförfrågan date) ---
  const startDate = (quote.created_at || new Date().toISOString()).slice(0, 10);
  const projectNumber = await createProject(
    `Sprutisolering – ${quote.customer_name}${quote.customer_address ? `, ${quote.customer_address}` : ''}`,
    startDate,
    `IF${quoteId}`
  );

  // --- Invoice rows (prices excl VAT; VAT 25%) ---
  const round = (n: number | undefined | null) => Math.round(Number(n) || 0);
  const labourHours = Math.max(
    1,
    Math.round((totals.sprayHours || 0) + (totals.setupHours || 0) + (totals.switchingHours || 0))
  );

  type Row = {
    Description: string;
    DeliveredQuantity: string;
    Price: number;
    Unit: string;
    VAT: number;
    HouseWork: boolean;
    HouseWorkType: string;
    HouseWorkHoursToReport?: number;
  };
  const rows: Row[] = [];

  const material = round(totals.materialCostTotal);
  if (material > 0) {
    rows.push({
      Description: 'Sprutisolering – material',
      DeliveredQuantity: '1', Price: material, Unit: 'st', VAT: 25,
      HouseWork: false, HouseWorkType: 'EMPTYHOUSEWORK',
    });
  }

  const labour = round(totals.laborCostTotal);
  if (labour > 0) {
    rows.push({
      Description: 'Sprutisolering – arbete (montage)',
      DeliveredQuantity: '1', Price: labour, Unit: 'st', VAT: 25,
      HouseWork: isRot,
      HouseWorkType: isRot ? 'CONSTRUCTION' : 'EMPTYHOUSEWORK',
      ...(isRot ? { HouseWorkHoursToReport: labourHours } : {}),
    });
  }

  const travel = round(totals.travelCost);
  if (travel > 0) {
    rows.push({
      Description: 'Resa och etablering',
      DeliveredQuantity: '1', Price: travel, Unit: 'st', VAT: 25,
      HouseWork: false, HouseWorkType: 'EMPTYHOUSEWORK',
    });
  }

  const generator = round(totals.generatorCost);
  if (generator > 0) {
    rows.push({
      Description: 'Elverk',
      DeliveredQuantity: '1', Price: generator, Unit: 'st', VAT: 25,
      HouseWork: false, HouseWorkType: 'EMPTYHOUSEWORK',
    });
  }

  // ROT applicant details for the user to file husarbete when sending in Fortnox
  let comment = `Skapad automatiskt från offert ${quote.quote_number || `#${quoteId}`}.`;
  if (isRot) {
    const people = (rotInfo?.customers || [])
      .map((c) => `- ${c.name} (${c.personnummer}) ${c.share}%`)
      .join('\n');
    comment +=
      `\n\nROT/husarbete – komplettera husarbetesbegäran vid utskick i Fortnox:\n` +
      `Fastighetsbeteckning: ${rotInfo?.fastighetsbeteckning || '(saknas)'}\n` +
      `Sökande:\n${people}`;
  }

  const invoiceBody = {
    Invoice: {
      CustomerNumber: customerNumber,
      InvoiceDate: stockholmToday(),
      VATIncluded: false,
      Project: projectNumber,
      HouseWork: isRot,
      Comments: comment,
      InvoiceRows: rows,
    },
  };

  const created = (await fortnoxFetch('/invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceBody),
  })) as FortnoxInvoice;

  const documentNumber = created.Invoice?.DocumentNumber;
  if (!documentNumber) throw new Error('Kunde inte skapa faktura i Fortnox');

  return {
    documentNumber,
    projectNumber,
    customerNumber,
    total: created.Invoice?.Total ?? 0,
    url: `https://apps.fortnox.se/invoices/${documentNumber}`,
  };
}
