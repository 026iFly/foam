'use client';

import { useState, useEffect, useCallback } from 'react';

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  installer_type: string | null;
  hourly_rate: number | null;
  hardplast_expiry: string | null;
  is_active: boolean;
}

interface BlockedDate {
  id: number;
  blocked_date: string;
  slot: string;
  reason: string | null;
}

export default function InstallerProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);

  // Block date form
  const [blockDate, setBlockDate] = useState('');
  const [blockSlot, setBlockSlot] = useState('full');
  const [blockReason, setBlockReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [bdRes] = await Promise.all([
        fetch('/api/installer/blocked-dates'),
      ]);
      const bdData = await bdRes.json();
      setBlockedDates(bdData.blocked_dates || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addBlockedDate = async () => {
    if (!blockDate) return;
    try {
      await fetch('/api/installer/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: blockDate,
          slot: blockSlot,
          reason: blockReason || null,
        }),
      });
      setBlockDate('');
      setBlockReason('');
      fetchData();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const removeBlockedDate = async (dateId: number) => {
    try {
      await fetch(`/api/installer/blocked-dates?date_id=${dateId}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const formatSlot = (slot: string) => {
    if (slot === 'morning') return 'Förmiddag';
    if (slot === 'afternoon') return 'Eftermiddag';
    return 'Heldag';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Min profil</h1>

      {/* Blocked Dates */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mina lediga/blockerade dagar</h2>

        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <select
            value={blockSlot}
            onChange={(e) => setBlockSlot(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="full">Heldag</option>
            <option value="morning">Förmiddag</option>
            <option value="afternoon">Eftermiddag</option>
          </select>
          <input
            type="text"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Anledning (valfritt)"
            className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-[150px]"
          />
          <button
            onClick={addBlockedDate}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Blockera
          </button>
        </div>

        {blockedDates.length > 0 ? (
          <div className="space-y-2">
            {blockedDates.map((bd) => (
              <div key={bd.id} className="flex items-center justify-between bg-red-50 rounded px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">
                    {new Date(bd.blocked_date).toLocaleDateString('sv-SE', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </span>
                  <span className="text-gray-500 ml-2">{formatSlot(bd.slot)}</span>
                  {bd.reason && <span className="text-gray-500 ml-2">- {bd.reason}</span>}
                </div>
                <button
                  onClick={() => removeBlockedDate(bd.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Inga blockerade datum.</p>
        )}
      </div>

      {/* Info - read only */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Information</h2>
        <p className="text-sm text-gray-500">
          Kontakta administratören för att uppdatera dina kontaktuppgifter, timpris eller certifikat.
        </p>
      </div>
    </div>
  );
}
