'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface BookingData {
  booking: {
    id: number;
    scheduled_date: string;
    scheduled_time: string;
    status: string;
    booking_type: string;
    slot_type: string;
    num_installers: number;
  };
  customer: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  quote: {
    quote_number: string;
    total_incl_vat: number;
    rot_deduction: number;
  };
  installers: Array<{
    first_name: string;
    is_lead: boolean;
    confirmed: boolean;
  }>;
  can_reschedule: boolean;
  reschedule_deadline_days: number;
}

export default function CustomerPortalPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/kund/${token}/booking`);
      if (!res.ok) {
        setError('Kunde inte hämta bokning');
        return;
      }
      const bookingData = await res.json();
      setData(bookingData);
    } catch {
      setError('Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Check if verified
    const verified = sessionStorage.getItem(`kund_verified_${token}`);
    if (!verified) {
      router.push(`/kund/${token}`);
      return;
    }
    fetchBooking();
  }, [token, router, fetchBooking]);

  const openReschedule = async () => {
    setShowReschedule(true);
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/kund/${token}/available-slots`);
      const slotsData = await res.json();
      setAvailableDates(slotsData.available_dates || []);
    } catch {
      setError('Kunde inte hämta tillgängliga datum');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate) return;
    setRescheduling(true);
    try {
      const res = await fetch(`/api/kund/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_date: selectedDate }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error);
        return;
      }
      setShowReschedule(false);
      fetchBooking();
    } catch {
      setError('Ombokning misslyckades');
    } finally {
      setRescheduling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatSlot = (slot: string) => {
    if (slot === 'morning') return 'Förmiddag (07:00-12:00)';
    if (slot === 'afternoon') return 'Eftermiddag (12:00-17:00)';
    return 'Heldag (07:00-17:00)';
  };

  const formatStatus = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      scheduled: { label: 'Bokad', color: 'bg-blue-100 text-blue-800' },
      confirmed: { label: 'Bekräftad', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Slutförd', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Avbokad', color: 'bg-red-100 text-red-800' },
    };
    return map[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-700">Laddar...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { booking, customer, quote, installers, can_reschedule, reschedule_deadline_days } = data;
  const statusInfo = formatStatus(booking.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Intellifoam</h1>
          <p className="text-sm text-gray-700">Kundportal</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Greeting */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900">Hej {customer.name}!</h2>
          <p className="text-sm text-gray-700 mt-1">
            Här kan du se information om din bokning och göra ändringar.
          </p>
        </div>

        {/* Booking Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-gray-900">Din bokning</h3>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Datum</span>
              <span className="text-sm font-medium text-gray-900">{formatDate(booking.scheduled_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Tid</span>
              <span className="text-sm font-medium text-gray-900">{formatSlot(booking.slot_type)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Adress</span>
              <span className="text-sm font-medium text-gray-900">{customer.address}</span>
            </div>
          </div>
        </div>

        {/* Installers */}
        {installers.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Installatörer</h3>
            <div className="space-y-2">
              {installers.map((inst, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{inst.first_name}</span>
                    {inst.is_lead && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                        Ansvarig
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${inst.confirmed ? 'text-green-600' : 'text-yellow-600'}`}>
                    {inst.confirmed ? 'Bekräftad' : 'Väntar på bekräftelse'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quote Summary */}
        {quote.total_incl_vat && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Offertsammanfattning</h3>
            <div className="space-y-2">
              {quote.quote_number && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Offertnummer</span>
                  <span className="text-sm font-medium text-gray-900">{quote.quote_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Total inkl moms</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(quote.total_incl_vat)}</span>
              </div>
              {quote.rot_deduction > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">ROT-avdrag</span>
                  <span className="text-sm font-medium text-green-700">-{formatCurrency(quote.rot_deduction)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reschedule */}
        {can_reschedule && !showReschedule && (
          <div className="bg-white rounded-lg shadow p-6">
            <button
              onClick={openReschedule}
              className="w-full bg-gray-100 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-200"
            >
              Boka om installation
            </button>
            <p className="text-xs text-gray-700 text-center mt-2">
              Ombokning måste ske minst {reschedule_deadline_days} dagar innan installationsdatumet.
            </p>
          </div>
        )}

        {showReschedule && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Välj nytt datum</h3>

            {loadingSlots ? (
              <p className="text-sm text-gray-700">Hämtar tillgängliga datum...</p>
            ) : availableDates.length > 0 ? (
              <div className="space-y-3">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900"
                >
                  <option value="">Välj datum...</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>{formatDate(d)}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={handleReschedule}
                    disabled={!selectedDate || rescheduling}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {rescheduling ? 'Ombokar...' : 'Bekräfta ombokning'}
                  </button>
                  <button
                    onClick={() => setShowReschedule(false)}
                    className="px-4 bg-gray-100 text-gray-700 rounded-lg py-3 text-sm hover:bg-gray-200"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700">Inga tillgängliga datum just nu. Kontakta oss för hjälp.</p>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-700">
            Frågor? Ring 010 703 74 00 eller mejla info@intellifoam.se
          </p>
        </div>
      </div>
    </div>
  );
}
