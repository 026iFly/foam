'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte hamta anvandare');
        return;
      }

      setUser(data.user);
      setFirstName(data.user.first_name || '');
      setLastName(data.user.last_name || '');
      setPhone(data.user.phone || '');
      setRole(data.user.role);
    } catch (err) {
      setError('Nagot gick fel');
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

      setMessage('Anvandaren har sparats');
      setNewPassword('');
    } catch (err) {
      setError('Nagot gick fel');
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
        setError(data.error || 'Kunde inte andra roll');
        return;
      }

      setRole(newRole);
      setMessage('Rollen har andrats');
    } catch (err) {
      setError('Nagot gick fel');
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
        setError(data.error || 'Kunde inte skicka epost');
        return;
      }

      setMessage('Aterstallningslank har skickats');
    } catch (err) {
      setError('Nagot gick fel');
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
        setError(data.error || 'Kunde inte ta bort anvandare');
        setConfirmDelete(false);
        return;
      }

      router.push('/admin/users');
    } catch (err) {
      setError('Nagot gick fel');
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900">Laddar...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Anvandaren hittades inte
            </h1>
            <Link
              href="/admin/users"
              className="text-blue-600 hover:text-blue-800"
            >
              Tillbaka till anvandare
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <Link
              href="/admin/users"
              className="text-blue-600 hover:text-blue-800"
            >
              Tillbaka till anvandare
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            Redigera anvandare
          </h1>

          {message && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSave}>
            {/* User Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Anvandarinfo
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-post
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fornamn
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Efternamn
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Role */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Roll</h2>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleRoleChange('installer')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                    role === 'installer'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Installator
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                    role === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Losenord
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Satt nytt losenord
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Lamna tomt for att behalla"
                  />
                </div>
                <div className="text-center">
                  <span className="text-gray-500">eller</span>
                </div>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                  Skicka aterstallningslank via e-post
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 mb-6"
            >
              {saving ? 'Sparar...' : 'Spara andringar'}
            </button>
          </form>

          {/* Delete Section */}
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <h2 className="text-xl font-semibold mb-4 text-red-800">
              Farozon
            </h2>
            <p className="text-red-700 mb-4">
              Tar bort anvandaren permanent. Detta kan inte angras.
            </p>
            <button
              onClick={handleDelete}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                confirmDelete
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {confirmDelete
                ? 'Klicka igen for att bekrafta'
                : 'Ta bort anvandare'}
            </button>
            {confirmDelete && (
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full mt-2 text-gray-600 hover:text-gray-800"
              >
                Avbryt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
