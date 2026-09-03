'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/app/admin/LogoutButton';
import { cn } from '@/app/components/ui';

type Item = { href: string; label: string; icon: keyof typeof ICONS; adminOnly?: boolean; exact?: boolean };
type Group = { group: string; items: Item[] };

// Single source of truth for admin navigation. `adminOnly` mirrors middleware.ts.
const NAV: Group[] = [
  { group: 'Sälj', items: [
    { href: '/admin', label: 'Översikt', icon: 'home', exact: true },
    { href: '/admin/quotes', label: 'Offerter', icon: 'file' },
    { href: '/admin/calendar', label: 'Kalender', icon: 'calendar' },
  ] },
  { group: 'Drift', items: [
    { href: '/admin/inventory', label: 'Lager', icon: 'box' },
    { href: '/admin/installers', label: 'Installatörer', icon: 'users', adminOnly: true },
    { href: '/admin/reports', label: 'Rapporter', icon: 'chart', adminOnly: true },
  ] },
  { group: 'Innehåll', items: [
    { href: '/admin/gallery', label: 'Galleri', icon: 'image' },
  ] },
  { group: 'System', items: [
    { href: '/admin/settings', label: 'Inställningar', icon: 'settings' },
    { href: '/admin/users', label: 'Användare', icon: 'user', adminOnly: true },
    { href: '/admin/diagnostics', label: 'Diagnostik', icon: 'plug', adminOnly: true },
  ] },
];

const ICONS = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  file: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h6M10 17h6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  plug: <path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v5" />,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">{ICONS[name]}</svg>;
}

export default function AdminShell({
  children, isAdmin, displayName, roleLabel, photoUrl, initial,
}: { children: React.ReactNode; isAdmin: boolean; displayName: string; roleLabel: string; photoUrl?: string | null; initial: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: Item) => item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');

  const sidebar = (
    <div className="flex flex-col h-full bg-green-900 text-green-100 p-3">
      <Link href="/admin" className="flex items-center gap-2.5 px-3 pt-1 pb-5" onClick={() => setOpen(false)}>
        <span className="w-7 h-7 rounded-md bg-green-700 inline-block" />
        <span className="text-[17px] font-bold text-white tracking-tight">IntelliFoam</span>
      </Link>
      <nav className="flex flex-col gap-5 flex-grow overflow-y-auto">
        {NAV.map((g) => {
          const items = g.items.filter((i) => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={g.group} className="flex flex-col gap-0.5">
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-green-300">{g.group}</div>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 h-10 px-3 rounded-md text-sm font-medium transition-colors',
                    isActive(item) ? 'bg-white/10 text-white shadow-[inset_3px_0_0_#4fa071]' : 'text-green-100 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon name={item.icon} />{item.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 pt-4 mt-4 px-1 flex items-center gap-2.5">
        <Link href="/admin/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 min-w-0 flex-grow hover:text-white">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <span className="w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-semibold shrink-0">{initial}</span>
          )}
          <span className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate">{displayName}</span>
            <span className="text-xs text-green-300">{roleLabel}</span>
          </span>
        </Link>
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64">{sidebar}</aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-green-900 text-white h-14 px-4 flex items-center justify-between">
        <Link href="/admin" className="font-bold">IntelliFoam</Link>
        <button type="button" aria-label={open ? 'Stäng meny' : 'Öppna meny'} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="w-11 h-11 inline-flex items-center justify-center rounded-md hover:bg-white/10">
          {open
            ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>}
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85vw] h-full shadow-xl">{sidebar}</div>
          <button type="button" aria-label="Stäng meny" className="flex-grow bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
