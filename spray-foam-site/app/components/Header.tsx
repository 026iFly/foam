import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="hover:opacity-80 transition">
            <Image
              src="/intellifoam-logo.png"
              alt="IntelliFoam - Professionell sprutisolering"
              width={280}
              height={80}
              priority
            />
          </Link>
          <nav className="hidden md:flex space-x-6">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition font-medium">
              Hem
            </Link>
            <Link href="/tjanster" className="text-gray-700 hover:text-blue-600 transition font-medium">
              Tjänster
            </Link>
            <Link href="/galleri" className="text-gray-700 hover:text-blue-600 transition font-medium">
              Galleri
            </Link>
            <Link href="/faq" className="text-gray-700 hover:text-blue-600 transition font-medium">
              Vanliga frågor
            </Link>
            <Link href="/kalkylator" className="text-gray-700 hover:text-blue-600 transition font-medium">
              Priskalkylator
            </Link>
            <Link href="/kontakt" className="text-gray-700 hover:text-blue-600 transition font-semibold">
              Kontakt
            </Link>
          </nav>
          <div className="md:hidden">
            <button className="text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
