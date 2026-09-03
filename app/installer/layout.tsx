import { getCurrentUser } from '@/lib/supabase-auth';
import LogoutButton from '@/app/admin/LogoutButton';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const NAV_LINKS = [
  { href: '/installer', label: 'Dashboard' },
  { href: '/installer/bookings', label: 'Bokningar' },
  { href: '/installer/calendar', label: 'Kalender' },
  { href: '/installer/profile', label: 'Min profil' },
];

const navLinkCls = 'text-sm font-medium text-green-100 hover:text-white transition-colors whitespace-nowrap';

export default async function InstallerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const displayName = user?.profile?.first_name && user?.profile?.last_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user?.email;

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-green-900 text-white">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/installer" className="flex items-center gap-2.5 shrink-0">
              <span className="w-6 h-6 rounded-md bg-green-700 inline-block" />
              <span className="text-[16px] font-bold text-white tracking-tight">IntelliFoam</span>
            </Link>
            <nav className="hidden md:flex items-center gap-5">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={navLinkCls}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-sm text-green-100 truncate max-w-[200px]">{displayName}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide bg-white/10 text-green-100 px-2 py-0.5 rounded-full">
              Installatör
            </span>
            <LogoutButton />
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-5 px-4 h-11 border-t border-white/10 overflow-x-auto">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={navLinkCls}>
              {l.href === '/installer/profile' ? 'Profil' : l.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
