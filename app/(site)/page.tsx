import Image from 'next/image';
import Link from 'next/link';
import { getAllProjects } from '@/lib/queries';
import { Button, Container, SectionTitle, Card } from '@/app/components/ui';
import CtaBand from '@/app/components/CtaBand';
import { IconBolt, IconDroplet, IconVolume, IconLeaf, IconShield, IconShieldCheck, IconCheck, IconArrowRight } from '@/app/components/icons';

export const dynamic = 'force-dynamic';

const BENEFITS = [
  { Icon: IconBolt, title: 'Energibesparing', text: 'Upp till 50 % lägre energikostnader tack vare överlägsen isoleringsförmåga och lufttäthet.' },
  { Icon: IconDroplet, title: 'Fuktskydd', text: 'Slutencellsskum är fuktbeständigt och förhindrar mögel och röta – perfekt för källare och krypgrund.' },
  { Icon: IconVolume, title: 'Ljudisolering', text: 'Minskar buller från omgivningen och förbättrar inomhuskomforten avsevärt.' },
  { Icon: IconLeaf, title: 'Miljövänligt', text: 'Vattenblåst, REACH-godkänt material med låga emissioner. Sänkt energiförbrukning ger lägre utsläpp.' },
  { Icon: IconShield, title: 'Långvarig lösning', text: 'Isolerar och tätar i ett steg. Formstabilt och beständigt i 50+ år utan att sjunka eller rasa.' },
  { Icon: IconShieldCheck, title: 'Certifierad kvalitet', text: 'Vi följer Boverkets byggregler (BBR) och är godkända för F-skatt.' },
];

const USE_CASES = [
  { title: 'Villa & radhus', img: '/images/stock/villa-red-house.jpg', alt: 'Rött trähus', items: ['Vindsbjälklag och tak', 'Ytterväggar', 'Garage och förråd'] },
  { title: 'Krypgrund & källare', img: '/images/projects/krypgrund-vendelso-efter.jpg', alt: 'Sprutisolerad krypgrund', items: ['Bjälklag underifrån', 'Grundmurar', 'Fuktsäkring'] },
  { title: 'Vind & tak', img: '/images/stock/attic-framing.jpg', alt: 'Vind under renovering', items: ['Snedtak och hanbjälklag', 'Takfot och gavlar', 'Kallvind'] },
  { title: 'Kommersiellt & lantbruk', img: '/images/stock/warehouse-wood-ceiling.jpg', alt: 'Lagerlokal med trätak', items: ['Lager och industrihallar', 'Djurstallar och maskinhallar', 'Kylanläggningar'] },
];

const STEPS = [
  { n: 1, title: 'Räkna ut priset', text: 'Använd priskalkylatorn och få en uppskattning direkt. Skicka in så återkommer vi med en exakt offert.' },
  { n: 2, title: 'Hembesök', text: 'Vi tittar på förutsättningarna, mäter upp och bekräftar rätt skumtyp och tjocklek.' },
  { n: 3, title: 'Installation', text: 'De flesta jobb görs på en dag. Du väljer datum i din kundportal.' },
  { n: 4, title: 'Klart', text: 'ROT-avdraget dras direkt på fakturan – du betalar bara nettot.' },
];

const TRUST = ['ROT-avdrag 30 % på arbetet', 'Godkänd för F-skatt', 'Följer Boverkets byggregler (BBR)', '50+ års livslängd'];

export default async function Home() {
  const projects = await getAllProjects();
  const featured = projects.find((p) => p.before_image_url && p.after_image_url) ?? null;
  const beforeSrc = featured?.before_image_url ?? '/images/projects/krypgrund-vendelso-fore.jpg';
  const afterSrc = featured?.after_image_url ?? '/images/projects/krypgrund-vendelso-efter.jpg';
  const featuredTitle = featured?.title ?? 'Krypgrund – tilläggsisolering';

  return (
    <div className="bg-white">
      {/* Hero */}
      <section>
        <Container className="pt-14 pb-16 md:pt-20 md:pb-20 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="flex flex-col gap-6">
            <span className="inline-flex self-start items-center h-7 px-3 rounded-full bg-green-50 text-green-700 text-[13px] font-semibold">
              Utgår från Gävle – vi kommer till dig
            </span>
            <h1 className="text-4xl md:text-[56px] md:leading-[1.08] font-bold text-gray-900">
              Sprutisolering som sänker dina energikostnader
            </h1>
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-lg">
              Miljövänlig isolering med slutencellsskum som tätar och isolerar i ett steg – för villor, krypgrunder, vindar och kommersiella byggnader.
            </p>
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <Button href="/kalkylator" size="lg">Räkna ut ditt pris</Button>
                <Link href="/kontakt" className="inline-flex items-center gap-1.5 text-base font-medium text-green-700 hover:text-green-800">
                  Eller kontakta oss direkt <IconArrowRight width={18} height={18} />
                </Link>
              </div>
              <span className="text-sm text-gray-600">Uppskattning direkt i kalkylatorn · kostnadsfritt · ingen bindning</span>
            </div>
          </div>
          <div className="relative">
            <Image
              src="/images/projects/krypgrund-vendelso-efter.jpg"
              alt="Färdig sprutisolering i krypgrund"
              width={1600} height={1200} priority
              className="w-full h-[320px] md:h-[520px] object-cover rounded-xl"
            />
            <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white/95 text-[13px] font-semibold text-gray-900">
              <span className="w-2 h-2 rounded-full bg-green-700" />
              Krypgrund, Vendelsö – slutencellsskum
            </div>
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <section className="border-y border-gray-200 bg-surface">
        <Container className="py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST.map((t) => (
            <div key={t} className="flex items-center gap-2.5 text-sm font-medium text-gray-900">
              <IconCheck width={18} height={18} className="text-green-700 shrink-0" />{t}
            </div>
          ))}
        </Container>
      </section>

      {/* Benefits */}
      <section>
        <Container className="py-20 md:py-24 flex flex-col gap-12">
          <SectionTitle
            title="Varför sprutisolering?"
            lead="Ett material som gör flera jobb samtidigt – isolerar, tätar och skyddar mot fukt – och som håller lika länge som huset."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(({ Icon, title, text }) => (
              <Card key={title} className="p-7 flex flex-col gap-3.5">
                <span className="w-11 h-11 rounded-lg bg-green-50 text-green-700 flex items-center justify-center"><Icon /></span>
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-[15px] leading-relaxed text-gray-700">{text}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Use cases */}
      <section className="bg-surface border-y border-gray-200">
        <Container className="py-20 md:py-24 flex flex-col gap-12">
          <SectionTitle title="Vi isolerar" lead="Från krypgrunden till nocken – i villor, radhus, lantbruk och kommersiella byggnader." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {USE_CASES.map((u) => (
              <Card key={u.title} className="overflow-hidden flex flex-col">
                <Image src={u.img} alt={u.alt} width={800} height={600} className="w-full h-44 object-cover" />
                <div className="p-5 flex flex-col gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{u.title}</h3>
                  <ul className="flex flex-col gap-1.5 text-[15px] text-gray-700">
                    {u.items.map((i) => <li key={i} className="flex items-start gap-2"><IconCheck width={16} height={16} className="text-green-700 mt-1 shrink-0" />{i}</li>)}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Before / after */}
      <section>
        <Container className="py-20 md:py-24 flex flex-col gap-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <SectionTitle title="Före och efter" lead={featuredTitle} />
            <Link href="/galleri" className="inline-flex items-center gap-1.5 font-medium text-green-700 hover:text-green-800">
              Se fler projekt <IconArrowRight width={18} height={18} />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Image src={beforeSrc} alt={`${featuredTitle} – före`} width={1600} height={1200} className="w-full h-72 md:h-[380px] object-cover rounded-xl" />
              <span className="absolute top-3 left-3 bg-gray-900/70 text-white text-xs font-semibold px-2.5 py-1 rounded">Före</span>
            </div>
            <div className="relative">
              <Image src={afterSrc} alt={`${featuredTitle} – efter`} width={1600} height={1200} className="w-full h-72 md:h-[380px] object-cover rounded-xl" />
              <span className="absolute top-3 left-3 bg-green-700 text-white text-xs font-semibold px-2.5 py-1 rounded">Efter</span>
            </div>
          </div>
        </Container>
      </section>

      {/* Process */}
      <section className="bg-surface border-y border-gray-200">
        <Container className="py-20 md:py-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div className="flex flex-col gap-10">
            <SectionTitle title="Så går det till" />
            <ol className="grid sm:grid-cols-2 gap-8">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-4">
                  <span className="w-9 h-9 rounded-full bg-green-700 text-white text-sm font-bold flex items-center justify-center shrink-0">{s.n}</span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                    <p className="text-[15px] leading-relaxed text-gray-700">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Image src="/images/stock/roof-spraying.jpg" alt="Sprutisolering pågår" width={1600} height={1067} className="w-full h-72 lg:h-[420px] object-cover rounded-xl" />
        </Container>
      </section>

      <CtaBand />
    </div>
  );
}
