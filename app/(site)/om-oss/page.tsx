import Image from 'next/image';
import { Container, Card } from '@/app/components/ui';
import CtaBand from '@/app/components/CtaBand';
import { IconCheck } from '@/app/components/icons';

export const metadata = {
  title: 'Om oss | IntelliFoam',
  description: 'IntelliFoam utför sprutisolering med slutencellsskum. Vi utgår från Gävle och kommer till dig. Godkända för F-skatt, följer BBR, ROT-avdrag på arbetet.',
};

const FACTS = [
  'Utgår från Gävle – arbetar utan geografiska begränsningar',
  'Vattenblåst slutencellsskum utan ozonnedbrytande ämnen',
  'Godkända för F-skatt',
  'Följer Boverkets byggregler (BBR)',
  'ROT-avdrag 30 % på arbetskostnaden dras direkt på fakturan',
  'En del av Grönteknik',
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      <section className="bg-surface border-b border-gray-200">
        <Container className="py-14 md:py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Om IntelliFoam</h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              IntelliFoam är Intelliray AB:s verksamhet för sprutisolering. Vi isolerar villor, krypgrunder, vindar, lantbruk och kommersiella byggnader med slutencellsskum – ett material som isolerar, tätar och fuktsäkrar i ett enda steg.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Vi utgår från Gävle och åker dit jobbet finns. Varje uppdrag börjar med en tydlig prisuppskattning i vår kalkylator och ett hembesök där vi bekräftar rätt skumtyp och tjocklek för just din byggnad.
            </p>
          </div>
          <Image src="/images/stock/wall-sprayfoam.jpg" alt="Slutencellsskum på väggregel" width={1600} height={1200} className="w-full h-72 md:h-[400px] object-cover rounded-xl" />
        </Container>
      </section>

      <Container className="py-16 md:py-20 grid md:grid-cols-2 gap-10">
        <Card className="p-8 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Det här kan du räkna med</h2>
          <ul className="flex flex-col gap-3">
            {FACTS.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px] text-gray-700">
                <IconCheck width={18} height={18} className="text-green-700 mt-0.5 shrink-0" />{f}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-8 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Miljö på riktigt</h2>
          <p className="text-[15px] leading-relaxed text-gray-700">
            Som en del av Grönteknik arbetar vi för en hållbar framtid. Sprutisolering minskar en byggnads energibehov med upp till 50 %, håller i 50+ år och ger därmed lägre utsläpp och mindre materialåtgång över tid. Våra produkter är REACH-godkända med låga emissioner.
          </p>
          <a href="https://gronteknik.nu" target="_blank" rel="noopener noreferrer" className="font-medium text-green-700 hover:text-green-800">Läs mer på gronteknik.nu →</a>
        </Card>
      </Container>

      <CtaBand />
    </div>
  );
}
