'use client';

import { useState, useEffect, use } from 'react';

interface RotCustomer {
  name: string;
  personnummer: string;
  share: number;
}

interface QuoteInfo {
  customer_name: string;
  customer_address: string;
  rot_deduction: number;
  already_submitted: boolean;
}

export default function RotInfoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quoteInfo, setQuoteInfo] = useState<QuoteInfo | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [fastighetsbeteckning, setFastighetsbeteckning] = useState('');
  const [customers, setCustomers] = useState<RotCustomer[]>([
    { name: '', personnummer: '', share: 100 }
  ]);

  useEffect(() => {
    fetchQuoteInfo();
  }, [token]);

  const fetchQuoteInfo = async () => {
    try {
      const response = await fetch(`/api/rot-info/${token}`);
      if (response.ok) {
        const data = await response.json();
        setQuoteInfo(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Länken är ogiltig eller har utgått');
      }
    } catch (err) {
      console.error('Error fetching quote info:', err);
      setError('Ett fel uppstod vid hämtning av information');
    }
    setLoading(false);
  };

  const addCustomer = () => {
    if (customers.length < 4) {
      const newShare = Math.floor(100 / (customers.length + 1));
      const updatedCustomers = customers.map(c => ({ ...c, share: newShare }));
      updatedCustomers.push({ name: '', personnummer: '', share: newShare });
      // Adjust last customer to make total 100
      const totalShare = updatedCustomers.reduce((sum, c) => sum + c.share, 0);
      if (totalShare !== 100) {
        updatedCustomers[updatedCustomers.length - 1].share += (100 - totalShare);
      }
      setCustomers(updatedCustomers);
    }
  };

  const removeCustomer = (index: number) => {
    if (customers.length > 1) {
      const newCustomers = customers.filter((_, i) => i !== index);
      // Redistribute shares
      const sharePerCustomer = Math.floor(100 / newCustomers.length);
      const remainder = 100 - (sharePerCustomer * newCustomers.length);
      const updatedCustomers = newCustomers.map((c, i) => ({
        ...c,
        share: sharePerCustomer + (i === 0 ? remainder : 0)
      }));
      setCustomers(updatedCustomers);
    }
  };

  const updateCustomer = (index: number, field: keyof RotCustomer, value: string | number) => {
    setCustomers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const formatPersonnummer = (value: string) => {
    // Remove any non-digits
    const digits = value.replace(/\D/g, '');
    // Format as YYYYMMDD-XXXX
    if (digits.length > 8) {
      return digits.slice(0, 8) + '-' + digits.slice(8, 12);
    }
    return digits;
  };

  const validatePersonnummer = (pnr: string) => {
    const clean = pnr.replace(/\D/g, '');
    return clean.length === 12;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!fastighetsbeteckning.trim()) {
      setError('Fastighetsbeteckning krävs');
      return;
    }

    for (let i = 0; i < customers.length; i++) {
      if (!customers[i].name.trim()) {
        setError(`Namn krävs för person ${i + 1}`);
        return;
      }
      if (!validatePersonnummer(customers[i].personnummer)) {
        setError(`Ogiltigt personnummer för ${customers[i].name || `person ${i + 1}`}. Ange 12 siffror (ÅÅÅÅMMDD-XXXX)`);
        return;
      }
    }

    const totalShare = customers.reduce((sum, c) => sum + c.share, 0);
    if (totalShare !== 100) {
      setError('Fördelningen av ROT-avdrag måste summera till 100%');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/rot-info/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fastighetsbeteckning: fastighetsbeteckning.trim(),
          customers: customers.map(c => ({
            name: c.name.trim(),
            personnummer: c.personnummer.replace(/\D/g, ''),
            share: c.share
          }))
        })
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ett fel uppstod vid sparande');
      }
    } catch (err) {
      console.error('Error submitting ROT info:', err);
      setError('Ett fel uppstod vid anslutningen');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Laddar...</div>
      </div>
    );
  }

  if (error && !quoteInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Länken är ogiltig</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success || quoteInfo?.already_submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {success ? 'Tack!' : 'Redan inskickat'}
          </h1>
          <p className="text-gray-600">
            {success
              ? 'Din ROT-information har sparats. Vi kommer att använda dessa uppgifter för att ansöka om ROT-avdrag.'
              : 'ROT-informationen för denna offert har redan skickats in.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-green-600 text-white rounded-t-lg p-6 text-center">
          <h1 className="text-2xl font-bold">ROT-avdrag Information</h1>
          <p className="text-green-100 mt-2">IntelliRay Isolering</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-lg shadow-md p-6">
          {/* Quote Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-800 mb-2">Offertdetaljer</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Kund:</strong> {quoteInfo?.customer_name}</p>
              <p><strong>Adress:</strong> {quoteInfo?.customer_address}</p>
              <p><strong>ROT-avdrag:</strong> {quoteInfo?.rot_deduction?.toLocaleString('sv-SE')} kr</p>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            För att vi ska kunna ansöka om ROT-avdrag för ditt räkning behöver vi följande uppgifter.
            Alla uppgifter hanteras enligt GDPR och används endast för ROT-ansökan.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fastighetsbeteckning */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fastighetsbeteckning *
              </label>
              <input
                type="text"
                value={fastighetsbeteckning}
                onChange={(e) => setFastighetsbeteckning(e.target.value)}
                placeholder="T.ex. STOCKHOLM SÖDERMALM 1:234"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fastighetsbeteckningen finns på din senaste fastighetstaxering eller i lagfarten
              </p>
            </div>

            {/* Customers */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Personer som ska få ROT-avdrag *
                </label>
                {customers.length < 4 && (
                  <button
                    type="button"
                    onClick={addCustomer}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    + Lägg till person
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {customers.map((customer, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-700">Person {idx + 1}</span>
                      {customers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCustomer(idx)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Ta bort
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Namn</label>
                        <input
                          type="text"
                          value={customer.name}
                          onChange={(e) => updateCustomer(idx, 'name', e.target.value)}
                          placeholder="Förnamn Efternamn"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Personnummer (12 siffror)</label>
                        <input
                          type="text"
                          value={customer.personnummer}
                          onChange={(e) => updateCustomer(idx, 'personnummer', formatPersonnummer(e.target.value))}
                          placeholder="ÅÅÅÅMMDD-XXXX"
                          maxLength={13}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                        />
                      </div>

                      {customers.length > 1 && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Andel av ROT-avdrag (%)</label>
                          <input
                            type="number"
                            value={customer.share}
                            onChange={(e) => updateCustomer(idx, 'share', parseInt(e.target.value) || 0)}
                            min={1}
                            max={100}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {customers.length > 1 && (
                <p className="text-xs text-gray-500 mt-2">
                  Total fördelning: {customers.reduce((sum, c) => sum + c.share, 0)}%
                  {customers.reduce((sum, c) => sum + c.share, 0) !== 100 && (
                    <span className="text-red-600"> (måste vara 100%)</span>
                  )}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
            >
              {submitting ? 'Skickar...' : 'Skicka ROT-information'}
            </button>
          </form>

          {/* Privacy notice */}
          <p className="text-xs text-gray-500 text-center mt-6">
            Genom att skicka in denna information godkänner du att vi lagrar och behandlar dina personuppgifter
            i enlighet med GDPR för att kunna ansöka om ROT-avdrag hos Skatteverket.
          </p>
        </div>
      </div>
    </div>
  );
}
