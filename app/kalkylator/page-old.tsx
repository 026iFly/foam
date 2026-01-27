'use client';

import { useState } from 'react';

export default function CalculatorPage() {
  const [area, setArea] = useState<number>(0);
  const [thickness, setThickness] = useState<number>(10);
  const [foamType, setFoamType] = useState<'open' | 'closed'>('closed');
  const [projectType, setProjectType] = useState<string>('vind');

  // Price per m² (example prices in SEK)
  const pricePerM2 = {
    open: {
      base: 250, // kr/m² for 10cm
      perCm: 25, // additional cost per cm
    },
    closed: {
      base: 400, // kr/m² for 10cm
      perCm: 40, // additional cost per cm
    },
  };

  const calculatePrice = () => {
    if (area <= 0) return 0;

    const basePrice = pricePerM2[foamType].base;
    const additionalCost = (thickness - 10) * pricePerM2[foamType].perCm;
    const pricePerSquareMeter = basePrice + additionalCost;

    // Project type multiplier
    let multiplier = 1;
    if (projectType === 'vagg') multiplier = 1.2; // Walls are more complex
    if (projectType === 'kallare') multiplier = 1.15; // Basement requires prep
    if (projectType === 'krypgrund') multiplier = 1.3; // Crawl space is difficult

    return Math.round(area * pricePerSquareMeter * multiplier);
  };

  const estimatedPrice = calculatePrice();

  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
            Priskalkylator
          </h1>
          <p className="text-xl text-center text-gray-900 mb-12">
            Få en uppskattning av kostnaden för ditt projekt
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Calculator Form */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-6">Projektdetaljer</h2>

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
                    <option value="vind">Vind/Tak</option>
                    <option value="vagg">Vägg</option>
                    <option value="kallare">Källare</option>
                    <option value="krypgrund">Krypgrund</option>
                    <option value="garage">Garage</option>
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
                    Tjocklek: {thickness} cm
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={thickness}
                    onChange={(e) => setThickness(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-800">
                    <span>5 cm</span>
                    <span>15 cm</span>
                    <span>30 cm</span>
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
                        <div className="font-medium">Slutencellsskum (Rekommenderas)</div>
                        <div className="text-sm text-gray-900">
                          Bäst isolering, fuktbeständigt, högre R-värde
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
                        <div className="font-medium">Öppencellsskum</div>
                        <div className="text-sm text-gray-900">
                          Ekonomiskt alternativ, bra ljuddämpning
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
                <h2 className="text-2xl font-semibold mb-6">Uppskattad Kostnad</h2>

                <div className="text-center mb-6">
                  <div className="text-5xl font-bold mb-2">
                    {estimatedPrice.toLocaleString('sv-SE')} kr
                  </div>
                  <div className="text-green-100">
                    exkl. moms
                  </div>
                </div>

                <div className="border-t border-green-600 pt-6 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-100">Yta:</span>
                    <span className="font-medium">{area} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-100">Tjocklek:</span>
                    <span className="font-medium">{thickness} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-100">Skumtyp:</span>
                    <span className="font-medium">
                      {foamType === 'closed' ? 'Slutencellsskum' : 'Öppencellsskum'}
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-green-600">
                  <h3 className="font-semibold mb-2">Detta ingår:</h3>
                  <ul className="space-y-1 text-sm text-green-100">
                    <li>✓ Material och arbetskostnad</li>
                    <li>✓ Förberedande arbete</li>
                    <li>✓ Skyddsutrustning</li>
                    <li>✓ Efterarbete och städning</li>
                  </ul>
                </div>

                <a
                  href="/kontakt"
                  className="block w-full bg-white text-green-700 py-3 rounded-lg font-semibold hover:bg-green-50 transition text-center mt-6"
                >
                  Få Exakt Offert
                </a>
              </div>

              <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>OBS:</strong> Detta är en uppskattning. Exakt pris beror på platsens förutsättningar, tillgänglighet och eventuella specialkrav.
                </p>
              </div>
            </div>
          </div>

          {/* Information Section */}
          <div className="mt-12 bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold mb-4">Faktorer som påverkar priset</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Höjer kostnaden:</h3>
                <ul className="text-gray-900 space-y-1 text-sm">
                  <li>• Svåråtkomliga ytor (t.ex. krypgrund)</li>
                  <li>• Komplex geometri med många hörn</li>
                  <li>• Behov av extra förberedelse</li>
                  <li>• Extra tjocka lager ({'>'} 20 cm)</li>
                  <li>• Specialkrav på ventilation</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Sänker kostnaden:</h3>
                <ul className="text-gray-900 space-y-1 text-sm">
                  <li>• Stora, öppna ytor</li>
                  <li>• Bra tillgänglighet</li>
                  <li>• Färdiga, rena underlag</li>
                  <li>• Flera projekt samtidigt</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
