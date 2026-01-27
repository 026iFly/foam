'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PricingData {
  id: number;
  foam_type: string;
  thickness_mm: number;
  price_per_m2_excl_vat: number;
}

interface MultiplierData {
  id: number;
  project_type: string;
  multiplier: number;
  description: string | null;
}

export default function CalculatorPage() {
  const [area, setArea] = useState<number>(0);
  const [thickness, setThickness] = useState<number>(100);
  const [foamType, setFoamType] = useState<'open' | 'closed'>('closed');
  const [projectType, setProjectType] = useState<string>('vind');

  const [pricingData, setPricingData] = useState<PricingData[]>([]);
  const [multipliers, setMultipliers] = useState<MultiplierData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch pricing data
  useEffect(() => {
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        setPricingData(data.pricing);
        setMultipliers(data.multipliers);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load pricing:', err);
        setLoading(false);
      });
  }, []);

  const calculatePrice = () => {
    if (area <= 0 || loading) return 0;

    // Find closest pricing for the selected thickness
    const relevantPricing = pricingData.filter(p => p.foam_type === foamType);
    if (relevantPricing.length === 0) return 0;

    // Find the pricing entry closest to the selected thickness
    const sortedPricing = [...relevantPricing].sort((a, b) =>
      Math.abs(a.thickness_mm - thickness) - Math.abs(b.thickness_mm - thickness)
    );

    const basePricing = sortedPricing[0];

    // Calculate price per m² based on thickness difference
    // Approximate linear interpolation
    const thicknessDiff = thickness - basePricing.thickness_mm;
    const priceAdjustment = thicknessDiff * (foamType === 'closed' ? 1.4 : 1.1); // SEK per mm difference
    const pricePerM2 = basePricing.price_per_m2_excl_vat + priceAdjustment;

    // Apply project type multiplier
    const multiplier = multipliers.find(m => m.project_type === projectType)?.multiplier || 1.0;

    const totalExclVat = area * pricePerM2 * multiplier;
    const totalInclVat = totalExclVat * 1.25; // 25% VAT

    return Math.round(totalInclVat);
  };

  const estimatedPrice = calculatePrice();
  const priceExclVat = Math.round(estimatedPrice / 1.25);

  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Expert Calculator Notice */}
          <div className="mb-6 bg-blue-600 text-white rounded-lg p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1 text-white">Behöver du daggpunktsanalys och ångspärrsrådgivning?</h3>
                <p className="text-sm text-blue-100">
                  Prova vår expertkalkylatorn med byggfysik enligt svenska byggstandard er
                </p>
              </div>
              <Link
                href="/kalkylator-expert"
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition whitespace-nowrap ml-4"
              >
                Expert Kalkylator →
              </Link>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
            Enkel Priskalkylator
          </h1>
          <p className="text-xl text-center text-gray-900 mb-12">
            Få en snabb uppskattning av kostnaden för ditt projekt
          </p>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-900">Laddar prisdata...</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Calculator Form */}
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-semibold mb-6 text-gray-900">Projektdetaljer</h2>

                <div className="space-y-6">
                  {/* Project Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Projekttyp
                    </label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {multipliers.map(m => (
                        <option key={m.project_type} value={m.project_type}>
                          {m.project_type.charAt(0).toUpperCase() + m.project_type.slice(1)}
                          {m.description && ` - ${m.description}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yta (m²)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={area || ''}
                      onChange={(e) => setArea(Number(e.target.value))}
                      placeholder="Ange yta i kvadratmeter"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-800 mt-1">
                      Exempel: Ett vindsbjälklag på 100 m²
                    </p>
                  </div>

                  {/* Thickness */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tjocklek: {thickness} mm
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="10"
                      value={thickness}
                      onChange={(e) => setThickness(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-800">
                      <span>50 mm</span>
                      <span>100 mm</span>
                      <span>200 mm</span>
                    </div>
                  </div>

                  {/* Foam Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Typ av skum
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name="foamType"
                          value="closed"
                          checked={foamType === 'closed'}
                          onChange={() => setFoamType('closed')}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Slutencellsskum (Rekommenderas)</div>
                          <div className="text-sm text-gray-900">
                            Bäst isolering, fuktbeständigt, högre R-värde. Densitet 35+ kg/m³
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name="foamType"
                          value="open"
                          checked={foamType === 'open'}
                          onChange={() => setFoamType('open')}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Öppencellsskum</div>
                          <div className="text-sm text-gray-900">
                            Ekonomiskt alternativ, bra ljuddämpning. Densitet 8-12 kg/m³
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Estimate */}
              <div>
                <div className="bg-green-700 text-white rounded-lg shadow-md p-8 sticky top-4">
                  <h2 className="text-2xl font-semibold mb-6 text-white">Uppskattad Kostnad</h2>

                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold mb-2 text-white">
                      {estimatedPrice.toLocaleString('sv-SE')} kr
                    </div>
                    <div className="text-green-100 mb-1">
                      inkl. moms
                    </div>
                    <div className="text-sm text-green-200">
                      ({priceExclVat.toLocaleString('sv-SE')} kr exkl. moms)
                    </div>
                  </div>

                  <div className="border-t border-green-600 pt-6 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-100">Yta:</span>
                      <span className="font-medium text-white">{area} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-100">Tjocklek:</span>
                      <span className="font-medium text-white">{thickness} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-100">Skumtyp:</span>
                      <span className="font-medium text-white">
                        {foamType === 'closed' ? 'Slutencellsskum' : 'Öppencellsskum'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-100">Projekttyp:</span>
                      <span className="font-medium capitalize text-white">{projectType}</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-green-600">
                    <h3 className="font-semibold mb-2 text-white">Detta ingår:</h3>
                    <ul className="space-y-1 text-sm text-green-100">
                      <li>✓ Material och arbetskostnad</li>
                      <li>✓ Förberedande arbete</li>
                      <li>✓ Skyddsutrustning</li>
                      <li>✓ Efterarbete och städning</li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-6 border-t border-green-600 text-sm text-green-100">
                    <p className="mb-2 text-white">Eventuella tillägg:</p>
                    <ul className="space-y-1">
                      <li>• Etablering/resor: 4 500 kr + moms</li>
                      <li>• Elverk: 2 000 kr/dygn + moms</li>
                      <li>• Extra arbete: 625 kr/timme + moms</li>
                    </ul>
                  </div>

                  <Link
                    href="/kontakt"
                    className="block w-full bg-white text-green-700 py-3 rounded-lg font-semibold hover:bg-green-50 transition text-center mt-6"
                  >
                    Få Exakt Offert
                  </Link>
                </div>

                <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>OBS:</strong> Detta är en uppskattning baserad på aktuella priser. Exakt pris beror på platsens förutsättningar, tillgänglighet och eventuella specialkrav.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Information Section */}
          <div className="mt-12 bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">Faktorer som påverkar priset</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Höjer kostnaden:</h3>
                <ul className="text-gray-900 space-y-1 text-sm">
                  <li>• Svåråtkomliga ytor (t.ex. krypgrund)</li>
                  <li>• Komplex geometri med många hörn</li>
                  <li>• Behov av extra förberedelse och maskning</li>
                  <li>• Extra tjocka lager ({'>'} 150 mm)</li>
                  <li>• Behov av elverk eller dieselvärmare</li>
                  <li>• Långa resor till arbetsplatsen</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Sänker kostnaden:</h3>
                <ul className="text-gray-900 space-y-1 text-sm">
                  <li>• Stora, öppna ytor utan hinder</li>
                  <li>• Bra tillgänglighet och arbetshöjd</li>
                  <li>• Färdiga, rena och torra underlag</li>
                  <li>• Tillgång till el (380V 25A) på plats</li>
                  <li>• ROT-avdrag kan sänka slutkostnaden med ca 10%</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded">
              <h3 className="font-semibold text-gray-800 mb-2">Baserat på verkliga offerter</h3>
              <p className="text-sm text-gray-700">
                Priskalkylationen är baserad på aktuella offerter från PUR-gruppens certifierade installatörer.
                Priserna uppdateras regelbundet för att spegla marknadspriserna.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
