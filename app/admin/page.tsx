'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function AdminPage() {
  const [pricing, setPricing] = useState<PricingConfig[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCost[]>([]);
  const [multipliers, setMultipliers] = useState<ProjectMultiplier[]>([]);
  const [costVariables, setCostVariables] = useState<CostVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pricingRes, costVarsRes] = await Promise.all([
        fetch('/api/admin/pricing'),
        fetch('/api/admin/cost-variables')
      ]);

      const pricingData = await pricingRes.json();
      const costVarsData = await costVarsRes.json();

      setPricing(pricingData.pricing || []);
      setAdditionalCosts(pricingData.additionalCosts || []);
      setMultipliers(pricingData.multipliers || []);
      setCostVariables(costVarsData.variables || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoading(false);
    }
  };

  const updatePricing = async (id: number, price: number) => {
    setSaving(true);
    try {
      await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pricing', id, value: price }),
      });
      setMessage('Pris uppdaterat!');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setMessage('Fel vid uppdatering');
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
      setMessage('Kostnad uppdaterad!');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setMessage('Fel vid uppdatering');
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
      setMessage('Multiplikator uppdaterad!');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setMessage('Fel vid uppdatering');
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
      setMessage('Kostnadsvariabel uppdaterad!');
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setMessage('Fel vid uppdatering');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900">Laddar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
            <Link
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Tillbaka till sajten
            </Link>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Snabblänkar</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/admin/quotes"
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Offertförfrågningar
              </Link>
            </div>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
              {message}
            </div>
          )}

          {/* Additional Costs */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Tilläggsavgifter</h2>
            <div className="space-y-4">
              {additionalCosts.map((cost) => (
                <div key={cost.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-medium text-gray-800">{cost.description}</div>
                    <div className="text-sm text-gray-800">
                      {cost.cost_type} • {cost.unit}
                    </div>
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
                    <span className="text-gray-900">
                      {cost.unit === 'percent' ? '%' : 'kr'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Multipliers */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Projekttypsmultiplikatorer</h2>
            <p className="text-gray-900 mb-4">
              Dessa multiplikatorer justerar priset baserat på projektets komplexitet.
            </p>
            <div className="space-y-4">
              {multipliers.map((mult) => (
                <div key={mult.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-medium text-gray-800 capitalize">{mult.project_type}</div>
                    <div className="text-sm text-gray-800">{mult.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="2.0"
                      defaultValue={mult.multiplier}
                      onBlur={(e) => {
                        const newMult = parseFloat(e.target.value);
                        if (newMult !== mult.multiplier) {
                          updateMultiplier(mult.id, newMult);
                        }
                      }}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                    />
                    <span className="text-gray-900">×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Variables */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Kostnadsmodell & Kalkylvariabler</h2>
            <p className="text-gray-900 mb-6">
              Dessa variabler används för att beräkna priser baserat på material, arbetskostnad och transport.
            </p>

            {/* Closed Cell Foam */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-green-700">Slutencellsskum</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {costVariables.filter(v => v.category === 'closed_foam').map((variable) => (
                  <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-medium text-gray-800">{variable.description}</div>
                      <div className="text-sm text-gray-700">{variable.variable_key}</div>
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
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
                      />
                      <span className="text-gray-900 text-sm">{variable.variable_unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open Cell Foam */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-blue-700">Öppencellsskum</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {costVariables.filter(v => v.category === 'open_foam').map((variable) => (
                  <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-medium text-gray-800">{variable.description}</div>
                      <div className="text-sm text-gray-700">{variable.variable_key}</div>
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
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                      <span className="text-gray-900 text-sm">{variable.variable_unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personnel & Equipment */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Personal & Utrustning</h3>
              <div className="space-y-4">
                {costVariables.filter(v => v.category === 'personnel' || v.category === 'equipment' || v.category === 'Personnel & Equipment').map((variable) => (
                  <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-medium text-gray-800">{variable.description}</div>
                      <div className="text-sm text-gray-700">{variable.variable_key}</div>
                    </div>
                    <div className="flex items-center gap-2">
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
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 text-gray-900"
                      />
                      <span className="text-gray-900 text-sm">{variable.variable_unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Travel */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-purple-700">Transport & Resa</h3>
              <div className="space-y-4">
                {costVariables.filter(v => v.category === 'travel' || v.category === 'Travel & Transportation').map((variable) => (
                  <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-medium text-gray-800">{variable.description}</div>
                      <div className="text-sm text-gray-700">{variable.variable_key}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {variable.variable_key === 'company_address' ? (
                        <span className="text-gray-900 font-medium">{variable.description}</span>
                      ) : (
                        <>
                          <input
                            type="number"
                            step={variable.variable_key === 'travel_cost_per_km' ? '1' : '50'}
                            defaultValue={variable.variable_value}
                            onBlur={(e) => {
                              const newValue = parseFloat(e.target.value);
                              if (newValue !== variable.variable_value) {
                                updateCostVariable(variable.id, newValue);
                              }
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                          />
                          <span className="text-gray-900 text-sm">{variable.variable_unit}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Building Physics */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-indigo-700">Byggnadsfysik</h3>
              <p className="text-sm text-gray-600 mb-4">
                Parametrar för kondensationsberäkningar och flash-and-batt-dimensionering.
              </p>
              <div className="space-y-4">
                {costVariables.filter(v => v.category === 'Building Physics').map((variable) => (
                  <div key={variable.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="font-medium text-gray-800">{variable.description}</div>
                      <div className="text-sm text-gray-700">{variable.variable_key}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {variable.variable_key === 'foam_density_closed' || variable.variable_key === 'foam_density_open' ? (
                        <span className="text-gray-900">{variable.variable_value} {variable.variable_unit}</span>
                      ) : (
                        <>
                          <input
                            type="number"
                            step="0.1"
                            defaultValue={variable.variable_value}
                            onBlur={(e) => {
                              const newValue = parseFloat(e.target.value);
                              if (newValue !== variable.variable_value && !isNaN(newValue)) {
                                updateCostVariable(variable.id, newValue);
                              }
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                          />
                          <span className="text-gray-900 text-sm">{variable.variable_unit}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">Information</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Alla priser är exklusive moms (25% moms läggs på automatiskt i kalkylatorn)</li>
              <li>• Ändringar sparas automatiskt när du klickar utanför fältet</li>
              <li>• Kostnadsmodellen beräknar: Material (kg × kostnad + marginal) + Arbetskostnad (tid × timpris) + Transport</li>
              <li>• Multiplikatorer påverkar totalpriset (1.0 = normalpris, 1.2 = 20% dyrare)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
