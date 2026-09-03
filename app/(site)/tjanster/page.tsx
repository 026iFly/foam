import Image from 'next/image';
import { Container, Card, Button, SectionTitle } from '@/app/components/ui';
import CtaBand from '@/app/components/CtaBand';
import { IconCheck } from '@/app/components/icons';

export const metadata = {
  title: 'Tjänster – sprutisolering med sluten- och öppencellsskum | IntelliFoam',
  description: 'Sprutisolering för krypgrund, vind, väggar, lantbruk och kommersiella byggnader. Slutencellsskum eller öppencellsskum – vi hjälper dig välja rätt.',
};

const CHOICE = [
  { need: 'Krypgrund, källare eller annat fuktigt utrymme', pick: 'Slutencell' },
  { need: 'Ytterväggar och tak där du vill ha bästa isolering per cm', pick: 'Slutencell' },
  { need: 'Kylrum, marina miljöer, containrar', pick: 'Slutencell' },
  { need: 'Invändiga väggar och bjälklag – främst ljud', pick: 'Öppencell' },
  { need: 'Torr vind med gott om utrymme, budgetfokus', pick: 'Öppencell' },
];

const STEPS = [
  { n: 1, title: 'Konsultation', text: 'Vi inspekterar platsen och går igenom dina behov och mål.' },
  { n: 2, title: 'Förberedelse', text: 'Ytan förbereds, maskering utförs och utrustningen ställs i ordning.' },
  { n: 3, title: 'Applicering', text: 'Skummet appliceras med professionell utrustning i rätt tjocklek.' },
  { n: 4, title: 'Kvalitetskontroll', text: 'Noggrann inspektion, trimning och städning.' },
];

export default function ServicesPage() {
  return (
    <div className="bg-white">
      {/* Intro */}
      <section className="bg-surface border-b border-gray-200">
        <Container className="py-14 md:py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Sprutisolering för alla typer av byggnader</h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              Två skumtyper, ett mål: en tätare, torrare och billigare byggnad att värma. Vi hjälper dig välja rätt – och du kan räkna ut ett pris direkt.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button href="/kalkylator" size="lg">Räkna ut ditt pris</Button>
              <Button href="/kontakt" size="lg" variant="secondary">Kontakta oss</Button>
            </div>
          </div>
          <Image src="/images/stock/roof-spraying.jpg" alt="Sprutisolering appliceras" width={1600} height={1067} className="w-full h-72 md:h-[400px] object-cover rounded-xl" />
        </Container>
      </section>

      {/* Two foams */}
      <Container className="py-20 md:py-24 flex flex-col gap-12">
        <SectionTitle title="Två skumtyper" lead="Slutencellsskum är vårt standardval. Öppencellsskum är ett lättare, billigare alternativ för torra invändiga ytor." />
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="overflow-hidden flex flex-col">
            <Image src="/images/stock/wall-sprayfoam.jpg" alt="Slutencellsskum på väggreglar" width={1600} height={1200} className="w-full h-56 object-cover" />
            <div className="p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">Slutencellsskum</h2>
                <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">Rekommenderas</span>
              </div>
              <p className="text-[15px] leading-relaxed text-gray-700">Högsta isoleringsvärdet per centimeter, tätar och fuktsäkrar i samma moment. Rätt val när du vill ha maximal effekt eller när utrymmet är fuktigt.</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="text-gray-600">Densitet</div><div className="text-gray-900 font-medium">35+ kg/m³</div>
                <div className="text-gray-600">Värmeledning (λ)</div><div className="text-gray-900 font-medium">≤ 0,024 W/(m·K)</div>
                <div className="text-gray-600">Tryckhållfasthet</div><div className="text-gray-900 font-medium">≥ 150 kPa</div>
                <div className="text-gray-600">Vattenupptag</div><div className="text-gray-900 font-medium">≤ 3 %</div>
                <div className="text-gray-600">Livslängd</div><div className="text-gray-900 font-medium">50+ år</div>
              </div>
              <ul className="flex flex-col gap-1.5 text-[15px] text-gray-700">
                {['Krypgrund och källare', 'Ytterväggar', 'Tak och vindar', 'Kylanläggningar och marina miljöer'].map((i) => (
                  <li key={i} className="flex items-start gap-2"><IconCheck width={16} height={16} className="text-green-700 mt-1 shrink-0" />{i}</li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="overflow-hidden flex flex-col">
            <Image src="/images/stock/pur-foam-texture.jpg" alt="Skumstruktur i närbild" width={850} height={1280} className="w-full h-56 object-cover" />
            <div className="p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">Öppencellsskum</h2>
                <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">Ekonomiskt alternativ</span>
              </div>
              <p className="text-[15px] leading-relaxed text-gray-700">Lätt, kostnadseffektivt och utmärkt på ljuddämpning. Passar torra invändiga ytor där fuktskydd inte är avgörande.</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="text-gray-600">Densitet</div><div className="text-gray-900 font-medium">8–12 kg/m³</div>
                <div className="text-gray-600">Värmeledning (λ)</div><div className="text-gray-900 font-medium">≤ 0,040 W/(m·K)</div>
                <div className="text-gray-600">Öppencellsgrad</div><div className="text-gray-900 font-medium">≥ 99 %</div>
                <div className="text-gray-600">Blåsmedel</div><div className="text-gray-900 font-medium">Vatten – inga ozonnedbrytande ämnen</div>
                <div className="text-gray-600">Materialkostnad</div><div className="text-gray-900 font-medium">Lägre</div>
              </div>
              <ul className="flex flex-col gap-1.5 text-[15px] text-gray-700">
                {['Invändiga väggar', 'Vindsbjälklag', 'Ljudisolering mellan rum', 'Projekt med snäv budget'].map((i) => (
                  <li key={i} className="flex items-start gap-2"><IconCheck width={16} height={16} className="text-green-700 mt-1 shrink-0" />{i}</li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </Container>

      {/* Decision aid */}
      <section className="bg-surface border-y border-gray-200">
        <Container className="py-20 md:py-24 grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
          <SectionTitle title="Vilket skum passar dig?" lead="Osäker? Här är en snabb tumregel. Vid hembesöket bekräftar vi valet och räknar fram rätt tjocklek för din byggnad." />
          <Card className="overflow-hidden">
            <table className="w-full text-[15px]">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 border-b border-gray-200">
                  <th className="px-5 py-3">Ditt behov</th><th className="px-5 py-3 text-right">Vi rekommenderar</th>
                </tr>
              </thead>
              <tbody>
                {CHOICE.map((c) => (
                  <tr key={c.need} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3.5 text-gray-800">{c.need}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-green-700">{c.pick}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Container>
      </section>

      {/* Process */}
      <Container className="py-20 md:py-24 flex flex-col gap-12">
        <SectionTitle title="Installationsprocessen" />
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((s) => (
            <li key={s.n} className="flex flex-col gap-3">
              <span className="w-10 h-10 rounded-full bg-green-700 text-white font-bold flex items-center justify-center">{s.n}</span>
              <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-gray-700">{s.text}</p>
            </li>
          ))}
        </ol>
      </Container>

      {/* Safety + certifications */}
      <section className="bg-surface border-y border-gray-200">
        <Container className="py-20 md:py-24 grid md:grid-cols-3 gap-6">
          <Card className="p-7 flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Under installationen</h3>
            <ul className="flex flex-col gap-1.5 text-[15px] text-gray-700">
              {['Fullständig skyddsutrustning för personal', 'Avspärrning av arbetsområdet', 'Ventilationskontroll och brandsäkerhetsrutiner', 'Ingen vistelse i utrymmet under applicering'].map((i) => <li key={i} className="flex items-start gap-2"><IconCheck width={16} height={16} className="text-green-700 mt-1 shrink-0" />{i}</li>)}
            </ul>
          </Card>
          <Card className="p-7 flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Efter härdning</h3>
            <ul className="flex flex-col gap-1.5 text-[15px] text-gray-700">
              {['Inga skadliga emissioner efter 24–48 h', 'Inert material som inte reagerar kemiskt', 'Mögel- och bakterieresistent', 'Säkert för bostäder och känsliga miljöer'].map((i) => <li key={i} className="flex items-start gap-2"><IconCheck width={16} height={16} className="text-green-700 mt-1 shrink-0" />{i}</li>)}
            </ul>
          </Card>
          <Card className="p-7 flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Regler och standarder</h3>
            <ul className="flex flex-col gap-1.5 text-[15px] text-gray-700">
              {['Boverkets byggregler (BBR)', 'REACH – EU:s kemikalieförordning', 'Arbetsmiljöverkets föreskrifter (AFS)', 'Personal utbildad för hantering av diisocyanater'].map((i) => <li key={i} className="flex items-start gap-2"><IconCheck width={16} height={16} className="text-green-700 mt-1 shrink-0" />{i}</li>)}
            </ul>
          </Card>
        </Container>
      </section>

      <CtaBand title="Redo att komma igång?" lead="Räkna ut ditt pris direkt – eller ring oss så går vi igenom ditt projekt." />
    </div>
  );
}
