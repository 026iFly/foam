import { getAllProjects } from '@/lib/queries';
import Image from 'next/image';

export const metadata = {
  title: 'Projektgalleri - Sprutisolering | Intellifoam',
  description: 'Se våra genomförda projekt inom sprutisolering. Före och efter bilder från villa, kommersiella byggnader och lantbruk.',
};

export default async function GalleryPage() {
  const projects = await getAllProjects();

  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
            Projektgalleri
          </h1>
          <p className="text-xl text-center text-gray-900 mb-12">
            Se exempel på våra genomförda projekt
          </p>

          {projects.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-2xl font-semibold mb-3 text-gray-800">
                Projektgalleri Kommer Snart
              </h2>
              <p className="text-gray-900 mb-6">
                Vi arbetar med att samla bilder från våra fantastiska projekt. Kom tillbaka snart för att se före och efter bilder!
              </p>
              <p className="text-gray-900">
                Under tiden kan du{' '}
                <a href="/kontakt" className="text-green-600 hover:text-green-700 font-semibold">
                  kontakta oss
                </a>
                {' '}för att få se referenser från tidigare projekt.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {project.image_url && (
                    <div className="relative h-48 bg-gray-200">
                      <Image
                        src={project.image_url}
                        alt={project.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2 text-gray-800">
                      {project.title}
                    </h3>
                    {project.location && (
                      <p className="text-sm text-gray-800 mb-2">
                        📍 {project.location}
                      </p>
                    )}
                    {project.description && (
                      <p className="text-gray-900 mb-3">
                        {project.description}
                      </p>
                    )}
                    {project.area_size && (
                      <p className="text-sm text-gray-900">
                        Yta: {project.area_size} m²
                      </p>
                    )}
                    {project.project_type && (
                      <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                        {project.project_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-12 bg-green-700 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">
              Vill du att ditt projekt ska bli nästa?
            </h2>
            <p className="text-green-100 mb-6">
              Kontakta oss för en kostnadsfri offert
            </p>
            <a
              href="/kontakt"
              className="inline-block bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition"
            >
              Kontakta Oss
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
