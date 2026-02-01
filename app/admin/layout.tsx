import { getCurrentUser } from '@/lib/supabase-auth';
import LogoutButton from '@/app/admin/LogoutButton';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isAdmin = user?.profile?.role === 'admin';
  const displayName = user?.profile?.first_name && user?.profile?.last_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user?.email;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-lg font-semibold text-gray-800 hover:text-gray-600">
                Intellifoam Admin
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/admin"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/quotes"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Offerter
                </Link>
                <Link
                  href="/admin/inventory"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Lager
                </Link>
                <Link
                  href="/admin/calendar"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Kalender
                </Link>
                <Link
                  href="/admin/settings"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Inställningar
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Användare
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/profile"
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
              >
                {user?.profile?.profile_photo_url ? (
                  <img
                    src={user.profile.profile_photo_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm text-gray-600">
                      {user?.profile?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden sm:inline">{displayName}</span>
                {isAdmin && (
                  <span className="hidden sm:inline text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
        <nav className="flex items-center gap-4 overflow-x-auto">
          <Link
            href="/admin"
            className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/quotes"
            className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            Offerter
          </Link>
          <Link
            href="/admin/inventory"
            className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            Lager
          </Link>
          <Link
            href="/admin/calendar"
            className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            Kalender
          </Link>
          <Link
            href="/admin/settings"
            className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            Inställningar
          </Link>
          {isAdmin && (
            <Link
              href="/admin/users"
              className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
            >
              Användare
            </Link>
          )}
          <Link
            href="/admin/profile"
            className="text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            Min profil
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
}
