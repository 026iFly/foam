import { getCurrentUser } from '@/lib/supabase-auth';
import LogoutButton from '@/app/admin/LogoutButton';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Link href="/installer" className="text-lg font-semibold text-gray-800 hover:text-gray-600">
                Intellifoam
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/installer" className="text-sm text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/installer/bookings" className="text-sm text-gray-600 hover:text-gray-900">
                  Bokningar
                </Link>
                <Link href="/installer/calendar" className="text-sm text-gray-600 hover:text-gray-900">
                  Kalender
                </Link>
                <Link href="/installer/profile" className="text-sm text-gray-600 hover:text-gray-900">
                  Min profil
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{displayName}</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                Installatör
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
        <nav className="flex items-center gap-4">
          <Link href="/installer" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link href="/installer/bookings" className="text-sm text-gray-600 hover:text-gray-900">Bokningar</Link>
          <Link href="/installer/calendar" className="text-sm text-gray-600 hover:text-gray-900">Kalender</Link>
          <Link href="/installer/profile" className="text-sm text-gray-600 hover:text-gray-900">Profil</Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
