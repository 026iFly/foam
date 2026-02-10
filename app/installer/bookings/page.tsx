'use client';

import { useState, useEffect } from 'react';

interface BookingAssignment {
  id: number;
  booking_id: number;
  is_lead: boolean;
  status: string;
  booking: {
    id: number;
    scheduled_date: string;
    scheduled_time: string;
    slot_type: string;
    status: string;
    quote_requests: {
      customer_name: string;
      customer_address: string;
    } | null;
  };
}

export default function InstallerBookingsPage() {
  const [bookings, setBookings] = useState<BookingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch installer's bookings through their tasks/assignments
    fetch('/api/installer/tasks')
      .then((r) => r.json())
      .then((data) => {
        // Extract booking info from tasks that have bookings
        const tasks = data.tasks || [];
        const bookingTasks = tasks.filter((t: { bookings: unknown }) => t.bookings);
        setBookings(bookingTasks.map((t: {
          id: number;
          booking_id: number;
          task_type: string;
          bookings: BookingAssignment['booking'];
        }) => ({
          id: t.id,
          booking_id: t.booking_id,
          is_lead: false,
          status: t.task_type === 'booking_confirmation' ? 'pending' : 'accepted',
          booking: t.bookings,
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatSlot = (slot: string) => {
    if (slot === 'morning') return 'Förmiddag (07:00-12:00)';
    if (slot === 'afternoon') return 'Eftermiddag (12:00-17:00)';
    return 'Heldag (07:00-17:00)';
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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mina bokningar</h1>

      {bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((b) => {
            const booking = b.booking;
            const quoteData = booking?.quote_requests;
            return (
              <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{quoteData?.customer_name || '-'}</p>
                    <p className="text-sm text-gray-600">{quoteData?.customer_address || ''}</p>
                    {booking && (
                      <p className="text-sm text-gray-500 mt-1">
                        {formatSlot(booking.slot_type)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {booking && (
                      <p className="text-sm font-medium">
                        {new Date(booking.scheduled_date).toLocaleDateString('sv-SE', {
                          weekday: 'long', day: 'numeric', month: 'long',
                        })}
                      </p>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      booking?.status === 'confirmed' ? 'bg-green-100 text-green-800'
                        : booking?.status === 'completed' ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {booking?.status === 'confirmed' ? 'Bekräftad' : booking?.status === 'completed' ? 'Slutförd' : 'Bokad'}
                    </span>
                    {b.is_lead && (
                      <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        Ansvarig
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Inga bokningar.</p>
        </div>
      )}
    </div>
  );
}
