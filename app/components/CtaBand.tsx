import { Button, Container } from './ui';

export default function CtaBand({
  title = 'Vill du veta vad ditt projekt kostar?',
  lead = 'Räkna ut en uppskattning direkt – exakt offert inom två arbetsdagar.',
}: { title?: string; lead?: string }) {
  return (
    <section className="bg-green-700 text-white">
      <Container className="py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="flex flex-col gap-3 max-w-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">{title}</h2>
          <p className="text-lg text-green-100">{lead}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          <Button href="/kalkylator" size="lg" className="bg-white text-green-800 hover:bg-green-50">Räkna ut ditt pris</Button>
          <a href="tel:+46107037400" className="text-white font-semibold text-lg hover:text-green-100">010 703 74 00</a>
        </div>
      </Container>
    </section>
  );
}
