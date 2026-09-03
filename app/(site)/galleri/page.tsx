import Image from 'next/image';
import { getAllProjects } from '@/lib/queries';
import { Container, Card, EmptyState, Button } from '@/app/components/ui';
import CtaBand from '@/app/components/CtaBand';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Projektgalleri – sprutisolering | IntelliFoam',
  description: 'Före- och efterbilder från våra genomförda sprutisoleringar.',
};

export default async function GalleryPage() {
  const projects = await getAllProjects();

  return (
    <div className="bg-white">
      <section className="bg-surface border-b border-gray-200">
        <Container className="py-14 md:py-20 flex flex-col gap-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Projektgalleri</h1>
          <p className="text-lg text-gray-700">Före och efter från våra genomförda projekt.</p>
        </Container>
      </section>

      <Container className="py-16 md:py-20">
        {projects.length === 0 ? (
          <EmptyState
            title="Fler projekt kommer"
            description="Vi fyller på med bilder från våra genomförda projekt. Hör av dig om du vill se referenser."
            action={<Button href="/kontakt" variant="secondary">Kontakta oss</Button>}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {projects.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                {p.before_image_url && p.after_image_url ? (
                  <div className="grid grid-cols-2">
                    <div className="relative h-56"><Image src={p.before_image_url} alt={`${p.title} – före`} fill className="object-cover" /><span className="absolute top-3 left-3 bg-gray-900/70 text-white text-xs font-semibold px-2.5 py-1 rounded">Före</span></div>
                    <div className="relative h-56"><Image src={p.after_image_url} alt={`${p.title} – efter`} fill className="object-cover" /><span className="absolute top-3 left-3 bg-green-700 text-white text-xs font-semibold px-2.5 py-1 rounded">Efter</span></div>
                  </div>
                ) : (p.image_url || p.after_image_url) && (
                  <div className="relative h-56"><Image src={(p.image_url || p.after_image_url) as string} alt={p.title} fill className="object-cover" /></div>
                )}
                <div className="p-6 flex flex-col gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">{p.title}</h2>
                  {(p.location || p.area_size) && (
                    <p className="text-sm text-gray-600">{[p.location, p.area_size ? `${p.area_size} m²` : null].filter(Boolean).join(' · ')}</p>
                  )}
                  {p.description && <p className="text-[15px] text-gray-700 leading-relaxed">{p.description}</p>}
                  {p.project_type && <span className="self-start mt-1 inline-flex items-center h-6 px-2.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">{p.project_type}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>

      <CtaBand title="Vill du att ditt projekt blir nästa?" />
    </div>
  );
}
