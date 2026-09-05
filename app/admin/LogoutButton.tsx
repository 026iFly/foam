'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="shrink-0 text-xs font-medium text-white/80 px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
    >
      {loading ? 'Loggar ut...' : 'Logga ut'}
    </button>
  );
}
