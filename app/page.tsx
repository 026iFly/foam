import Link from 'next/link';

export default async function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Professionell sprutisolering för en Hållbar Framtid
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-green-100">
              Miljövänlig isolering med polyuretanskum som sparar energi och sänker dina kostnader
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kontakt"
                className="bg-white text-green-700 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 transition text-lg"
              >
                Få Kostnadsfri Offert
              </Link>
              <Link
                href="/kalkylator-expert"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-green-700 transition text-lg"
              >
                Expert Priskalkylator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            Varför Välja sprutisolering?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-green-600 text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Energibesparing</h3>
              <p className="text-gray-900">
                Upp till 50% lägre energikostnader tack vare överlägsen isoleringsförmåga och lufttäthet.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-green-600 text-4xl mb-4">🌱</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Miljövänligt</h3>
              <p className="text-gray-900">
                REACH-godkänt material med låga emissioner. Minskar koldioxidutsläpp genom reducerad energiförbrukning.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-green-600 text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Långvarig Lösning</h3>
              <p className="text-gray-900">
                Isolerar och tätar i ett steg. Formstabil och beständig i 50+ år utan att sjunka eller rasa.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-green-600 text-4xl mb-4">💧</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Fuktskydd</h3>
              <p className="text-gray-900">
                Slutencellsskum är fuktbeständigt och förhindrar mögel och röta. Perfekt för källare och krypgrund.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-green-600 text-4xl mb-4">🔇</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Ljudisolering</h3>
              <p className="text-gray-900">
                Minskar buller från omgivningen och förbättrar inomhuskomforten avsevärt.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Certifierad Kvalitet</h3>
              <p className="text-gray-900">
                Vi följer Boverkets byggregler (BBR) och har all nödvändig certifiering enligt svensk lag.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Applications Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-800">
            Användningsområden
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="border-l-4 border-green-600 pl-6">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Villa & Radhus</h3>
              <ul className="text-gray-900 space-y-1">
                <li>• Vindsbjälklag och takisolering</li>
                <li>• Källare och krypgrund</li>
                <li>• Ytterväggar (invändig och utvändig)</li>
                <li>• Garage och förråd</li>
              </ul>
            </div>
            <div className="border-l-4 border-green-600 pl-6">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Kommersiella Byggnader</h3>
              <ul className="text-gray-900 space-y-1">
                <li>• Lager och industrihallar</li>
                <li>• Kontor och butikslokaler</li>
                <li>• Kylanläggningar</li>
                <li>• Renovering av äldre byggnader</li>
              </ul>
            </div>
            <div className="border-l-4 border-green-600 pl-6">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Lantbruk</h3>
              <ul className="text-gray-900 space-y-1">
                <li>• Djurstallar och ladugårdar</li>
                <li>• Maskinhall och förråd</li>
                <li>• Växthus (temperaturkontroll)</li>
              </ul>
            </div>
            <div className="border-l-4 border-green-600 pl-6">
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Specialapplikationer</h3>
              <ul className="text-gray-900 space-y-1">
                <li>• Båthus och marina miljöer</li>
                <li>• Containrar och modulbyggnader</li>
                <li>• Renoveringar och energieffektivisering</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Redo att Sänka Dina Energikostnader?
          </h2>
          <p className="text-xl mb-8 text-green-100 max-w-2xl mx-auto">
            Kontakta oss idag för en kostnadsfri konsultation och offert. Våra certifierade tekniker hjälper dig att hitta den bästa lösningen för ditt projekt.
          </p>
          <Link
            href="/kontakt"
            className="bg-white text-green-700 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 transition text-lg inline-block"
          >
            Kontakta Oss Nu
          </Link>
        </div>
      </section>

      {/* Environmental Focus */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">
              Vårt Miljöengagemang
            </h2>
            <p className="text-lg text-gray-900 mb-4">
              Som en del av Grönteknik.nu arbetar vi för en hållbar framtid. sprutisolering är en av de mest miljövänliga isoleringslösningarna:
            </p>
            <ul className="text-left text-gray-900 space-y-2 mb-6">
              <li>✓ Reducerar energiförbrukningen med upp till 50%</li>
              <li>✓ Minskar koldioxidutsläpp från uppvärmning och kyla</li>
              <li>✓ Lång livslängd = mindre materialåtgång över tid</li>
              <li>✓ REACH-godkända produkter med låga emissioner</li>
              <li>✓ Bidrar till energicertifiering av byggnader</li>
            </ul>
            <p className="text-gray-900">
              Läs mer om vårt hållbarhetsarbete på{' '}
              <a
                href="https://gronteknik.nu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                Grönteknik.nu
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
