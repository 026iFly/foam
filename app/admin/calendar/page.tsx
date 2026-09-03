'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ConfirmInstallationModal from '@/app/admin/components/ConfirmInstallationModal';
import InstallerPicker from '@/app/admin/components/InstallerPicker';
import { PageHeader, Card, CardHeader, CardBody, Badge, StatusBadge, Button, Skeleton, cn } from '@/app/components/ui';

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

interface Installer {
  id: string;
  first_name: string;
  last_name: string;
  installer_type: string;
}

interface BlockedDate {
  id: number;
  installer_id: string;
  blocked_date: string;
  slot: string;
  reason: string;
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

  // Installer filter state
  const [allInstallers, setAllInstallers] = useState<Installer[]>([]);
  const [filterInstallerIds, setFilterInstallerIds] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  useEffect(() => {
    // Load blocked dates when filter changes
    if (filterInstallerIds.length > 0) {
      loadBlockedDates();
    } else {
      setBlockedDates([]);
    }
  }, [filterInstallerIds]);

  const loadData = async () => {
    try {
      const [bookingsRes, materialsRes, quotesRes, installersRes] = await Promise.all([
        fetch('/api/admin/bookings'),
        fetch('/api/admin/materials'),
        fetch('/api/admin/quotes?limit=100'),
        fetch('/api/admin/installers'),
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
        const activeQuotes = (data.quotes || []).filter(
          (q: Quote) => !['rejected', 'expired'].includes(q.status)
        );
        setQuotes(activeQuotes);
      }

      if (installersRes.ok) {
        const data = await installersRes.json();
        setAllInstallers(data.installers || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoading(false);
    }
  };

  const loadBlockedDates = async () => {
    try {
      const results = await Promise.all(
        filterInstallerIds.map(id =>
          fetch(`/api/admin/installers/${id}/blocked-dates`).then(r => r.json())
        )
      );
      const allBlocked: BlockedDate[] = [];
      results.forEach((data, idx) => {
        (data.blocked_dates || []).forEach((bd: BlockedDate) => {
          allBlocked.push({ ...bd, installer_id: filterInstallerIds[idx] });
        });
      });
      setBlockedDates(allBlocked);
    } catch (err) {
      console.error('Failed to load blocked dates:', err);
    }
  };

  const getBlockedForDate = (dateStr: string) => {
    return blockedDates.filter(bd => bd.blocked_date === dateStr);
  };

  const getInstallerColor = (installerId: string) => {
    const colors = ['bg-red-200 text-red-800', 'bg-purple-200 text-purple-800', 'bg-orange-200 text-orange-800', 'bg-pink-200 text-pink-800'];
    const idx = filterInstallerIds.indexOf(installerId);
    return colors[idx % colors.length];
  };

  const getInstallerName = (installerId: string) => {
    const inst = allInstallers.find(i => i.id === installerId);
    return inst ? `${inst.first_name} ${inst.last_name?.charAt(0) || ''}.`.trim() : 'Okänd';
  };

  const toggleInstallerFilter = (id: string) => {
    setFilterInstallerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
    if (booking.status === 'cancelled') return 'bg-gray-100 border-gray-300 text-gray-600';
    if (booking.status === 'completed') return 'bg-green-100 border-green-300 text-green-800';
    if (booking.booking_type === 'installation') return 'bg-green-50 border-green-600 text-green-800';
    return 'bg-amber-50 border-amber-500 text-amber-900';
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

  const inputCls =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20';

  const renderBookingCard = (booking: Booking, compact = false) => (
    <div key={booking.id} className={`rounded-lg border border-l-4 p-3 ${getBookingColor(booking)}`}>
      <Link
        href={booking.quote_id ? `/admin/quotes/${booking.quote_id}` : '#'}
        className="block"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium">
              {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
            </div>
            {booking.customer_name && (
              <div className="text-sm opacity-80">{booking.customer_name}</div>
            )}
            {!compact && booking.customer_address && (
              <div className="text-sm opacity-80">{booking.customer_address}</div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
            {booking.scheduled_time && <div>{booking.scheduled_time}</div>}
            {!compact && <StatusBadge status={booking.status} />}
          </div>
        </div>
        {!compact && booking.installers && booking.installers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {booking.installers.map((inst) => (
              <Badge
                key={inst.installer_id}
                variant={
                  inst.status === 'accepted' ? 'success'
                    : inst.status === 'declined' ? 'danger'
                    : 'warning'
                }
              >
                {inst.first_name || inst.last_name
                  ? `${inst.first_name || ''} ${inst.last_name ? inst.last_name.charAt(0) + '.' : ''}`.trim()
                  : 'Installatör'}
                {inst.is_lead && ' *'}
              </Badge>
            ))}
          </div>
        )}
        {!compact && booking.notes && (
          <div className="mt-2 text-sm opacity-80">{booking.notes}</div>
        )}
      </Link>
      {booking.booking_type === 'installation' &&
        booking.status !== 'completed' &&
        booking.status !== 'cancelled' && (
        <Button size="sm" className="mt-2" onClick={() => setConfirmBookingId(booking.id)}>
          Bekräfta installation
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <PageHeader title="Kalender" subtitle="Hembesök och installationer" />
        <Card className="mb-6">
          <CardBody className="flex gap-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={<Skeleton className="h-5 w-28" />} />
          <CardBody className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-2/3" />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader
        title="Kalender"
        subtitle="Hembesök och installationer"
        actions={
          <>
            <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'h-9 rounded-md px-3 text-sm font-semibold transition-colors',
                  view === 'list' ? 'bg-green-700 text-white' : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setView('month')}
                className={cn(
                  'h-9 rounded-md px-3 text-sm font-semibold transition-colors',
                  view === 'month' ? 'bg-green-700 text-white' : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                Månad
              </button>
            </div>
            <Button onClick={() => openBookingModal()}>Ny bokning</Button>
          </>
        }
      />

      {/* Legend */}
      <Card className="mb-6">
        <CardBody className="flex flex-wrap gap-x-6 gap-y-2 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded border-2 border-amber-500 bg-amber-50"></span>
            <span className="text-gray-700">Hembesök</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded border-2 border-green-600 bg-green-50"></span>
            <span className="text-gray-700">Installation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded border-2 border-green-300 bg-green-100"></span>
            <span className="text-gray-700">Slutförd</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded border-2 border-gray-300 bg-gray-100"></span>
            <span className="text-gray-700">Avbokad</span>
          </div>
        </CardBody>
      </Card>

      {/* Installer Filter */}
      {allInstallers.length > 0 && (
        <Card className="mb-6">
          <CardBody className="py-4">
            <div className="mb-2 text-sm font-medium text-gray-700">Visa blockerade dagar för:</div>
            <div className="flex flex-wrap gap-2">
              {allInstallers.map(inst => {
                const isActive = filterInstallerIds.includes(inst.id);
                const colorClass = isActive ? getInstallerColor(inst.id) : 'bg-gray-100 text-gray-700';
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => toggleInstallerFilter(inst.id)}
                    className={`h-7 rounded-full px-3 text-xs font-semibold transition-colors ${colorClass} ${isActive ? 'ring-2 ring-gray-400 ring-offset-1' : 'hover:bg-gray-200'}`}
                  >
                    {inst.first_name} {inst.last_name}
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {view === 'list' ? (
        <>
          {/* Upcoming */}
          <Card className="mb-6">
            <CardHeader title="Kommande" />
            <div className="divide-y divide-gray-100">
              {upcomingDates.length === 0 ? (
                <div className="p-6 text-center text-gray-700">
                  Inga bokade besök eller installationer.
                </div>
              ) : (
                upcomingDates.map((date) => (
                  <div key={date} className="p-5">
                    <div className="mb-3 text-sm font-semibold capitalize text-gray-900">
                      {formatDate(date)}
                    </div>
                    <div className="space-y-2">
                      {bookingsByDate[date].map((booking) => renderBookingCard(booking))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Past (last 5) */}
          {pastDates.length > 0 && (
            <Card className="mb-6">
              <CardHeader title="Tidigare" />
              <div className="divide-y divide-gray-100">
                {pastDates.map((date) => (
                  <div key={date} className="p-5">
                    <div className="mb-2 text-sm font-medium capitalize text-gray-600">
                      {formatDate(date)}
                    </div>
                    <div className="space-y-2">
                      {bookingsByDate[date].map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                        >
                          {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                          {booking.customer_name && ` - ${booking.customer_name}`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        /* Month View */
        <Card className="mb-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <Button variant="secondary" size="sm" className="w-9 px-0" onClick={() => navigateMonth('prev')} title="Föregående månad">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <h2 className="text-base font-semibold capitalize text-gray-900">
              {currentMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="secondary" size="sm" className="w-9 px-0" onClick={() => navigateMonth('next')} title="Nästa månad">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>

          {/* Material Warning */}
          {hasLowStock && (
            <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Vissa material har låga lagernivåer. <Link href="/admin/inventory" className="font-medium underline">Se lager</Link>
            </div>
          )}

          {/* Calendar Grid */}
          <CardBody>
            {/* Weekday Headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
                <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
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
                    const dayBlocked = day.dateStr ? getBlockedForDate(day.dateStr) : [];
                    const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                    const hasVisit = dayBookings.some(b => b.booking_type === 'visit' && b.status !== 'cancelled');
                    const hasInstallation = dayBookings.some(b => b.booking_type === 'installation' && b.status !== 'cancelled');
                    const isSelected = selectedDate === day.dateStr;

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => day.dateStr && setSelectedDate(isSelected ? null : day.dateStr)}
                        className={cn(
                          'min-h-[80px] rounded-lg border p-2 text-left transition-colors hover:border-gray-400',
                          day.isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                          isToday ? 'border-2 border-green-600' : 'border-gray-200',
                          isSelected && 'ring-2 ring-green-600',
                          dayBlocked.length > 0 && 'bg-red-50'
                        )}
                      >
                        <div className={cn('text-sm', day.isCurrentMonth ? 'font-medium text-gray-900' : 'text-gray-600')}>
                          {day.date?.getDate()}
                        </div>
                        {/* Blocked Date Indicators */}
                        {dayBlocked.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {dayBlocked.map((bd, i) => (
                              <span
                                key={i}
                                className={`rounded px-1 text-[10px] ${getInstallerColor(bd.installer_id)}`}
                                title={`${getInstallerName(bd.installer_id)}: ${bd.reason || 'Blockerad'} (${bd.slot === 'full' ? 'Heldag' : bd.slot === 'morning' ? 'FM' : 'EM'})`}
                              >
                                {getInstallerName(bd.installer_id)}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Booking Dots */}
                        {dayBookings.length > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {hasVisit && (
                              <span className="h-2 w-2 rounded-full bg-amber-500" title="Hembesök" />
                            )}
                            {hasInstallation && (
                              <span className="h-2 w-2 rounded-full bg-green-600" title="Installation" />
                            )}
                            {dayBookings.length > 2 && (
                              <span className="text-xs text-gray-600">+{dayBookings.length - 2}</span>
                            )}
                          </div>
                        )}
                        {/* Booking Preview */}
                        {dayBookings.slice(0, 2).map(booking => (
                          <div
                            key={booking.id}
                            className={cn(
                              'mt-1 truncate rounded px-1 text-xs',
                              booking.booking_type === 'installation'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-900'
                            )}
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
          </CardBody>

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="border-t border-gray-200 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold capitalize text-gray-900">
                  {new Date(selectedDate).toLocaleDateString('sv-SE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                  Stäng
                </Button>
              </div>
              {getBookingsForDate(selectedDate).length === 0 ? (
                <p className="text-sm text-gray-700">Inga bokningar denna dag.</p>
              ) : (
                <div className="space-y-2">
                  {getBookingsForDate(selectedDate).map(booking => renderBookingCard(booking, true))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardBody className="py-4 text-sm text-gray-700">
          <span className="font-semibold text-gray-900">Tips:</span> Du kan också skapa bokningar direkt från offertsidan via
          &quot;Boka hembesök&quot; eller &quot;Boka installation&quot;-knapparna.
        </CardBody>
      </Card>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Ny bokning</h2>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="rounded-lg p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Stäng"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Quote Selection */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Kopplad offert (valfritt)
                </label>
                <select
                  value={bookingForm.quote_id}
                  onChange={(e) => setBookingForm({ ...bookingForm, quote_id: e.target.value })}
                  className={inputCls}
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Typ av bokning
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, booking_type: 'visit' })}
                    className={cn(
                      'h-10 flex-1 rounded-lg border px-4 text-sm font-semibold transition-colors',
                      bookingForm.booking_type === 'visit'
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Hembesök
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, booking_type: 'installation' })}
                    className={cn(
                      'h-10 flex-1 rounded-lg border px-4 text-sm font-semibold transition-colors',
                      bookingForm.booking_type === 'installation'
                        ? 'border-green-600 bg-green-50 text-green-800'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Installation
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Datum
                </label>
                <input
                  type="date"
                  value={bookingForm.scheduled_date}
                  onChange={(e) => setBookingForm({ ...bookingForm, scheduled_date: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Time */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tid
                </label>
                <select
                  value={bookingForm.scheduled_time}
                  onChange={(e) => setBookingForm({ ...bookingForm, scheduled_time: e.target.value })}
                  className={inputCls}
                >
                  {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              {/* Installer Selection */}
              {bookingForm.booking_type === 'installation' && bookingForm.scheduled_date && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Anteckningar
                </label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Valfria anteckningar..."
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 rounded-b-lg border-t border-gray-200 bg-gray-50 px-5 py-4">
              <Button variant="secondary" onClick={() => setShowBookingModal(false)}>
                Avbryt
              </Button>
              <Button onClick={handleCreateBooking} disabled={savingBooking}>
                {savingBooking ? 'Skapar...' : 'Skapa bokning'}
              </Button>
            </div>
          </Card>
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
