'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ConfirmInstallationModal from '@/app/admin/components/ConfirmInstallationModal';
import InstallerPicker from '@/app/admin/components/InstallerPicker';

interface BookingInstaller {
  installer_id: string;
  first_name: string;
  last_name: string;
  is_lead: boolean;
  status: string;
}

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
  installers?: BookingInstaller[];
}

interface Material {
  id: number;
  name: string;
  current_stock: number;
  stock_in_7_days: number;
  stock_in_30_days: number;
  is_low: boolean;
}

interface Quote {
  id: number;
  customer_name: string;
  customer_address: string;
  status: string;
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    quote_id: '',
    booking_type: 'visit' as 'visit' | 'installation',
    scheduled_date: '',
    scheduled_time: '09:00',
    notes: '',
  });
  const [savingBooking, setSavingBooking] = useState(false);
  const [confirmBookingId, setConfirmBookingId] = useState<number | null>(null);
  const [selectedInstallerIds, setSelectedInstallerIds] = useState<string[]>([]);
  const [leadInstallerId, setLeadInstallerId] = useState<string | undefined>();

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    try {
      const [bookingsRes, materialsRes, quotesRes] = await Promise.all([
        fetch('/api/admin/bookings'),
        fetch('/api/admin/materials'),
        fetch('/api/admin/quotes?limit=100'),
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }

      if (materialsRes.ok) {
        const data = await materialsRes.json();
        setMaterials(data.materials || []);
      }

      if (quotesRes.ok) {
        const data = await quotesRes.json();
        // Filter to active quotes only
        const activeQuotes = (data.quotes || []).filter(
          (q: Quote) => !['rejected', 'expired'].includes(q.status)
        );
        setQuotes(activeQuotes);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoading(false);
    }
  };

  const openBookingModal = (date?: string) => {
    setBookingForm({
      quote_id: '',
      booking_type: 'visit',
      scheduled_date: date || new Date().toISOString().split('T')[0],
      scheduled_time: '09:00',
      notes: '',
    });
    setSelectedInstallerIds([]);
    setLeadInstallerId(undefined);
    setShowBookingModal(true);
  };

  const handleCreateBooking = async () => {
    if (!bookingForm.scheduled_date) {
      alert('Välj ett datum');
      return;
    }

    setSavingBooking(true);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: bookingForm.quote_id ? parseInt(bookingForm.quote_id) : null,
          booking_type: bookingForm.booking_type,
          scheduled_date: bookingForm.scheduled_date,
          scheduled_time: bookingForm.scheduled_time,
          notes: bookingForm.notes,
          installer_ids: selectedInstallerIds.length > 0 ? selectedInstallerIds : undefined,
          lead_id: leadInstallerId,
        }),
      });

      if (res.ok) {
        setShowBookingModal(false);
        loadData();
      } else {
        const error = await res.json();
        alert(`Fel: ${error.error || 'Kunde inte skapa bokning'}`);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Fel vid skapande av bokning');
    }
    setSavingBooking(false);
  };

  // Check if any materials are low
  const hasLowStock = useMemo(() => {
    return materials.some(m => m.is_low || m.stock_in_7_days < 0 || m.stock_in_30_days < 0);
  }, [materials]);

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Day of week for first day (0 = Sunday, convert to Monday = 0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday becomes 6

    // Build weeks array
    const weeks: Array<Array<{ date: Date | null; dateStr: string; isCurrentMonth: boolean }>> = [];
    let currentWeek: Array<{ date: Date | null; dateStr: string; isCurrentMonth: boolean }> = [];

    // Add empty cells for days before the first
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, 1 - (startDayOfWeek - i));
      currentWeek.push({
        date: prevDate,
        dateStr: prevDate.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      currentWeek.push({
        date,
        dateStr: date.toISOString().split('T')[0],
        isCurrentMonth: true,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining days
    if (currentWeek.length > 0) {
      let nextDay = 1;
      while (currentWeek.length < 7) {
        const nextDate = new Date(year, month + 1, nextDay++);
        currentWeek.push({
          date: nextDate,
          dateStr: nextDate.toISOString().split('T')[0],
          isCurrentMonth: false,
        });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
      return newMonth;
    });
  };

  const getBookingsForDate = (dateStr: string) => {
    return bookings.filter(b => b.scheduled_date === dateStr);
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
        <div className="text-gray-700">Laddar kalender...</div>
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
                onClick={() => openBookingModal()}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ny bokning
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded ${
                  view === 'list' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 border'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded ${
                  view === 'month' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 border'
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
                <span className="text-gray-700">Hembesök</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-50 border-2 border-green-500 rounded"></span>
                <span className="text-gray-700">Installation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></span>
                <span className="text-gray-700">Slutförd</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></span>
                <span className="text-gray-700">Avbokad</span>
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
                    <div className="p-6 text-center text-gray-700">
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
                            <div key={booking.id} className={`p-3 rounded border-l-4 ${getBookingColor(booking)}`}>
                              <Link
                                href={booking.quote_id ? `/admin/quotes/${booking.quote_id}` : '#'}
                                className="block"
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
                                {booking.installers && booking.installers.length > 0 && (
                                  <div className="text-xs mt-1 flex flex-wrap gap-1">
                                    {booking.installers.map((inst) => (
                                      <span
                                        key={inst.installer_id}
                                        className={`px-1.5 py-0.5 rounded ${
                                          inst.status === 'accepted' ? 'bg-green-100 text-green-700'
                                            : inst.status === 'declined' ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                        }`}
                                      >
                                        {inst.first_name} {inst.last_name?.charAt(0)}.
                                        {inst.is_lead && ' *'}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {booking.notes && (
                                  <div className="text-sm opacity-75 mt-2">{booking.notes}</div>
                                )}
                              </Link>
                              {booking.booking_type === 'installation' &&
                                booking.status !== 'completed' &&
                                booking.status !== 'cancelled' && (
                                <button
                                  onClick={() => setConfirmBookingId(booking.id)}
                                  className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                                >
                                  Bekräfta installation
                                </button>
                              )}
                            </div>
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
            /* Month View */
            <div className="bg-white rounded-lg shadow">
              {/* Month Navigation */}
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                  {currentMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Material Warning */}
              {hasLowStock && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <span className="text-red-600">!</span>
                  <span className="text-sm text-red-800">
                    Vissa material har låga lagernivåer. <Link href="/admin/inventory" className="underline font-medium">Se lager</Link>
                  </span>
                </div>
              )}

              {/* Calendar Grid */}
              <div className="p-4">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-700 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="space-y-1">
                  {calendarData.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1">
                      {week.map((day, dayIndex) => {
                        const dayBookings = day.dateStr ? getBookingsForDate(day.dateStr) : [];
                        const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                        const hasVisit = dayBookings.some(b => b.booking_type === 'visit' && b.status !== 'cancelled');
                        const hasInstallation = dayBookings.some(b => b.booking_type === 'installation' && b.status !== 'cancelled');
                        const isSelected = selectedDate === day.dateStr;

                        return (
                          <button
                            key={dayIndex}
                            onClick={() => day.dateStr && setSelectedDate(isSelected ? null : day.dateStr)}
                            className={`
                              min-h-[80px] p-2 rounded-lg border text-left transition
                              ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                              ${isToday ? 'border-green-500 border-2' : 'border-gray-200'}
                              ${isSelected ? 'ring-2 ring-green-500' : ''}
                              hover:border-gray-400
                            `}
                          >
                            <div className={`text-sm font-medium ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                              {day.date?.getDate()}
                            </div>
                            {/* Booking Dots */}
                            {dayBookings.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {hasVisit && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500" title="Hembesök" />
                                )}
                                {hasInstallation && (
                                  <span className="w-2 h-2 rounded-full bg-green-500" title="Installation" />
                                )}
                                {dayBookings.length > 2 && (
                                  <span className="text-xs text-gray-500">+{dayBookings.length - 2}</span>
                                )}
                              </div>
                            )}
                            {/* Booking Preview */}
                            {dayBookings.slice(0, 2).map(booking => (
                              <div
                                key={booking.id}
                                className={`mt-1 text-xs truncate rounded px-1 ${
                                  booking.booking_type === 'installation'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {booking.scheduled_time?.slice(0, 5)} {booking.customer_name?.split(' ')[0] || (booking.booking_type === 'installation' ? 'Inst.' : 'Besök')}
                              </div>
                            ))}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Date Details */}
              {selectedDate && (
                <div className="border-t border-gray-200 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">
                      {new Date(selectedDate).toLocaleDateString('sv-SE', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </h3>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Stäng
                    </button>
                  </div>
                  {getBookingsForDate(selectedDate).length === 0 ? (
                    <p className="text-gray-700 text-sm">Inga bokningar denna dag.</p>
                  ) : (
                    <div className="space-y-2">
                      {getBookingsForDate(selectedDate).map(booking => (
                        <div key={booking.id} className={`p-3 rounded border-l-4 ${getBookingColor(booking)}`}>
                          <Link
                            href={booking.quote_id ? `/admin/quotes/${booking.quote_id}` : '#'}
                            className="block"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">
                                  {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                                </div>
                                {booking.customer_name && (
                                  <div className="text-sm opacity-75">{booking.customer_name}</div>
                                )}
                              </div>
                              <div className="text-sm">
                                {booking.scheduled_time}
                              </div>
                            </div>
                          </Link>
                          {booking.booking_type === 'installation' &&
                            booking.status !== 'completed' &&
                            booking.status !== 'cancelled' && (
                            <button
                              onClick={() => setConfirmBookingId(booking.id)}
                              className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                            >
                              Bekräfta installation
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="text-sm text-blue-800">
              <strong>Tips:</strong> Du kan också skapa bokningar direkt från offertsidan via
              &quot;Boka hembesök&quot; eller &quot;Boka installation&quot;-knapparna.
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Ny bokning</h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Quote Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kopplad offert (valfritt)
                </label>
                <select
                  value={bookingForm.quote_id}
                  onChange={(e) => setBookingForm({ ...bookingForm, quote_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="">Ingen koppling</option>
                  {quotes.map(quote => (
                    <option key={quote.id} value={quote.id}>
                      #{quote.id} - {quote.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Booking Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ av bokning
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, booking_type: 'visit' })}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      bookingForm.booking_type === 'visit'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    Hembesök
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, booking_type: 'installation' })}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      bookingForm.booking_type === 'installation'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    Installation
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={bookingForm.scheduled_date}
                  onChange={(e) => setBookingForm({ ...bookingForm, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tid
                </label>
                <select
                  value={bookingForm.scheduled_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, scheduled_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              {/* Installer Selection */}
              {bookingForm.booking_type === 'installation' && bookingForm.scheduled_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Installatörer
                  </label>
                  <InstallerPicker
                    date={bookingForm.scheduled_date}
                    selectedIds={selectedInstallerIds}
                    leadId={leadInstallerId}
                    onChange={(ids, lead) => {
                      setSelectedInstallerIds(ids);
                      setLeadInstallerId(lead);
                    }}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anteckningar
                </label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Valfria anteckningar..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowBookingModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Avbryt
              </button>
              <button
                onClick={handleCreateBooking}
                disabled={savingBooking}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {savingBooking ? 'Skapar...' : 'Skapa bokning'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBookingId !== null && (
        <ConfirmInstallationModal
          bookingId={confirmBookingId}
          onConfirm={() => {
            setConfirmBookingId(null);
            loadData();
          }}
          onClose={() => setConfirmBookingId(null)}
        />
      )}
    </div>
  );
}
