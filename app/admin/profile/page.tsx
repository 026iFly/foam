'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, CardHeader, CardBody, Button, Skeleton, cn } from '@/app/components/ui';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  profile_photo_url: string | null;
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();

      if (data.user) {
        // Email comes from auth, profile comes from user_profiles table
        setUserEmail(data.user.email || '');
        if (data.user.profile) {
          setProfile(data.user.profile);
          setFirstName(data.user.profile.first_name || '');
          setLastName(data.user.profile.last_name || '');
          setPhone(data.user.profile.phone || '');
        }
      }
    } catch (err) {
      setError('Kunde inte hämta profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
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

      // Handle password change
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError('Lösenorden matchar inte');
          setSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          setError('Lösenordet måste vara minst 6 tecken');
          setSaving(false);
          return;
        }
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch('/api/profile', {
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

      setMessage('Profilen har sparats');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.refresh();
    } catch (err) {
      setError('Något gick fel');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kunde inte ladda upp bild');
        return;
      }

      setMessage('Bilden har laddats upp');
      loadProfile();
      router.refresh();
    } catch (err) {
      setError('Kunde inte ladda upp bild');
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const res = await fetch('/api/profile/photo', {
        method: 'DELETE',
      });

      if (!res.ok) {
        setError('Kunde inte ta bort bild');
        return;
      }

      setMessage('Bilden har tagits bort');
      loadProfile();
      router.refresh();
    } catch (err) {
      setError('Kunde inte ta bort bild');
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="max-w-2xl flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <div className="max-w-2xl">
        <PageHeader title="Min profil" subtitle="Dina uppgifter, profilbild och lösenord" />

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

        {/* Profile Photo */}
        <Card className="mb-6">
          <CardHeader title="Profilbild" />
          <CardBody>
            <div className="flex items-center gap-6">
              {profile?.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt="Profilbild"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-3xl font-semibold text-green-800">
                    {firstName?.[0] || userEmail?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col items-start gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                  Ladda upp bild
                </Button>
                {profile?.profile_photo_url && (
                  <Button onClick={handleRemovePhoto} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                    Ta bort bild
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Personuppgifter" />
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>E-post</label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className={cn(inputCls, 'bg-gray-100 text-gray-700')}
                  />
                  <p className="text-sm text-gray-700 mt-1">
                    E-postadressen kan inte ändras
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

          {/* Password Change */}
          <Card>
            <CardHeader title="Ändra lösenord" />
            <CardBody>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nuvarande lösenord</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Nytt lösenord</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bekräfta nytt lösenord</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <Button type="submit" disabled={saving} size="lg" className="w-full">
            {saving ? 'Sparar...' : 'Spara ändringar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
