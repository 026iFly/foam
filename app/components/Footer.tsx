import Link from 'next/link';
import { getCompanyInfo } from '@/lib/queries';

export default async function Footer() {
  const company = await getCompanyInfo();
  const currentYear = new Date().getFullYear();

  // Fallback if company info is not available
  const companyName = company?.company_name || 'Intellifoam';
  const companyDescription = company?.description || 'Professionell sprayisolering';

  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">{companyName}</h3>
            <p className="text-gray-300 mb-2">{companyDescription}</p>
            {company?.phone && (
              <p className="text-gray-300">
                Tel: <a href={`tel:${company.phone}`} className="hover:text-green-400 transition">{company.phone}</a>
              </p>
            )}
            {company?.email && (
              <p className="text-gray-300">
                E-post: <a href={`mailto:${company.email}`} className="hover:text-green-400 transition">{company.email}</a>
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Snabblänkar</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/tjanster" className="text-gray-300 hover:text-green-400 transition">
                  Våra Tjänster
                </Link>
              </li>
              <li>
                <Link href="/galleri" className="text-gray-300 hover:text-green-400 transition">
                  Projektgalleri
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-green-400 transition">
                  Vanliga Frågor
                </Link>
              </li>
              <li>
                <Link href="/kalkylator" className="text-gray-300 hover:text-green-400 transition">
                  Priskalkylator
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="text-gray-300 hover:text-green-400 transition">
                  Kontakta Oss
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-gray-300 hover:text-green-400 transition">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards & Quality */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Kvalitet & Standard</h3>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• CE-märkta produkter</li>
              <li>• REACH-kompatibla material</li>
              <li>• Enligt BBR-standard</li>
              <li>• Följer AFS-regler</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center">
          <p className="text-gray-400 mb-2">
            &copy; {currentYear} {companyName}. Alla rättigheter förbehållna.
          </p>
          <p className="text-gray-400">
            En del av{' '}
            <a
              href="https://gronteknik.nu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 transition font-semibold"
            >
              Grönteknik.nu
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
