import { getAllFAQs } from '@/lib/queries';
import { Container, Card } from '@/app/components/ui';
import CtaBand from '@/app/components/CtaBand';

export const metadata = {
  title: 'Vanliga frågor om sprutisolering | IntelliFoam',
  description: 'Svar på de vanligaste frågorna om sprutisolering, installation, kostnader, ROT-avdrag och miljöpåverkan.',
};

export default async function FAQPage() {
  const faqs = await getAllFAQs();
  const categories = Array.from(new Set(faqs.map((f) => f.category || 'Övrigt')));

  return (
    <div className="bg-white">
      <section className="bg-surface border-b border-gray-200">
        <Container className="py-14 md:py-20 flex flex-col gap-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Vanliga frågor</h1>
          <p className="text-lg text-gray-700">Här hittar du svar på de vanligaste frågorna om sprutisolering.</p>
        </Container>
      </section>

      <Container className="py-16 md:py-20 flex flex-col gap-14 max-w-3xl">
        {faqs.length === 0 && <p className="text-gray-700">Inga frågor publicerade ännu.</p>}
        {categories.map((cat) => (
          <section key={cat} className="flex flex-col gap-5">
            <h2 className="text-xl font-semibold text-gray-900">{cat}</h2>
            <div className="flex flex-col gap-4">
              {faqs.filter((f) => (f.category || 'Övrigt') === cat).map((faq) => (
                <Card key={faq.id} className="p-6 flex flex-col gap-2.5">
                  <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                  <p className="text-[15px] leading-relaxed text-gray-700">{faq.answer}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </Container>

      <CtaBand title="Hittade du inte svaret?" lead="Räkna ut ditt pris direkt, eller ring så hjälper vi dig." />
    </div>
  );
}
