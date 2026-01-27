import Link from 'next/link';

export const metadata = {
  title: 'Våra Tjänster - Professionell sprutisolering | Intellifoam',
  description: 'Vi erbjuder professionell sprutisolering med både öppencellsskum och slutencellsskum. BBR-certifierade och miljövänliga lösningar.',
};

export default function ServicesPage() {
  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
            Våra Tjänster
          </h1>
          <p className="text-xl text-center text-gray-900 mb-12">
            Professionell sprutisolering för alla typer av byggnader
          </p>

          {/* Main Services */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Slutencellsskum (Closed-Cell)
              </h2>
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  REKOMMENDERAS
                </span>
              </div>
              <p className="text-gray-900 mb-4">
                Den mest effektiva isoleringslösningen med högsta R-värdet. Perfekt för maximala krav på isolering och fuktskydd.
              </p>
              <h3 className="font-semibold text-gray-800 mb-2">Egenskaper (DMJ-Spray500):</h3>
              <ul className="text-gray-900 space-y-2 mb-4">
                <li>• <strong>Densitet:</strong> 35+ kg/m³ (30-55 kg/m³ justerbart)</li>
                <li>• <strong>K-faktor:</strong> ≤0.024 W/(m·K) (utmärkt isolering)</li>
                <li>• <strong>Tryckhållfasthet:</strong> ≥150 KPa</li>
                <li>• <strong>Slutencellsgrad:</strong> ≥90%</li>
                <li>• <strong>Fuktbeständig:</strong> Vattenupptag ≤3%</li>
                <li>• <strong>Brandklass:</strong> B2 (med flammskyddsmedel)</li>
                <li>• <strong>Livslängd:</strong> 50+ år utan degradering</li>
              </ul>
              <h3 className="font-semibold text-gray-800 mb-2">Bäst för:</h3>
              <ul className="text-gray-900 space-y-1">
                <li>✓ Källare och krypgrund</li>
                <li>✓ Ytterväggar</li>
                <li>✓ Tak och vindar</li>
                <li>✓ Kylanläggningar</li>
                <li>✓ Marina miljöer</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                Öppencellsskum (Open-Cell)
              </h2>
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  EKONOMISKT ALTERNATIV
                </span>
              </div>
              <p className="text-gray-900 mb-4">
                Kostnadseffektiv lösning med utmärkt ljuddämpning. Idealisk för invändiga applikationer.
              </p>
              <h3 className="font-semibold text-gray-800 mb-2">Egenskaper (DmjSpray-501F):</h3>
              <ul className="text-gray-900 space-y-2 mb-4">
                <li>• <strong>Densitet:</strong> 8-12 kg/m³ (ultralätt)</li>
                <li>• <strong>K-faktor:</strong> ≤0.040 W/(m·K)</li>
                <li>• <strong>Tryckhållfasthet:</strong> ≥13 KPa</li>
                <li>• <strong>Öppencellsgrad:</strong> ≥99%</li>
                <li>• <strong>Ljudabsorption:</strong> 0.43% (800-6300 Hz)</li>
                <li>• <strong>Vattenblåst:</strong> Miljövänligt, inga ozonnedbrytande ämnen</li>
                <li>• <strong>Kostnadseffektiv:</strong> Lägre materialkostnad</li>
              </ul>
              <h3 className="font-semibold text-gray-800 mb-2">Bäst för:</h3>
              <ul className="text-gray-900 space-y-1">
                <li>✓ Invändiga väggar</li>
                <li>✓ Vindsbjälklag</li>
                <li>✓ Ljudisolering mellan rum</li>
                <li>✓ Budget-projekt</li>
              </ul>
            </div>
          </div>

          {/* Installation Process */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-3xl font-semibold mb-6 text-gray-800">
              Installationsprocessen
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center text-green-700 font-bold text-xl mb-3">
                  1
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">Konsultation</h3>
                <p className="text-gray-900 text-sm">
                  Vi inspekterar platsen och diskuterar dina behov och mål.
                </p>
              </div>
              <div>
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center text-green-700 font-bold text-xl mb-3">
                  2
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">Förberedelse</h3>
                <p className="text-gray-900 text-sm">
                  Ytan förbereds, maskering utförs och all utrustning ställs i ordning.
                </p>
              </div>
              <div>
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center text-green-700 font-bold text-xl mb-3">
                  3
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">Applicering</h3>
                <p className="text-gray-900 text-sm">
                  Skummet appliceras med professionell utrustning i rätt tjocklek.
                </p>
              </div>
              <div>
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center text-green-700 font-bold text-xl mb-3">
                  4
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">Kvalitetskontroll</h3>
                <p className="text-gray-900 text-sm">
                  Noggrann inspektion, trimning och städning utförs.
                </p>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-3xl font-semibold mb-6 text-gray-800">
              Tekniska Specifikationer
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Prestanda</h3>
                <table className="w-full text-sm">
                  <tbody className="text-gray-900">
                    <tr className="border-b">
                      <td className="py-2 text-gray-900">Värmeisolering (λ-värde)</td>
                      <td className="py-2 text-right font-medium text-gray-900">0.020-0.025 W/(m·K)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-900">Lufttäthet</td>
                      <td className="py-2 text-right font-medium text-gray-900">Nästan 100%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-900">Ljudreduktion</td>
                      <td className="py-2 text-right font-medium text-gray-900">Upp till 50 dB</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 text-gray-900">Brandklass</td>
                      <td className="py-2 text-right font-medium text-gray-900">E (med tillsatser)</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-gray-900">Appliceringstemperatur</td>
                      <td className="py-2 text-right font-medium text-gray-900">+10°C till +30°C</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Certifieringar & Standarder</h3>
                <ul className="space-y-2 text-gray-900">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>CE-märkning:</strong> Enligt CPR (Construction Products Regulation)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>BBR:</strong> Uppfyller Boverkets Byggregler</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>REACH:</strong> Godkänd enligt EU:s kemikalieförordning</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>AFS:</strong> Följer Arbetsmiljöverkets föreskrifter</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span><strong>ISO 14001:</strong> Miljöledningssystem</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="bg-green-700 text-white rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-3xl font-semibold mb-6 text-center text-white">
              Varför Välja Oss?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🎓</div>
                <h3 className="font-semibold mb-2 text-white">Certifierade Tekniker</h3>
                <p className="text-green-100 text-sm">
                  Våra tekniker har genomgått obligatorisk utbildning enligt REACH-förordningen för hantering av diisocyanater.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🛡️</div>
                <h3 className="font-semibold mb-2 text-white">Försäkrade & Garantier</h3>
                <p className="text-green-100 text-sm">
                  Fullständig ansvarsförsäkring och garantier på både material och arbete.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🌱</div>
                <h3 className="font-semibold mb-2 text-white">Miljöfokus</h3>
                <p className="text-green-100 text-sm">
                  Som en del av Grönteknik.nu arbetar vi aktivt för hållbara och miljövänliga lösningar.
                </p>
              </div>
            </div>
          </div>

          {/* Safety Information */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-3xl font-semibold mb-6 text-gray-800">
              Säkerhet & Miljö
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Under Installation</h3>
                <p className="text-gray-900 mb-3">
                  Vi vidtar alla nödvändiga säkerhetsåtgärder:
                </p>
                <ul className="text-gray-900 space-y-2">
                  <li>• Fullständig skyddsutrustning för personal</li>
                  <li>• Avspärrning av arbetsområdet</li>
                  <li>• Ventilationskontroll</li>
                  <li>• Brandsäkerhetsrutiner</li>
                  <li>• Ingen vistelse under applicering</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">Efter Installation</h3>
                <p className="text-gray-900 mb-3">
                  När skummet härdat är det helt säkert:
                </p>
                <ul className="text-gray-900 space-y-2">
                  <li>• Inga skadliga emissioner efter härdning (24-48h)</li>
                  <li>• Inert material, reagerar inte kemiskt</li>
                  <li>• Mögel- och bakterieresistent</li>
                  <li>• Innehåller inga VOC efter härdning</li>
                  <li>• Säkert för bostäder och känsliga miljöer</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              Redo att Komma Igång?
            </h2>
            <p className="text-xl text-gray-900 mb-6">
              Kontakta oss för en kostnadsfri konsultation och offert
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kontakt"
                className="bg-green-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-800 transition text-lg"
              >
                Kontakta Oss
              </Link>
              <Link
                href="/kalkylator"
                className="border-2 border-green-700 text-green-700 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 transition text-lg"
              >
                Priskalkylator
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
