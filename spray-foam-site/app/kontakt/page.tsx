'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { CalculationData } from '@/lib/types/quote';

function ContactPageContent() {
  const searchParams = useSearchParams();
  const fromCalculator = searchParams.get('from') === 'calculator';

  const [calculationData, setCalculationData] = useState<CalculationData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    project_type: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Load calculation data from sessionStorage
  useEffect(() => {
    if (fromCalculator) {
      const storedData = sessionStorage.getItem('quoteCalculationData');
      if (storedData) {
        try {
          const data = JSON.parse(storedData) as CalculationData;
          setCalculationData(data);
          // Pre-fill address from calculator
          if (data.options?.customerAddress) {
            setFormData(prev => ({ ...prev, address: data.options.customerAddress }));
          }
        } catch (e) {
          console.error('Error parsing calculation data:', e);
        }
      }
    }
  }, [fromCalculator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        project_type: formData.project_type,
      };

      // Include calculation data if coming from calculator
      if (calculationData) {
        payload.calculation_data = calculationData;
        payload.customer_address = formData.address;
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', phone: '', address: '', project_type: '', message: '' });
        // Clear the stored calculation data
        sessionStorage.removeItem('quoteCalculationData');
        setCalculationData(null);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Ett fel uppstod');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setStatus('error');
      setErrorMessage('Ett fel uppstod vid anslutningen');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
            {calculationData ? 'Begär Offert' : 'Kontakta Oss'}
          </h1>
          <p className="text-xl text-center text-gray-900 mb-12">
            {calculationData
              ? 'Granska din beräkning och skicka in för en exakt offert'
              : 'Få en kostnadsfri konsultation och offert för ditt projekt'
            }
          </p>

          {/* Calculation Summary Panel */}
          {calculationData && (
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Din Beräkning</h2>

              {/* Building parts summary */}
              <div className="space-y-4 mb-6">
                {calculationData.recommendations.map((rec, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{rec.partName}</h3>
                        <p className="text-sm text-gray-700">
                          {rec.area} m² | {rec.totalThickness} mm total tjocklek
                        </p>
                        <p className="text-sm text-gray-600">
                          {rec.closedCellThickness > 0 && `Slutencell: ${rec.closedCellThickness} mm`}
                          {rec.closedCellThickness > 0 && rec.openCellThickness > 0 && ' + '}
                          {rec.openCellThickness > 0 && `Öppencell: ${rec.openCellThickness} mm`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-green-600">
                          {Math.round(rec.materialCost * 1.25).toLocaleString('sv-SE')} kr
                        </span>
                        <p className="text-xs text-gray-600">inkl. moms</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total yta:</span>
                    <span className="font-medium text-gray-900">{calculationData.totals.totalArea} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Summa exkl. moms:</span>
                    <span className="font-medium text-gray-900">{calculationData.totals.totalExclVat.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Moms (25%):</span>
                    <span className="font-medium text-gray-900">{calculationData.totals.vat.toLocaleString('sv-SE')} kr</span>
                  </div>
                  {calculationData.totals.rotDeduction > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>ROT-avdrag:</span>
                      <span className="font-medium">- {calculationData.totals.rotDeduction.toLocaleString('sv-SE')} kr</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-green-300">
                    <span className="font-semibold text-gray-900">Totalt att betala:</span>
                    <span className="text-xl font-bold text-green-700">
                      {calculationData.totals.finalTotal.toLocaleString('sv-SE')} kr
                    </span>
                  </div>
                </div>
              </div>

              {/* Climate settings summary */}
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  Klimatzon: {calculationData.climate.zone} |
                  Adress: {calculationData.options.customerAddress} |
                  {calculationData.options.hasThreePhase ? ' 3-fas tillgänglig' : ' Generator behövs'} |
                  {calculationData.options.applyRotDeduction ? ' ROT-avdrag' : ' Inget ROT'}
                </p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">
                {calculationData ? 'Dina Uppgifter' : 'Skicka en förfrågan'}
              </h2>

              {status === 'success' && (
                <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
                  {calculationData
                    ? 'Tack! Din offertförfrågan har skickats. Vi återkommer med en exakt offert så snart som möjligt.'
                    : 'Tack för din förfrågan! Vi återkommer till dig så snart som möjligt.'
                  }
                </div>
              )}

              {status === 'error' && (
                <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
                  {errorMessage || 'Något gick fel. Vänligen försök igen eller ring oss direkt.'}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Namn *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-post *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  />
                </div>

                {/* Address field - always shown for quote requests, optional for regular contact */}
                {calculationData ? (
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Projektets adress *
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="project_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Typ av projekt
                    </label>
                    <select
                      id="project_type"
                      name="project_type"
                      value={formData.project_type}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">Välj projekttyp</option>
                      <option value="villa">Villa/Radhus</option>
                      <option value="kommersiell">Kommersiell byggnad</option>
                      <option value="lantbruk">Lantbruk</option>
                      <option value="renovering">Renovering</option>
                      <option value="annat">Annat</option>
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    {calculationData ? 'Meddelande (valfritt)' : 'Meddelande *'}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required={!calculationData}
                    rows={calculationData ? 3 : 5}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={calculationData
                      ? 'Eventuella frågor eller ytterligare information...'
                      : 'Beskriv ditt projekt och vad du behöver hjälp med...'
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition disabled:bg-gray-400"
                >
                  {status === 'submitting'
                    ? 'Skickar...'
                    : calculationData
                      ? 'Skicka Offertförfrågan'
                      : 'Skicka Förfrågan'
                  }
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <div className="bg-white rounded-lg shadow-md p-8 mb-6">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900">Kontaktinformation</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Telefon</h3>
                    <p className="text-gray-900">+46 XX XXX XX XX</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">E-post</h3>
                    <p className="text-gray-900">info@intelliray.se</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Öppettider</h3>
                    <p className="text-gray-900">Måndag - Fredag: 08:00 - 17:00</p>
                    <p className="text-gray-900">Lördag - Söndag: Stängt</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {calculationData ? 'Vad händer härnäst?' : 'Kostnadsfri Konsultation'}
                </h3>
                <p className="text-gray-900">
                  {calculationData
                    ? 'Vi granskar din beräkning och återkommer med en exakt offert inom 24 timmar. Du kan sedan välja att acceptera eller be om justeringar.'
                    : 'Vi erbjuder alltid en kostnadsfri konsultation där vi bedömer ditt projekt och ger rekommendationer för bästa lösning.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function ContactPageFallback() {
  return (
    <div className="py-16 bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Laddar...</div>
    </div>
  );
}

// Wrap the page in Suspense because it uses useSearchParams
export default function ContactPage() {
  return (
    <Suspense fallback={<ContactPageFallback />}>
      <ContactPageContent />
    </Suspense>
  );
}
