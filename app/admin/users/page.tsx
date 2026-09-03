'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, Badge, Button, Skeleton, EmptyState } from '@/app/components/ui';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  profile_photo_url: string | null;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte hämta användare');
        return;
      }

      setUsers(data.users || []);
    } catch (err) {
      setError('Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card className="p-5 flex flex-col gap-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader
        title="Användare"
        subtitle="Hantera konton och roller för admin och installatörer"
        actions={<Button href="/admin/users/new">Bjud in användare</Button>}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <EmptyState
          title="Inga användare hittades"
          action={<Button href="/admin/users/new" variant="secondary">Bjud in användare</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="text-left px-5 py-3">Användare</th>
                  <th className="text-left px-5 py-3">Roll</th>
                  <th className="text-left px-5 py-3">Skapad</th>
                  <th className="text-right px-5 py-3">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {user.profile_photo_url ? (
                          <img
                            src={user.profile_photo_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-green-800">
                              {user.first_name?.[0] || user.email[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.email}
                          </div>
                          <div className="text-sm text-gray-700">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={user.role === 'admin' ? 'info' : 'neutral'}>
                        {user.role === 'admin' ? 'Admin' : 'Installatör'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {new Date(user.created_at).toLocaleDateString('sv-SE')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button href={`/admin/users/${user.id}`} variant="ghost" size="sm">
                        Redigera
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
