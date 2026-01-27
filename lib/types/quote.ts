// Types for the quote management system

export type QuoteStatus = 'pending' | 'reviewed' | 'quoted' | 'sent' | 'accepted' | 'rejected';

export interface QuoteRequest {
  id: number;

  // Customer info
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  project_type: string | null;
  message: string | null;

  // Calculation data (stored as JSON string in DB)
  calculation_data: string;

  // Climate parameters
  climate_zone: string | null;
  indoor_temp: number | null;
  indoor_rh: number | null;
  has_three_phase: number | null;
  apply_rot_deduction: number;

  // Totals (denormalized)
  total_area: number | null;
  total_excl_vat: number | null;
  total_incl_vat: number | null;
  rot_deduction: number;

  // Workflow
  status: QuoteStatus;
  admin_notes: string | null;
  adjusted_data: string | null;
  adjusted_total_excl_vat: number | null;
  adjusted_total_incl_vat: number | null;

  // Quote document
  quote_number: string | null;
  quote_pdf_path: string | null;
  quote_valid_until: string | null;

  // ROT customer info (stored as JSON string in DB)
  rot_customer_info: string | null;
  rot_info_token: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  email_sent_at: string | null;
}

// Parsed calculation data structure
export interface CalculationData {
  recommendations: BuildingPartRecommendation[];
  climate: ClimateSettings;
  options: CalculationOptions;
  totals: CalculationTotals;
  timestamp: number;
}

export interface CondensationAnalysis {
  risk: 'low' | 'medium' | 'high' | 'unknown';
  dewPointInside: number;
  tempAtInterface: number;
  explanation: string;
  safetyMargin: number;
}

export interface BuildingPartRecommendation {
  partId: string;
  partName: string;
  partType: string;
  area: number;
  hasVaporBarrier: boolean;
  targetThickness: number;
  closedCellThickness: number;
  openCellThickness: number;
  totalThickness: number;
  closedCellKg: number;
  openCellKg: number;
  closedCellCost: number;
  openCellCost: number;
  materialCost: number;
  laborHours: number;
  laborCost: number;
  totalCost: number;
  condensationRisk: string;
  meetsUValue: boolean;
  actualUValue: number;
  requiredUValue: number;
  // Detailed condensation analysis
  condensationAnalysis?: CondensationAnalysis;
  // Configuration type
  configType?: 'closed_only' | 'open_only' | 'flash_and_batt';
  configExplanation?: string;
}

export interface ClimateSettings {
  zone: string;
  indoorTemp: number;
  indoorRH: number;
  outdoorTemp: number;
}

export interface CalculationOptions {
  hasThreePhase: boolean;
  applyRotDeduction: boolean;
  customerAddress: string;
  distanceKm?: number;
}

export interface CalculationTotals {
  totalArea: number;
  totalClosedCellKg: number;
  totalOpenCellKg: number;
  materialCostTotal: number;
  laborCostTotal: number;
  travelCost: number;
  generatorCost: number;
  totalExclVat: number;
  vat: number;
  totalInclVat: number;
  rotDeduction: number;
  finalTotal: number;
  sprayHours: number;
  setupHours: number;
  travelHours: number;
  switchingHours?: number;
  totalHours: number;
  distanceKm?: number;
}

// ROT customer information
export interface RotCustomerInfo {
  fastighetsbeteckning: string;
  customers: RotCustomer[];
  submittedAt?: string;
}

export interface RotCustomer {
  name: string;
  personnummer: string;
  share?: number; // Percentage share of the ROT deduction (default 100 for single customer)
}

// Input for creating a new quote request
export interface CreateQuoteRequestInput {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address: string;
  project_type?: string;
  message?: string;
  calculation_data: CalculationData;
  climate_zone?: string;
  indoor_temp?: number;
  indoor_rh?: number;
  has_three_phase?: boolean;
  apply_rot_deduction?: boolean;
  total_area?: number;
  total_excl_vat?: number;
  total_incl_vat?: number;
  rot_deduction?: number;
}

// Input for updating a quote request
export interface UpdateQuoteRequestInput {
  status?: QuoteStatus;
  admin_notes?: string;
  adjusted_data?: string;
  adjusted_total_excl_vat?: number;
  adjusted_total_incl_vat?: number;
  quote_number?: string;
  quote_pdf_path?: string;
  quote_valid_until?: string;
  email_sent_at?: string;
  rot_customer_info?: string;
  rot_info_token?: string;
}

// Query filters for listing quotes
export interface QuoteListFilters {
  status?: QuoteStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

// Quote list response with pagination info
export interface QuoteListResponse {
  quotes: QuoteRequest[];
  total: number;
  limit: number;
  offset: number;
}
