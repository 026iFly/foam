'use client';

import { useState, useEffect, useMemo } from 'react';

interface Booking {
  id: number;
  booking_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  slot_type: string;
  is_lead: boolean;
  customer_name: string;
  customer_address: string;
}

interface BlockedDate {
  id: number;
  blocked_date: string;
  slot: string;
  reason: string | null;
}

export default function InstallerCalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockSlot, setBlockSlot] = useState('full');
  const [blockReason, setBlockReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bookingsRes, blockedRes] = await Promise.all([
        fetch('/api/installer/bookings'),
        fetch('/api/installer/blocked-dates'),
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }

      if (blockedRes.ok) {
        const data = await blockedRes.json();
        setBlockedDates(data.blocked_dates || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  };

  const handleBlockDate = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/installer/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocked_date: selectedDate,
          slot: blockSlot,
          reason: blockReason || null,
        }),
      });

      if (res.ok) {
        setMessage('Datum blockerat!');
        setBlockReason('');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch {
      setMessage('Fel vid blockering');
    }
    setSaving(false);
  };

  const handleUnblock = async (id: number) => {
    try {
      const res = await fetch(`/api/installer/blocked-dates/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage('Blockering borttagen!');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch {
      setMessage('Fel vid borttagning');
    }
  };

  const calendarWeeks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const weeks: Array<Array<{ date: Date; dateStr: string; isCurrentMonth: boolean }>> = [];
    let week: typeof weeks[0] = [];

    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, 1 - (startDow - i));
      week.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: false });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      week.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: true });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        const d = new Date(year, month + 1, week.length - (week.length - (7 - (lastDay.getDate() + startDow) % 7)));
        const nextDay = new Date(year, month + 1, week.length - (7 - lastDay.getDate() % 7 - startDow % 7));
        // Simpler: just fill in next month dates
        const lastInWeek = week[week.length - 1].date;
        const nextDate = new Date(lastInWeek);
        nextDate.setDate(nextDate.getDate() + 1);
        week.push({ date: nextDate, dateStr: nextDate.toISOString().split('T')[0], isCurrentMonth: false });
      }
      weeks.push(week);
    }

    return weeks;
  }, [currentMonth]);

  const getBookingsForDate = (dateStr: string) => {
    return bookings.filter(b => b.scheduled_date === dateStr);
  };

  const getBlockedForDate = (dateStr: string) => {
    return blockedDates.filter(b => b.blocked_date === dateStr);
  };

  const today = new Date().toISOString().split('T')[0];
  const monthLabel = currentMonth.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' });
  const dayNames = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

  const selectedBookings = selectedDate ? getBookingsForDate(selectedDate) : [];
  const selectedBlocked = selectedDate ? getBlockedForDate(selectedDate) : [];

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
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Min kalender</h1>

          {message && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{message}</div>
          )}

          {/* Month Navigation */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="flex items-center justify-between p-4 border-b">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="px-3 py-1 text-gray-700 hover:bg-gray-100 rounded"
              >
                &larr; Förra
              </button>
              <h2 className="text-lg font-semibold text-gray-800 capitalize">{monthLabel}</h2>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="px-3 py-1 text-gray-700 hover:bg-gray-100 rounded"
              >
                Nästa &rarr;
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-600 py-1">{d}</div>
                ))}
              </div>
              {calendarWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((cell) => {
                    const dayBookings = getBookingsForDate(cell.dateStr);
                    const dayBlocked = getBlockedForDate(cell.dateStr);
                    const isToday = cell.dateStr === today;
                    const isSelected = cell.dateStr === selectedDate;
                    const hasBooking = dayBookings.length > 0;
                    const isBlocked = dayBlocked.length > 0;

                    return (
                      <button
                        key={cell.dateStr}
                        onClick={() => setSelectedDate(cell.dateStr)}
                        className={`p-2 rounded text-sm min-h-[60px] flex flex-col items-center transition ${
                          !cell.isCurrentMonth ? 'text-gray-400 bg-gray-50'
                            : isSelected ? 'bg-blue-100 border-2 border-blue-500 text-gray-800'
                            : isToday ? 'bg-blue-50 text-gray-800 font-bold'
                            : 'text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-xs">{cell.date.getDate()}</span>
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                          {hasBooking && (
                            <span className="w-2 h-2 rounded-full bg-green-500" title="Bokning" />
                          )}
                          {isBlocked && (
                            <span className="w-2 h-2 rounded-full bg-red-500" title="Blockerad" />
                          )}
                        </div>
                        {hasBooking && (
                          <span className="text-[10px] text-green-700 mt-0.5">{dayBookings.length} jobb</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {new Date(selectedDate + 'T00:00').toLocaleDateString('sv-SE', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </h3>

              {/* Bookings for date */}
              {selectedBookings.length > 0 ? (
                <div className="space-y-3 mb-6">
                  <h4 className="text-sm font-medium text-gray-700">Bokningar</h4>
                  {selectedBookings.map(b => (
                    <div key={b.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-800">
                            {b.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                            {b.is_lead && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Ansvarig</span>}
                          </div>
                          <div className="text-sm text-gray-700">{b.customer_name}</div>
                          <div className="text-sm text-gray-600">{b.customer_address}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          b.status === 'confirmed' ? 'bg-green-100 text-green-700'
                            : b.status === 'completed' ? 'bg-gray-100 text-gray-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {b.status === 'confirmed' ? 'Bekräftad'
                            : b.status === 'completed' ? 'Slutförd'
                            : 'Bokad'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 mb-6">Inga bokningar denna dag.</p>
              )}

              {/* Blocked dates for date */}
              {selectedBlocked.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Blockerad</h4>
                  {selectedBlocked.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <div className="text-sm text-gray-800">
                        {b.slot === 'full' ? 'Heldag' : b.slot === 'morning' ? 'Förmiddag' : 'Eftermiddag'}
                        {b.reason && <span className="text-gray-600 ml-2">({b.reason})</span>}
                      </div>
                      <button
                        onClick={() => handleUnblock(b.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Ta bort
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Block date form */}
              {selectedDate >= today && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Blockera denna dag</h4>
                  <div className="flex gap-2 items-end">
                    <select
                      value={blockSlot}
                      onChange={(e) => setBlockSlot(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-gray-800"
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
                      className="flex-1 px-3 py-2 border rounded-lg text-gray-800"
                    />
                    <button
                      onClick={handleBlockDate}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                    >
                      {saving ? '...' : 'Blockera'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
