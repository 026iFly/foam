import { getCurrentUser } from '@/lib/supabase-auth';
import AdminShell from '@/app/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = user?.profile?.role === 'admin';
  const displayName =
    user?.profile?.first_name && user?.profile?.last_name
      ? `${user.profile.first_name} ${user.profile.last_name}`
      : user?.email || '';
  const initial = (user?.profile?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <AdminShell
      isAdmin={isAdmin}
      displayName={displayName}
      roleLabel={isAdmin ? 'Administratör' : 'Personal'}
      photoUrl={user?.profile?.profile_photo_url || null}
      initial={initial}
    >
      {children}
    </AdminShell>
  );
}
