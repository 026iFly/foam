'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, CardBody, Button } from '@/app/components/ui';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export default function NewUserPage() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('installer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte bjuda in användare');
        setSaving(false);
        return;
      }

      router.push('/admin/users');
    } catch (err) {
      setError('Något gick fel');
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <div className="max-w-xl">
        <PageHeader
          title="Bjud in ny användare"
          backHref="/admin/users"
          backLabel="Tillbaka till användare"
        />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>E-post *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="namn@foretag.se"
                  />
                  <p className="text-sm text-gray-700 mt-1">
                    En inbjudan skickas till denna adress
                  </p>
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
                  <label className={labelCls}>Roll *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputCls}
                  >
                    <option value="installer">Installatör</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="text-sm text-gray-700 mt-1">
                    Admins kan hantera användare och alla inställningar
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Skickar...' : 'Skicka inbjudan'}
                </Button>
                <Button href="/admin/users" variant="secondary" className="flex-1">
                  Avbryt
                </Button>
              </div>
            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  );
}
