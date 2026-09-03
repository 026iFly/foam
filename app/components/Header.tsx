'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button, cn } from './ui';

const NAV = [
  { href: '/tjanster', label: 'Tjänster' },
  { href: '/galleri', label: 'Galleri' },
  { href: '/om-oss', label: 'Om oss' },
  { href: '/faq', label: 'Vanliga frågor' },
];

const PHONE_DISPLAY = '010 703 74 00';
const PHONE_HREF = 'tel:+46107037400';

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-[72px] flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center shrink-0" aria-label="IntelliFoam – startsida" onClick={() => setOpen(false)}>
          <Image src="/intellifoam-logo.png" alt="IntelliFoam" width={190} height={54} priority className="h-9 md:h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="Huvudmeny">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('text-[15px] font-medium transition-colors', active ? 'text-green-700' : 'text-gray-900 hover:text-green-700')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-5">
          <a href={PHONE_HREF} className="hidden lg:inline-flex items-center gap-2 text-[15px] font-semibold text-gray-900 hover:text-green-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-green-700"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
            {PHONE_DISPLAY}
          </a>
          <Button href="/kalkylator" size="md">Räkna ut ditt pris</Button>
        </div>

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-gray-900 hover:bg-gray-100"
          aria-label={open ? 'Stäng meny' : 'Öppna meny'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col" aria-label="Mobilmeny">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-3 text-base font-medium text-gray-900 border-b border-gray-100 last:border-0"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              <Button href="/kalkylator" size="lg" className="w-full">Räkna ut ditt pris</Button>
              <a href={PHONE_HREF} className="inline-flex items-center justify-center gap-2 h-12 text-base font-semibold text-gray-900">
                Ring {PHONE_DISPLAY}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
