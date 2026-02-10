'use client';

import { useState, useEffect } from 'react';

interface MaterialEntry {
  id: number;
  name: string;
  estimated_quantity: number;
  actual_quantity: number | null;
}

interface ConfirmInstallationModalProps {
  bookingId: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmInstallationModal({
  bookingId,
  onConfirm,
  onClose,
}: ConfirmInstallationModalProps) {
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    fetchBookingMaterials();
  }, [bookingId]);

  const fetchBookingMaterials = async () => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`);
      if (!res.ok) throw new Error('Kunde inte hämta bokningsdata');
      const data = await res.json();
      const booking = data.booking;

      setCustomerName(booking.customer_name || '');

      const mats: MaterialEntry[] = (booking.materials || []).map(
        (m: { id: number; name: string; estimated_quantity: number; actual_quantity: number | null }) => ({
          id: m.id,
          name: m.name,
          estimated_quantity: m.estimated_quantity,
          actual_quantity: m.actual_quantity,
        })
      );

      setMaterials(mats);

      // Pre-fill with estimated quantities
      const initial: Record<number, number> = {};
      for (const m of mats) {
        initial[m.id] = m.actual_quantity ?? m.estimated_quantity ?? 0;
      }
      setQuantities(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta material');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);

    try {
      const materialsPayload = materials.map((m) => ({
        material_id: m.id,
        actual_quantity: quantities[m.id] ?? 0,
      }));

      const res = await fetch(`/api/admin/bookings/${bookingId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: materialsPayload }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunde inte bekräfta installation');
      }

      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Bekräfta installation
          </h2>
          {customerName && (
            <p className="text-sm text-gray-500 mb-4">{customerName}</p>
          )}

          {loading ? (
            <div className="py-8 text-center text-gray-500">Laddar material...</div>
          ) : materials.length === 0 ? (
            <div className="py-4 text-sm text-gray-500">
              Inga material kopplade till denna bokning. Installationen kommer att markeras som slutförd.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">
                Ange faktisk materialåtgång (kg):
              </p>
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <label className="flex-1 text-sm text-gray-700">{m.name}</label>
                  <div className="text-xs text-gray-400 w-16 text-right">
                    Est: {m.estimated_quantity?.toFixed(1) ?? '—'}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={quantities[m.id] ?? 0}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [m.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={confirming}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              Avbryt
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming || loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
            >
              {confirming ? 'Bekräftar...' : 'Bekräfta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
