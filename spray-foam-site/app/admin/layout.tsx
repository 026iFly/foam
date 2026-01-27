import { getSession } from '@/lib/session';
import LogoutButton from '@/app/admin/LogoutButton';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Intellifoam Admin
              </h2>
              {session.username && (
                <span className="text-sm text-gray-700">
                  Inloggad som: {session.username}
                </span>
              )}
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
}
