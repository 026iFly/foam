'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Booking {
  id: number;
  quote_id: number;
  booking_type: 'visit' | 'installation';
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string;
  customer_name?: string;
  customer_address?: string;
  quote_value?: number;
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>('list');

  useEffect(() => {
    loadBookings();
  }, [currentMonth]);

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const getBookingColor = (booking: Booking) => {
    if (booking.status === 'cancelled') return 'bg-gray-100 border-gray-300 text-gray-500';
    if (booking.status === 'completed') return 'bg-green-100 border-green-300 text-green-800';
    if (booking.booking_type === 'installation') return 'bg-green-50 border-green-500 text-green-800';
    return 'bg-blue-50 border-blue-500 text-blue-800';
  };

  // Group bookings by date
  const bookingsByDate = bookings.reduce((acc, booking) => {
    const date = booking.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(booking);
    return acc;
  }, {} as Record<string, Booking[]>);

  // Sort dates
  const sortedDates = Object.keys(bookingsByDate).sort();

  // Filter to upcoming only
  const today = new Date().toISOString().split('T')[0];
  const upcomingDates = sortedDates.filter(d => d >= today);
  const pastDates = sortedDates.filter(d => d < today).slice(-5).reverse();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Laddar kalender...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Kalender</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded ${
                  view === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded ${
                  view === 'month' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Månad
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-50 border-2 border-blue-500 rounded"></span>
                <span className="text-gray-600">Hembesök</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-50 border-2 border-green-500 rounded"></span>
                <span className="text-gray-600">Installation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></span>
                <span className="text-gray-600">Slutförd</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></span>
                <span className="text-gray-600">Avbokad</span>
              </div>
            </div>
          </div>

          {view === 'list' ? (
            <>
              {/* Upcoming */}
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">Kommande</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {upcomingDates.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      Inga bokade besök eller installationer.
                    </div>
                  ) : (
                    upcomingDates.map((date) => (
                      <div key={date} className="p-4">
                        <div className="font-medium text-gray-700 mb-3 capitalize">
                          {formatDate(date)}
                        </div>
                        <div className="space-y-2">
                          {bookingsByDate[date].map((booking) => (
                            <Link
                              key={booking.id}
                              href={booking.quote_id ? `/admin/quotes/${booking.quote_id}` : '#'}
                              className={`block p-3 rounded border-l-4 ${getBookingColor(booking)}`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">
                                    {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                                  </div>
                                  {booking.customer_name && (
                                    <div className="text-sm opacity-75">{booking.customer_name}</div>
                                  )}
                                  {booking.customer_address && (
                                    <div className="text-sm opacity-75">{booking.customer_address}</div>
                                  )}
                                </div>
                                <div className="text-right text-sm">
                                  {booking.scheduled_time && (
                                    <div>{booking.scheduled_time}</div>
                                  )}
                                  <div className="capitalize opacity-75">{booking.status}</div>
                                </div>
                              </div>
                              {booking.notes && (
                                <div className="text-sm opacity-75 mt-2">{booking.notes}</div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Past (last 5) */}
              {pastDates.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-500">Tidigare</h2>
                  </div>
                  <div className="divide-y divide-gray-100 opacity-60">
                    {pastDates.map((date) => (
                      <div key={date} className="p-4">
                        <div className="font-medium text-gray-500 mb-2 capitalize">
                          {formatDate(date)}
                        </div>
                        <div className="space-y-2">
                          {bookingsByDate[date].map((booking) => (
                            <div
                              key={booking.id}
                              className="p-2 rounded bg-gray-50 text-sm text-gray-600"
                            >
                              {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                              {booking.customer_name && ` - ${booking.customer_name}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Month View - Simple placeholder */
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center text-gray-500">
                Månadsvy kommer snart. Använd listvyn för nu.
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="text-sm text-blue-800">
              <strong>Tips:</strong> Bokningar skapas från offertsidan. Gå till en offert och klicka
              &quot;Boka hembesök&quot; eller &quot;Boka installation&quot;.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
