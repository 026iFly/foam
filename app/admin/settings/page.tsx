'use client';

import { useState, useEffect } from 'react';

interface PricingConfig {
  id: number;
  foam_type: string;
  thickness_mm: number;
  price_per_m2_excl_vat: number;
  is_active: number;
}

interface AdditionalCost {
  id: number;
  cost_type: string;
  description: string | null;
  amount: number;
  unit: string | null;
  is_active: number;
}

interface ProjectMultiplier {
  id: number;
  project_type: string;
  multiplier: number;
  description: string | null;
  is_active: number;
}

interface CostVariable {
  id: number;
  variable_key: string;
  variable_value: number;
  variable_unit: string | null;
  description: string | null;
  category: string | null;
  updated_at: string;
}

interface MessageTemplate {
  id: number;
  type: string;
  name: string;
  subject: string;
  body: string;
  is_default: boolean;
}

interface TermsCondition {
  id: number;
  order_index: number;
  text: string;
  is_active: boolean;
}

interface SystemSetting {
  key: string;
  value: Record<string, unknown> | string | number;
  description: string;
}

type TabType = 'pricing' | 'multipliers' | 'physics' | 'templates' | 'terms' | 'forecast' | 'calendar';

interface CalendarSyncStatus {
  configured: boolean;
  connected: boolean;
  calendarName?: string;
  error?: string;
  syncedCount?: number;
  unsyncedBookings?: { id: number; booking_type: string; scheduled_date: string; status: string }[];
  lastSync?: { lastSync: string; syncedCount: number; failedCount: number } | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pricing');
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [multipliers, setMultipliers] = useState<ProjectMultiplier[]>([]);
  const [costVariables, setCostVariables] = useState<CostVariable[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [terms, setTerms] = useState<TermsCondition[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // New term input
  const [newTermText, setNewTermText] = useState('');

  // Editing template
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Calendar sync
  const [calendarStatus, setCalendarStatus] = useState<CalendarSyncStatus | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pricingRes, costVarsRes, templatesRes, termsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/pricing'),
        fetch('/api/admin/cost-variables'),
        fetch('/api/admin/templates').catch(() => ({ ok: false, json: () => ({ templates: [] }) })),
        fetch('/api/admin/terms').catch(() => ({ ok: false, json: () => ({ terms: [] }) })),
        fetch('/api/admin/settings').catch(() => ({ ok: false, json: () => ({ settings: [] }) })),
      ]);

      const pricingData = await pricingRes.json();
      const costVarsData = await costVarsRes.json();

      let templatesData = { templates: [] };
      let termsData = { terms: [] };
      let settingsData = { settings: [] };

      if (templatesRes.ok) templatesData = await templatesRes.json();
      if (termsRes.ok) termsData = await termsRes.json();
      if (settingsRes.ok) settingsData = await settingsRes.json();

      setPricing(pricingData.pricing || []);
      setAdditionalCosts(pricingData.additionalCosts || []);
      setMultipliers(pricingData.multipliers || []);
      setCostVariables(costVarsData.variables || []);
      setTemplates(templatesData.templates || []);
      setTerms(termsData.terms || []);
      setSettings(settingsData.settings || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoading(false);
    }
  };

  const showMessage = (msg: string, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const updatePricing = async (id: number, price: number) => {
    setSaving(true);
    try {
      await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pricing', id, value: price }),
      });
      showMessage('Pris uppdaterat!');
      loadData();
    } catch {
      showMessage('Fel vid uppdatering');
    }
    setSaving(false);
  };

  const updateAdditionalCost = async (id: number, amount: number) => {
    setSaving(true);
    try {
      await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'additional_cost', id, value: amount }),
      });
      showMessage('Kostnad uppdaterad!');
      loadData();
    } catch {
      showMessage('Fel vid uppdatering');
    }
    setSaving(false);
  };

  const updateMultiplier = async (id: number, multiplier: number) => {
    setSaving(true);
    try {
      await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'multiplier', id, value: multiplier }),
      });
      showMessage('Multiplikator uppdaterad!');
      loadData();
    } catch {
      showMessage('Fel vid uppdatering');
    }
    setSaving(false);
  };

  const updateCostVariable = async (id: number, value: number) => {
    setSaving(true);
    try {
      await fetch('/api/admin/cost-variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, variable_value: value }),
      });
      showMessage('Variabel uppdaterad!');
      loadData();
    } catch {
      showMessage('Fel vid uppdatering');
    }
    setSaving(false);
  };

  const addTerm = async () => {
    if (!newTermText.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/admin/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTermText.trim() }),
      });
      setNewTermText('');
      showMessage('Villkor tillagt!');
      loadData();
    } catch {
      showMessage('Fel vid skapande');
    }
    setSaving(false);
  };

  const updateTerm = async (id: number, text: string) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/terms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      showMessage('Villkor uppdaterat!');
      loadData();
    } catch {
      showMessage('Fel vid uppdatering');
    }
    setSaving(false);
  };

  const deleteTerm = async (id: number) => {
    if (!confirm('Vill du ta bort detta villkor?')) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/terms/${id}`, { method: 'DELETE' });
      showMessage('Villkor borttaget!');
      loadData();
    } catch {
      showMessage('Fel vid borttagning');
    }
    setSaving(false);
  };

  const moveTerm = async (id: number, direction: 'up' | 'down') => {
    const index = terms.findIndex(t => t.id === id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === terms.length - 1) return;

    const newTerms = [...terms];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newTerms[index], newTerms[swapIndex]] = [newTerms[swapIndex], newTerms[index]];

    // Update order indexes
    const reordered = newTerms.map((t, i) => ({ id: t.id, order_index: i + 1 }));

    setSaving(true);
    try {
      await fetch('/api/admin/terms/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: reordered }),
      });
      loadData();
    } catch {
      showMessage('Fel vid omordning');
    }
    setSaving(false);
  };

  const updateTemplate = async (template: MessageTemplate) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      setEditingTemplate(null);
      showMessage('Mall uppdaterad!');
      loadData();
    } catch {
      showMessage('Fel vid uppdatering');
    }
    setSaving(false);
  };

  const updateSetting = async (key: string, value: unknown) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      showMessage('Inställning uppdaterad!');
      loadData();
    } catch {
      showMessage('Fel vid uppdatering');
    }
    setSaving(false);
  };

  const loadCalendarStatus = async () => {
    setCalendarLoading(true);
    try {
      const res = await fetch('/api/admin/calendar/sync');
      const data = await res.json();
      setCalendarStatus(data);
    } catch (err) {
      console.error('Failed to load calendar status:', err);
      setCalendarStatus({
        configured: false,
        connected: false,
        error: 'Kunde inte hämta kalenderstatus',
      });
    }
    setCalendarLoading(false);
  };

  const testCalendarConnection = async () => {
    setCalendarLoading(true);
    try {
      const res = await fetch('/api/admin/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(`Anslutning OK! Kalender: ${data.calendarName}`);
        loadCalendarStatus();
      } else {
        showMessage(data.error || 'Anslutningstest misslyckades');
      }
    } catch {
      showMessage('Fel vid anslutningstest');
    }
    setCalendarLoading(false);
  };

  const syncAllBookings = async () => {
    setCalendarLoading(true);
    try {
      const res = await fetch('/api/admin/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all' }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(`Synkronisering klar! ${data.synced} bokningar synkade.`);
        loadCalendarStatus();
      } else {
        showMessage(data.error || 'Synkronisering misslyckades');
      }
    } catch {
      showMessage('Fel vid synkronisering');
    }
    setCalendarLoading(false);
  };

  const pullFromGoogle = async () => {
    setCalendarLoading(true);
    try {
      const res = await fetch('/api/admin/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull_from_google' }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(`Hämtning klar! ${data.updated} bokningar uppdaterade.`);
        loadCalendarStatus();
      } else {
        showMessage(data.error || 'Hämtning misslyckades');
      }
    } catch {
      showMessage('Fel vid hämtning från Google');
    }
    setCalendarLoading(false);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'pricing', label: 'Prissättning & Kostnader' },
    { id: 'multipliers', label: 'Projektmultiplikatorer' },
    { id: 'physics', label: 'Byggnadsfysik' },
    { id: 'templates', label: 'Meddelanden' },
    { id: 'terms', label: 'Villkor' },
    { id: 'forecast', label: 'Prognos' },
    { id: 'calendar', label: 'Google Kalender' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900">Laddar inställningar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Inställningar</h1>

          {message && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
              {message}
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex flex-wrap -mb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Pricing Tab - Now includes cost variables */}
              {activeTab === 'pricing' && (
                <div className="space-y-8">
                  {/* Additional Costs */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">Tilläggsavgifter</h2>
                    <div className="space-y-4">
                      {additionalCosts.map((cost) => (
                        <div key={cost.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <div className="font-medium text-gray-800">{cost.description}</div>
                            <div className="text-sm text-gray-600">{cost.cost_type}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step={cost.unit === 'percent' ? '1' : '100'}
                              defaultValue={cost.amount}
                              onBlur={(e) => {
                                const newAmount = parseFloat(e.target.value);
                                if (newAmount !== cost.amount) {
                                  updateAdditionalCost(cost.id, newAmount);
                                }
                              }}
                              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                            />
                            <span className="text-gray-700">
                              {cost.unit === 'percent' ? '%' : 'kr'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Closed Cell Foam */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-green-700">Slutencellsskum</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {costVariables.filter(v => v.category === 'closed_foam').map((variable) => (
                        <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <div className="font-medium text-gray-800">{variable.description}</div>
                            <div className="text-xs text-gray-500">{variable.variable_key}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step={variable.variable_unit?.includes('%') ? '1' : '0.1'}
                              defaultValue={variable.variable_value}
                              onBlur={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (newValue !== variable.variable_value) {
                                  updateCostVariable(variable.id, newValue);
                                }
                              }}
                              className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                            />
                            <span className="text-gray-600 text-sm">{variable.variable_unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Open Cell Foam */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-blue-700">Öppencellsskum</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {costVariables.filter(v => v.category === 'open_foam').map((variable) => (
                        <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <div className="font-medium text-gray-800">{variable.description}</div>
                            <div className="text-xs text-gray-500">{variable.variable_key}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step={variable.variable_unit?.includes('%') ? '1' : '0.1'}
                              defaultValue={variable.variable_value}
                              onBlur={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (newValue !== variable.variable_value) {
                                  updateCostVariable(variable.id, newValue);
                                }
                              }}
                              className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                            />
                            <span className="text-gray-600 text-sm">{variable.variable_unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Personnel & Equipment */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Personal & Utrustning</h3>
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                      {costVariables.filter(v =>
                        v.category === 'personnel' ||
                        v.category === 'equipment' ||
                        v.category === 'labor'
                      ).map((variable) => (
                        <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="font-medium text-gray-800 truncate">{variable.description}</div>
                            <div className="text-xs text-gray-500">{variable.variable_key}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                              type="number"
                              step="50"
                              defaultValue={variable.variable_value}
                              onBlur={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (newValue !== variable.variable_value) {
                                  updateCostVariable(variable.id, newValue);
                                }
                              }}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 text-gray-900"
                            />
                            <span className="text-gray-600 text-sm w-16">{variable.variable_unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ROT-avdrag */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-emerald-700">ROT-avdrag</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-medium text-gray-800">Max ROT per person</div>
                          <div className="text-sm text-gray-600">Standardvärde för nya offerter (lagstadgat max 50 000 kr/person/år)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="1000"
                            min="0"
                            max="50000"
                            defaultValue={(() => {
                              const current = settings.find(s => s.key === 'rot_settings');
                              return (current?.value as Record<string, number>)?.max_per_person ?? 50000;
                            })()}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                const current = settings.find(s => s.key === 'rot_settings');
                                updateSetting('rot_settings', {
                                  ...(current?.value as Record<string, unknown>),
                                  max_per_person: Math.min(val, 50000),
                                });
                              }
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900"
                          />
                          <span className="text-gray-700">kr</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-medium text-gray-800">ROT-procent av arbetskostnad</div>
                          <div className="text-sm text-gray-600">Andel av arbetskostnad inkl. moms som dras av (lagstadgat 30%)</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            defaultValue={(() => {
                              const current = settings.find(s => s.key === 'rot_settings');
                              return (current?.value as Record<string, number>)?.percentage ?? 30;
                            })()}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                const current = settings.find(s => s.key === 'rot_settings');
                                updateSetting('rot_settings', {
                                  ...(current?.value as Record<string, unknown>),
                                  percentage: val,
                                });
                              }
                            }}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-gray-900"
                          />
                          <span className="text-gray-700">%</span>
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-sm text-emerald-800">
                          <strong>ROT-regler:</strong> Max 50 000 kr per person per år. Avdrag är 30% av arbetskostnad inkl. moms.
                          Dessa värden används som standard för nya offerter och kan justeras per offert.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Crew Settings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-orange-700">Besättningsinställningar</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-medium text-gray-800">Standard antal installatörer</div>
                          <div className="text-sm text-gray-600">Antal som tilldelas nya bokningar</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="1"
                            defaultValue={(() => {
                              const current = settings.find(s => s.key === 'crew_settings');
                              return (current?.value as Record<string, number>)?.default_installers ?? 2;
                            })()}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                const current = settings.find(s => s.key === 'crew_settings');
                                updateSetting('crew_settings', {
                                  ...(current?.value as Record<string, unknown>),
                                  default_installers: val,
                                });
                              }
                            }}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                          />
                          <span className="text-gray-700">st</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-medium text-gray-800">Ensam-installatör-tillägg</div>
                          <div className="text-sm text-gray-600">Extra tid när bara 1 installatör arbetar</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="5"
                            defaultValue={(() => {
                              const current = settings.find(s => s.key === 'crew_settings');
                              return (current?.value as Record<string, number>)?.single_installer_factor ?? 30;
                            })()}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                const current = settings.find(s => s.key === 'crew_settings');
                                updateSetting('crew_settings', {
                                  ...(current?.value as Record<string, unknown>),
                                  single_installer_factor: val,
                                });
                              }
                            }}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                          />
                          <span className="text-gray-700">%</span>
                        </div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm text-orange-800">
                          <strong>Exempel:</strong> Med 30% tillägg tar en ensam installatör 1.3× så lång tid (och kostar mer i arbetstid).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Travel */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-purple-700">Transport & Resa</h3>
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                      {costVariables.filter(v => v.category === 'travel').map((variable) => (
                        <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="font-medium text-gray-800 truncate">{variable.description}</div>
                            <div className="text-xs text-gray-500">{variable.variable_key}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                              type="number"
                              step="1"
                              defaultValue={variable.variable_value}
                              onBlur={(e) => {
                                const newValue = parseFloat(e.target.value);
                                if (newValue !== variable.variable_value) {
                                  updateCostVariable(variable.id, newValue);
                                }
                              }}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                            />
                            <span className="text-gray-600 text-sm w-16">{variable.variable_unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Multipliers Tab */}
              {activeTab === 'multipliers' && (
                <div>
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Projektmultiplikatorer</h2>
                  <p className="text-gray-600 mb-4">
                    Dessa multiplikatorer justerar <strong>arbetstiden</strong> baserat på projektets komplexitet.
                    De påverkar inte materialåtgången.
                  </p>

                  {multipliers.length === 0 ? (
                    <div className="space-y-4">
                      <p className="text-gray-500 italic">Inga multiplikatorer hittades.</p>
                      <button
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const res = await fetch('/api/admin/setup/project-multipliers', { method: 'POST' });
                            const data = await res.json();
                            if (res.ok) {
                              showMessage(`${data.inserted} multiplikatorer tillagda!`);
                              loadData();
                            } else {
                              showMessage(data.error || 'Fel vid skapande');
                            }
                          } catch {
                            showMessage('Fel vid skapande');
                          }
                          setSaving(false);
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                      >
                        Skapa standardmultiplikatorer
                      </button>
                    </div>
                  ) : (
                  <div className="space-y-4">
                    {multipliers.map((mult) => (
                      <div key={mult.id} className="flex items-center justify-between border-b pb-3">
                        <div>
                          <div className="font-medium text-gray-800 capitalize">{mult.project_type}</div>
                          <div className="text-sm text-gray-600">{mult.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.05"
                            min="0.5"
                            max="3.0"
                            defaultValue={mult.multiplier}
                            onBlur={(e) => {
                              const newMult = parseFloat(e.target.value);
                              if (newMult !== mult.multiplier) {
                                updateMultiplier(mult.id, newMult);
                              }
                            }}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                          />
                          <span className="text-gray-700">× arbetstid</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                  {multipliers.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Exempel:</strong> En multiplikator på 1.2 betyder 20% längre arbetstid (och därmed högre arbetskostnad).
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Building Physics Tab */}
              {activeTab === 'physics' && (
                <div>
                  <h2 className="text-xl font-semibold mb-2 text-gray-900">Byggnadsfysik</h2>
                  <p className="text-gray-600 mb-4">
                    Parametrar för kondensationsberäkningar och flash-and-batt-dimensionering.
                  </p>

                  {costVariables.filter(v => v.category === 'building_physics').length === 0 ? (
                    <div className="space-y-4">
                      <p className="text-gray-500 italic">Inga byggnadsfysik-variabler hittades.</p>
                      <button
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const res = await fetch('/api/admin/setup/building-physics', { method: 'POST' });
                            const data = await res.json();
                            if (res.ok) {
                              showMessage(`${data.inserted} variabler tillagda!`);
                              loadData();
                            } else {
                              showMessage(data.error || 'Fel vid skapande');
                            }
                          } catch {
                            showMessage('Fel vid skapande');
                          }
                          setSaving(false);
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                      >
                        Skapa byggnadsfysik-variabler
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Thermal Properties */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-indigo-700">Termiska egenskaper (Lambda)</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {costVariables.filter(v =>
                            v.category === 'building_physics' &&
                            v.variable_key.includes('lambda')
                          ).map((variable) => (
                            <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                              <div>
                                <div className="font-medium text-gray-800">{variable.description}</div>
                                <div className="text-xs text-gray-500">{variable.variable_key}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step={variable.variable_key.includes('lambda') ? '0.001' : '1'}
                                  defaultValue={variable.variable_value}
                                  onBlur={(e) => {
                                    const newValue = parseFloat(e.target.value);
                                    if (!isNaN(newValue) && newValue !== variable.variable_value) {
                                      updateCostVariable(variable.id, newValue);
                                    }
                                  }}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                                />
                                <span className="text-gray-600 text-sm w-16">{variable.variable_unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Vapor Properties */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-blue-700">Ångdiffusion</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {costVariables.filter(v =>
                            v.category === 'building_physics' &&
                            v.variable_key.includes('sd_value')
                          ).map((variable) => (
                            <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                              <div>
                                <div className="font-medium text-gray-800">{variable.description}</div>
                                <div className="text-xs text-gray-500">{variable.variable_key}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  defaultValue={variable.variable_value}
                                  onBlur={(e) => {
                                    const newValue = parseFloat(e.target.value);
                                    if (!isNaN(newValue) && newValue !== variable.variable_value) {
                                      updateCostVariable(variable.id, newValue);
                                    }
                                  }}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                />
                                <span className="text-gray-600 text-sm w-16">{variable.variable_unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Condensation & Indoor Conditions */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-green-700">Kondens & inomhusklimat</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {costVariables.filter(v =>
                            v.category === 'building_physics' &&
                            (v.variable_key.includes('indoor') || v.variable_key.includes('safety') || v.variable_key.includes('airtightness'))
                          ).map((variable) => (
                            <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                              <div>
                                <div className="font-medium text-gray-800">{variable.description}</div>
                                <div className="text-xs text-gray-500">{variable.variable_key}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step={variable.variable_key.includes('safety') ? '0.5' : '1'}
                                  defaultValue={variable.variable_value}
                                  onBlur={(e) => {
                                    const newValue = parseFloat(e.target.value);
                                    if (!isNaN(newValue) && newValue !== variable.variable_value) {
                                      updateCostVariable(variable.id, newValue);
                                    }
                                  }}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                                />
                                <span className="text-gray-600 text-sm w-16">{variable.variable_unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Flash and Batt */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-orange-700">Flash-and-Batt</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {costVariables.filter(v =>
                            v.category === 'building_physics' &&
                            v.variable_key.includes('flash_batt')
                          ).map((variable) => (
                            <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                              <div>
                                <div className="font-medium text-gray-800">{variable.description}</div>
                                <div className="text-xs text-gray-500">{variable.variable_key}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="5"
                                  defaultValue={variable.variable_value}
                                  onBlur={(e) => {
                                    const newValue = parseFloat(e.target.value);
                                    if (!isNaN(newValue) && newValue !== variable.variable_value) {
                                      updateCostVariable(variable.id, newValue);
                                    }
                                  }}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900"
                                />
                                <span className="text-gray-600 text-sm w-16">{variable.variable_unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BBR U-values */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-teal-700">Krav U-värden (BBR)</h3>
                        <p className="text-sm text-gray-600 mb-3">Byggreglernas krav på maximalt U-värde per byggnadsdel.</p>
                        <div className="grid md:grid-cols-2 gap-4">
                          {[
                            { key: 'yttervagg', label: 'Yttervägg', default: 0.18 },
                            { key: 'tak', label: 'Tak', default: 0.13 },
                            { key: 'golv', label: 'Golv', default: 0.15 },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between border-b pb-3">
                              <div className="font-medium text-gray-800">{item.label}</div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max="1"
                                  defaultValue={(() => {
                                    const current = settings.find(s => s.key === 'bbr_u_values');
                                    return (current?.value as Record<string, number>)?.[item.key] ?? item.default;
                                  })()}
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                      const current = settings.find(s => s.key === 'bbr_u_values');
                                      updateSetting('bbr_u_values', {
                                        ...(current?.value as Record<string, unknown>),
                                        [item.key]: val,
                                      });
                                    }
                                  }}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900"
                                />
                                <span className="text-gray-600 text-sm">W/(m²·K)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-indigo-50 rounded-lg">
                        <p className="text-sm text-indigo-800">
                          <strong>Obs:</strong> Ändringar här påverkar beräkningar för nya offerter.
                          Befintliga offerter behöver räknas om manuellt för att använda nya värden.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message Templates Tab */}
              {activeTab === 'templates' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Meddelandemallar</h2>
                  <p className="text-gray-600 mb-4">
                    Redigera standardmallar för e-postmeddelanden. Använd variabler som{' '}
                    <code className="bg-gray-100 px-1 rounded">{'{{customer_name}}'}</code>,{' '}
                    <code className="bg-gray-100 px-1 rounded">{'{{offer_number}}'}</code>,{' '}
                    <code className="bg-gray-100 px-1 rounded">{'{{offer_link}}'}</code>.
                  </p>

                  {editingTemplate ? (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-medium mb-4">{editingTemplate.name}</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ämne</label>
                          <input
                            type="text"
                            value={editingTemplate.subject}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Meddelande</label>
                          <textarea
                            rows={10}
                            value={editingTemplate.body}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTemplate(editingTemplate)}
                            disabled={saving}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            Spara
                          </button>
                          <button
                            onClick={() => setEditingTemplate(null)}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                          >
                            Avbryt
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <div className="font-medium text-gray-800">{template.name}</div>
                            <div className="text-sm text-gray-500">{template.type}</div>
                          </div>
                          <button
                            onClick={() => setEditingTemplate(template)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Redigera
                          </button>
                        </div>
                      ))}
                      {templates.length === 0 && (
                        <p className="text-gray-500 italic">Inga mallar hittades. Kör databasen migreringen först.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Terms Tab */}
              {activeTab === 'terms' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Villkor</h2>
                  <p className="text-gray-600 mb-4">
                    Hantera villkorspunkter som visas på offerter. Dra för att ändra ordning.
                  </p>

                  {/* Add new term */}
                  <div className="flex gap-2 mb-6">
                    <input
                      type="text"
                      value={newTermText}
                      onChange={(e) => setNewTermText(e.target.value)}
                      placeholder="Ny villkorspunkt..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      onKeyDown={(e) => e.key === 'Enter' && addTerm()}
                    />
                    <button
                      onClick={addTerm}
                      disabled={saving || !newTermText.trim()}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Lägg till
                    </button>
                  </div>

                  {/* Terms list */}
                  <div className="space-y-2">
                    {terms.map((term, index) => (
                      <div
                        key={term.id}
                        className="flex items-center gap-2 p-3 border rounded-lg bg-white"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveTerm(term.id, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveTerm(term.id, 'down')}
                            disabled={index === terms.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                        <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
                        <input
                          type="text"
                          defaultValue={term.text}
                          onBlur={(e) => {
                            if (e.target.value !== term.text) {
                              updateTerm(term.id, e.target.value);
                            }
                          }}
                          className="flex-1 px-2 py-1 border-0 focus:ring-2 focus:ring-green-500 rounded text-gray-900"
                        />
                        <button
                          onClick={() => deleteTerm(term.id)}
                          className="text-red-500 hover:text-red-700 px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {terms.length === 0 && (
                      <p className="text-gray-500 italic">Inga villkor tillagda ännu.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Google Calendar Tab */}
              {activeTab === 'calendar' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Google Kalender</h2>
                  <p className="text-gray-600 mb-6">
                    Synkronisera bokningar med Google Kalender för att se dem i din kalendar-app.
                  </p>

                  {!calendarStatus && !calendarLoading && (
                    <button
                      onClick={loadCalendarStatus}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Kontrollera status
                    </button>
                  )}

                  {calendarLoading && (
                    <div className="text-gray-600">Laddar...</div>
                  )}

                  {calendarStatus && !calendarLoading && (
                    <div className="space-y-6">
                      {/* Connection Status */}
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-medium mb-3 text-gray-800">Anslutningsstatus</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              calendarStatus.connected ? 'bg-green-500' :
                              calendarStatus.configured ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="text-gray-700">
                              {calendarStatus.connected
                                ? `Ansluten till: ${calendarStatus.calendarName}`
                                : calendarStatus.configured
                                ? 'Konfigurerad men ej ansluten'
                                : 'Ej konfigurerad'}
                            </span>
                          </div>

                          {calendarStatus.error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded text-sm">
                              {calendarStatus.error}
                            </div>
                          )}

                          {!calendarStatus.configured && (
                            <div className="p-3 bg-yellow-50 text-yellow-800 rounded text-sm">
                              <strong>Konfiguration krävs:</strong><br />
                              Lägg till följande miljövariabler i Vercel:<br />
                              <code className="block mt-2 p-2 bg-yellow-100 rounded font-mono text-xs">
                                GOOGLE_CLIENT_EMAIL<br />
                                GOOGLE_PRIVATE_KEY<br />
                                GOOGLE_CALENDAR_ID
                              </code>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {calendarStatus.configured && (
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-3 text-gray-800">Åtgärder</h3>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={testCalendarConnection}
                              disabled={calendarLoading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                            >
                              Testa anslutning
                            </button>
                            <button
                              onClick={syncAllBookings}
                              disabled={calendarLoading || !calendarStatus.connected}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                            >
                              Synka alla bokningar
                            </button>
                            <button
                              onClick={pullFromGoogle}
                              disabled={calendarLoading || !calendarStatus.connected}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                            >
                              Hämta från Google
                            </button>
                            <button
                              onClick={loadCalendarStatus}
                              disabled={calendarLoading}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100"
                            >
                              Uppdatera status
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sync Statistics */}
                      {calendarStatus.connected && (
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-3 text-gray-800">Synkroniseringsstatus</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-green-50 rounded">
                              <div className="text-2xl font-bold text-green-700">
                                {calendarStatus.syncedCount || 0}
                              </div>
                              <div className="text-sm text-green-600">Synkade bokningar</div>
                            </div>
                            <div className="p-3 bg-yellow-50 rounded">
                              <div className="text-2xl font-bold text-yellow-700">
                                {calendarStatus.unsyncedBookings?.length || 0}
                              </div>
                              <div className="text-sm text-yellow-600">Ej synkade</div>
                            </div>
                            {calendarStatus.lastSync && (
                              <div className="p-3 bg-blue-50 rounded">
                                <div className="text-sm font-medium text-blue-700">
                                  Senaste synk
                                </div>
                                <div className="text-sm text-blue-600">
                                  {new Date(calendarStatus.lastSync.lastSync).toLocaleString('sv-SE')}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Unsynced Bookings */}
                      {calendarStatus.unsyncedBookings && calendarStatus.unsyncedBookings.length > 0 && (
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-3 text-gray-800">Bokningar utan kalenderhändelse</h3>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {calendarStatus.unsyncedBookings.map((booking) => (
                              <div key={booking.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                <span className="text-gray-700">
                                  #{booking.id} - {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                                </span>
                                <span className="text-gray-500">{booking.scheduled_date}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            Klicka på &quot;Synka alla bokningar&quot; för att lägga till dessa i Google Kalender.
                          </p>
                        </div>
                      )}

                      {/* Setup Instructions */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-2 text-gray-800">Installationsguide</h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                          <li>Gå till <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                          <li>Skapa ett projekt och aktivera Google Calendar API</li>
                          <li>Skapa ett Service Account och ladda ner JSON-nyckeln</li>
                          <li>Dela din Google-kalender med service account-e-posten</li>
                          <li>Lägg till miljövariablerna i Vercel:
                            <ul className="list-disc list-inside ml-4 mt-1 text-gray-600">
                              <li><code>GOOGLE_CLIENT_EMAIL</code> - Service account e-post</li>
                              <li><code>GOOGLE_PRIVATE_KEY</code> - Privat nyckel från JSON</li>
                              <li><code>GOOGLE_CALENDAR_ID</code> - Kalender-ID (vanligen en e-postadress)</li>
                            </ul>
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Forecast Tab */}
              {activeTab === 'forecast' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Prognos & Konverteringsgrad</h2>
                  <p className="text-gray-600 mb-6">
                    Ställ in konverteringsgrader för att beräkna förväntade intäkter och materialbehov.
                  </p>

                  <div className="space-y-6">
                    {/* Sales Conversion Rates */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-4 text-gray-800">Försäljningsprognos</h3>
                      <p className="text-sm text-gray-500 mb-4">Används för att beräkna förväntade intäkter</p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-700">Signerade offerter</div>
                            <div className="text-sm text-gray-500">Accepterade av kund</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={(() => {
                                const current = settings.find(s => s.key === 'conversion_rates');
                                return (current?.value as Record<string, number>)?.signed ?? 100;
                              })()}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-gray-100"
                              disabled
                            />
                            <span className="text-gray-600">%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-700">Skickade offerter</div>
                            <div className="text-sm text-gray-500">Väntar på svar</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={(() => {
                                const current = settings.find(s => s.key === 'conversion_rates');
                                return (current?.value as Record<string, number>)?.sent ?? 50;
                              })()}
                              onBlur={(e) => {
                                const rate = parseInt(e.target.value);
                                const current = settings.find(s => s.key === 'conversion_rates');
                                updateSetting('conversion_rates', {
                                  ...(current?.value as Record<string, number>),
                                  sent: rate,
                                });
                              }}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                            />
                            <span className="text-gray-600">%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-700">Obesvarade förfrågningar</div>
                            <div className="text-sm text-gray-500">Inte skickat offert ännu</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={(() => {
                                const current = settings.find(s => s.key === 'conversion_rates');
                                return (current?.value as Record<string, number>)?.pending ?? 10;
                              })()}
                              onBlur={(e) => {
                                const rate = parseInt(e.target.value);
                                const current = settings.find(s => s.key === 'conversion_rates');
                                updateSetting('conversion_rates', {
                                  ...(current?.value as Record<string, number>),
                                  pending: rate,
                                });
                              }}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                            />
                            <span className="text-gray-600">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Material Conversion Rates */}
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-4 text-gray-800">Materialprognos</h3>
                      <p className="text-sm text-gray-500 mb-4">Används för att beräkna förväntad materialåtgång (ofta lägre än försäljning)</p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-700">Signerade offerter</div>
                            <div className="text-sm text-gray-500">Accepterade av kund</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={(() => {
                                const current = settings.find(s => s.key === 'material_conversion_rates');
                                return (current?.value as Record<string, number>)?.signed ?? 100;
                              })()}
                              onBlur={(e) => {
                                const rate = parseInt(e.target.value);
                                const current = settings.find(s => s.key === 'material_conversion_rates');
                                updateSetting('material_conversion_rates', {
                                  ...(current?.value as Record<string, number>),
                                  signed: rate,
                                });
                              }}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                            />
                            <span className="text-gray-600">%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-700">Skickade offerter</div>
                            <div className="text-sm text-gray-500">Väntar på svar</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={(() => {
                                const current = settings.find(s => s.key === 'material_conversion_rates');
                                return (current?.value as Record<string, number>)?.sent ?? 30;
                              })()}
                              onBlur={(e) => {
                                const rate = parseInt(e.target.value);
                                const current = settings.find(s => s.key === 'material_conversion_rates');
                                updateSetting('material_conversion_rates', {
                                  ...(current?.value as Record<string, number>),
                                  sent: rate,
                                });
                              }}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                            />
                            <span className="text-gray-600">%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-700">Obesvarade förfrågningar</div>
                            <div className="text-sm text-gray-500">Inte skickat offert ännu</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={(() => {
                                const current = settings.find(s => s.key === 'material_conversion_rates');
                                return (current?.value as Record<string, number>)?.pending ?? 5;
                              })()}
                              onBlur={(e) => {
                                const rate = parseInt(e.target.value);
                                const current = settings.find(s => s.key === 'material_conversion_rates');
                                updateSetting('material_conversion_rates', {
                                  ...(current?.value as Record<string, number>),
                                  pending: rate,
                                });
                              }}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                            />
                            <span className="text-gray-600">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Så fungerar prognosen:</strong> Förväntade intäkter beräknas genom att
                        multiplicera varje offerts värde med dess konverteringsgrad. Materialprognosen
                        har typiskt lägre konverteringsgrad då inte alla signerade affärer genomförs.
                      </p>
                    </div>

                    {/* System Tools */}
                    <div className="p-4 border rounded-lg mt-6">
                      <h3 className="font-medium mb-4 text-gray-800">Systemverktyg</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-700">Uppdatera bokningar</div>
                            <div className="text-sm text-gray-500">Lägg till materialdata för befintliga installationsbokningar</div>
                          </div>
                          <button
                            onClick={async () => {
                              setSaving(true);
                              try {
                                const res = await fetch('/api/admin/setup/backfill-booking-materials', { method: 'POST' });
                                const data = await res.json();
                                if (res.ok) {
                                  showMessage(`${data.backfilled} bokningar uppdaterade!`);
                                } else {
                                  showMessage(data.error || 'Fel vid uppdatering');
                                }
                              } catch {
                                showMessage('Fel vid uppdatering');
                              }
                              setSaving(false);
                            }}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            Kör uppdatering
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
