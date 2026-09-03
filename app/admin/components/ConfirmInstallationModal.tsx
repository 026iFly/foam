'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Skeleton } from '@/app/components/ui';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto shadow-xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Bekräfta installation
          </h2>
          {customerName && (
            <p className="mt-0.5 text-sm text-gray-600">{customerName}</p>
          )}
        </div>

        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-sm text-gray-700">
              Inga material kopplade till denna bokning. Installationen kommer att markeras som slutförd.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Ange faktisk materialåtgång (kg):
              </p>
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <label className="flex-1 text-sm font-medium text-gray-900">{m.name}</label>
                  <div className="w-16 text-right text-xs text-gray-600">
                    Est: {m.estimated_quantity?.toFixed(1) ?? '-'}
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
                    className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 rounded-b-lg border-t border-gray-200 bg-gray-50 px-5 py-4">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={confirming}>
            Avbryt
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={confirming || loading}>
            {confirming ? 'Bekräftar...' : 'Bekräfta'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
