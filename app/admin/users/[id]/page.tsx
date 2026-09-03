'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, CardHeader, CardBody, Button, Skeleton, EmptyState, cn } from '@/app/components/ui';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  installer_type: string | null;
  is_active: boolean;
  profile_photo_url: string | null;
  created_at: string;
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const segmentBase = 'py-2.5 px-4 rounded-lg font-medium text-sm transition-colors';
const segmentOn = 'bg-green-700 text-white';
const segmentOff = 'bg-gray-100 text-gray-700 hover:bg-gray-200';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [installerType, setInstallerType] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte hämta användare');
        return;
      }

      setUser(data.user);
      setFirstName(data.user.first_name || '');
      setLastName(data.user.last_name || '');
      setPhone(data.user.phone || '');
      setRole(data.user.role);
      setInstallerType(data.user.installer_type || null);
      setIsActive(data.user.is_active !== false);
    } catch (err) {
      setError('Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const body: any = {
        firstName,
        lastName,
        phone,
        installer_type: installerType,
        is_active: isActive,
      };

      if (newPassword) {
        body.newPassword = newPassword;
      }

      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte spara');
        setSaving(false);
        return;
      }

      setMessage('Användaren har sparats');
      setNewPassword('');
    } catch (err) {
      setError('Något gick fel');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    try {
      const res = await fetch(`/api/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte ändra roll');
        return;
      }

      setRole(newRole);
      setMessage('Rollen har ändrats');
    } catch (err) {
      setError('Något gick fel');
    }
  };

  const handleSendResetEmail = async () => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendResetEmail: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte skicka e-post');
        return;
      }

      setMessage('Återställningslänk har skickats');
    } catch (err) {
      setError('Något gick fel');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte ta bort användare');
        setConfirmDelete(false);
        return;
      }

      router.push('/admin/users');
    } catch (err) {
      setError('Något gick fel');
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="max-w-xl flex flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="max-w-xl">
          <PageHeader title="Användaren hittades inte" backHref="/admin/users" backLabel="Tillbaka till användare" />
          <EmptyState
            title="Användaren hittades inte"
            description={error || undefined}
            action={<Button href="/admin/users" variant="secondary">Tillbaka till användare</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <div className="max-w-xl">
        <PageHeader
          title="Redigera användare"
          subtitle={user.email}
          backHref="/admin/users"
          backLabel="Tillbaka till användare"
        />

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* User Info */}
          <Card>
            <CardHeader title="Användarinfo" />
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>E-post</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className={cn(inputCls, 'bg-gray-100 text-gray-700')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Förnamn</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Efternamn</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Telefon</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Role */}
          <Card>
            <CardHeader title="Roll" />
            <CardBody>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleChange('installer')}
                  className={cn('flex-1', segmentBase, role === 'installer' ? segmentOn : segmentOff)}
                >
                  Installatör
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                  className={cn('flex-1', segmentBase, role === 'admin' ? segmentOn : segmentOff)}
                >
                  Admin
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Installer Privileges */}
          <Card>
            <CardHeader title="Installatörsbehörighet" />
            <CardBody>
              <p className="text-sm text-gray-700 mb-3">
                Om denna användare även ska kunna arbeta som installatör, välj typ nedan. Användaren visas då i installatörslistan och kan tilldelas bokningar.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInstallerType(null)}
                  className={cn(segmentBase, !installerType ? segmentOn : segmentOff)}
                >
                  Ej installatör
                </button>
                <button
                  type="button"
                  onClick={() => setInstallerType('employee')}
                  className={cn(segmentBase, installerType === 'employee' ? segmentOn : segmentOff)}
                >
                  Anställd
                </button>
                <button
                  type="button"
                  onClick={() => setInstallerType('subcontractor')}
                  className={cn(segmentBase, installerType === 'subcontractor' ? segmentOn : segmentOff)}
                >
                  Underentreprenad
                </button>
              </div>

              {installerType && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                  <div>
                    <div className="font-medium text-gray-900">Aktiv installatör</div>
                    <div className="text-sm text-gray-600">
                      Inaktiva installatörer visas inte i tilldelningslistan
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      isActive ? 'bg-green-700' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        isActive ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader title="Lösenord" />
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Sätt nytt lösenord</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputCls}
                    placeholder="Lämna tomt för att behålla"
                  />
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-600">eller</span>
                </div>
                <Button type="button" onClick={handleSendResetEmail} variant="secondary" className="w-full">
                  Skicka återställningslänk via e-post
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Save Button */}
          <Button type="submit" disabled={saving} size="lg" className="w-full">
            {saving ? 'Sparar...' : 'Spara ändringar'}
          </Button>
        </form>

        {/* Delete Section */}
        <div className="mt-6 bg-red-50 rounded-lg p-5 border border-red-200">
          <h2 className="text-base font-semibold mb-2 text-red-800">Farozon</h2>
          <p className="text-sm text-red-700 mb-4">
            Tar bort användaren permanent. Detta kan inte ångras.
          </p>
          <Button
            onClick={handleDelete}
            variant={confirmDelete ? 'danger' : 'secondary'}
            className={cn('w-full', !confirmDelete && 'text-red-700 border-red-200 hover:bg-red-100')}
          >
            {confirmDelete
              ? 'Klicka igen för att bekräfta'
              : 'Ta bort användare'}
          </Button>
          {confirmDelete && (
            <Button onClick={() => setConfirmDelete(false)} variant="ghost" className="w-full mt-2 text-gray-700 hover:bg-red-100">
              Avbryt
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
