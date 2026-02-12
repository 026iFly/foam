'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface PortalData {
  booking: {
    id: number;
    scheduled_date: string;
    scheduled_time: string;
    status: string;
    booking_type: string;
    slot_type: string;
    num_installers: number;
    customer_booked_at: string | null;
  } | null;
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
    apply_rot_deduction: boolean;
    rot_max_per_person: number;
    rot_customer_max: Record<string, number> | null;
  };
  rot_customer_info: {
    fastighetsbeteckning: string;
    customers: Array<{ name: string; personnummer: string; share: number }>;
    submittedAt: string;
  } | null;
  installers: Array<{
    first_name: string;
    is_lead: boolean;
    confirmed: boolean;
  }>;
  can_reschedule: boolean;
  reschedule_deadline_days: number;
  has_booking: boolean;
}

interface RotCustomer {
  name: string;
  personnummer: string;
  share: number;
  maxRot: number;
}

export default function CustomerPortalPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Self-booking state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [booking, setBooking] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // ROT form state
  const [showRotForm, setShowRotForm] = useState(false);
  const [rotFastighetsbeteckning, setRotFastighetsbeteckning] = useState('');
  const [rotCustomers, setRotCustomers] = useState<RotCustomer[]>([
    { name: '', personnummer: '', share: 100, maxRot: 50000 }
  ]);
  const [submittingRot, setSubmittingRot] = useState(false);
  const [rotError, setRotError] = useState('');

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/kund/${token}/booking`);
      if (!res.ok) {
        setError('Kunde inte hämta information');
        return;
      }
      const portalData = await res.json();
      setData(portalData);

      // Pre-fill ROT form if data exists
      if (portalData.rot_customer_info) {
        const info = portalData.rot_customer_info;
        setRotFastighetsbeteckning(info.fastighetsbeteckning || '');
        setRotCustomers(info.customers.map((c: { name: string; personnummer: string; share: number }, idx: number) => ({
          name: c.name,
          personnummer: formatPersonnummer(c.personnummer),
          share: c.share,
          maxRot: portalData.quote.rot_customer_max?.[String(idx)] ?? portalData.quote.rot_max_per_person ?? 50000,
        })));
      }
    } catch {
      setError('Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const verified = sessionStorage.getItem(`kund_verified_${token}`);
    if (!verified) {
      router.push(`/kund/${token}`);
      return;
    }
    fetchBooking();
  }, [token, router, fetchBooking]);

  const fetchAvailableSlots = async () => {
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

  const openDatePicker = async () => {
    setShowDatePicker(true);
    setSelectedDate('');
    await fetchAvailableSlots();
  };

  const handleBookDate = async () => {
    if (!selectedDate) return;
    setBooking(true);
    try {
      const res = await fetch(`/api/kund/${token}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Kunde inte boka datum');
        return;
      }
      setShowDatePicker(false);
      fetchBooking();
    } catch {
      setError('Bokning misslyckades');
    } finally {
      setBooking(false);
    }
  };

  const openReschedule = async () => {
    setShowReschedule(true);
    setSelectedDate('');
    await fetchAvailableSlots();
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

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/kund/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error);
        return;
      }
      setShowCancelConfirm(false);
      fetchBooking();
    } catch {
      setError('Avbokning misslyckades');
    } finally {
      setCancelling(false);
    }
  };

  // Calendar helpers for month-view date picker
  const getCalendarWeeks = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const weeks: Array<Array<{ date: Date; dateStr: string; isCurrentMonth: boolean }>> = [];
    let week: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean }> = [];

    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, 1 - (startDow - i));
      week.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: false });
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      week.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: true });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) {
      let nextDay = 1;
      while (week.length < 7) {
        const d = new Date(year, month + 1, nextDay++);
        week.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: false });
      }
      weeks.push(week);
    }
    return weeks;
  };

  const navigateCalendar = (dir: 'prev' | 'next') => {
    setCalendarMonth(prev => {
      const m = new Date(prev);
      m.setMonth(m.getMonth() + (dir === 'next' ? 1 : -1));
      return m;
    });
  };

  const renderCalendarPicker = (onConfirm: () => void, confirmLabel: string, isConfirming: boolean, onCancel: () => void) => {
    const weeks = getCalendarWeeks();
    const availableSet = new Set(availableDates);
    const todayStr = new Date().toISOString().split('T')[0];

    return (
      <div className="space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigateCalendar('prev')} className="p-1 hover:bg-gray-100 rounded text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-medium text-gray-900 capitalize">
            {calendarMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => navigateCalendar('next')} className="p-1 hover:bg-gray-100 rounded text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-600 py-1">{d}</div>
          ))}
        </div>
        {/* Days grid */}
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) => {
                const isAvailable = availableSet.has(day.dateStr);
                const isSelected = selectedDate === day.dateStr;
                const isPast = day.dateStr < todayStr;
                return (
                  <button
                    key={di}
                    onClick={() => isAvailable && setSelectedDate(day.dateStr)}
                    disabled={!isAvailable || isPast}
                    className={`
                      h-10 rounded text-sm transition
                      ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                      ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                      ${isAvailable && !isSelected ? 'bg-green-50 text-green-800 hover:bg-green-100 font-medium' : ''}
                      ${!isAvailable && day.isCurrentMonth && !isPast ? 'text-gray-300' : ''}
                      ${isPast && day.isCurrentMonth ? 'text-gray-300' : ''}
                      ${!isAvailable ? 'cursor-default' : 'cursor-pointer'}
                    `}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {selectedDate && (
          <p className="text-sm text-gray-900 font-medium text-center">
            Valt datum: {formatDate(selectedDate)}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={!selectedDate || isConfirming}
            className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isConfirming ? 'Vänta...' : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="px-4 bg-gray-100 text-gray-700 rounded-lg py-3 text-sm hover:bg-gray-200"
          >
            Avbryt
          </button>
        </div>
      </div>
    );
  };

  // ROT form handlers
  const formatPersonnummer = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 8) {
      return digits.slice(0, 8) + '-' + digits.slice(8, 12);
    }
    return digits;
  };

  const addRotCustomer = () => {
    if (rotCustomers.length < 4) {
      const newShare = Math.floor(100 / (rotCustomers.length + 1));
      const updated = rotCustomers.map(c => ({ ...c, share: newShare }));
      updated.push({ name: '', personnummer: '', share: newShare, maxRot: data?.quote.rot_max_per_person ?? 50000 });
      const total = updated.reduce((s, c) => s + c.share, 0);
      if (total !== 100) updated[updated.length - 1].share += (100 - total);
      setRotCustomers(updated);
    }
  };

  const removeRotCustomer = (index: number) => {
    if (rotCustomers.length > 1) {
      const newCustomers = rotCustomers.filter((_, i) => i !== index);
      const sharePerCustomer = Math.floor(100 / newCustomers.length);
      const remainder = 100 - (sharePerCustomer * newCustomers.length);
      setRotCustomers(newCustomers.map((c, i) => ({
        ...c,
        share: sharePerCustomer + (i === 0 ? remainder : 0)
      })));
    }
  };

  const updateRotCustomer = (index: number, field: keyof RotCustomer, value: string | number) => {
    setRotCustomers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitRot = async () => {
    setRotError('');

    if (!rotFastighetsbeteckning.trim()) {
      setRotError('Fastighetsbeteckning krävs');
      return;
    }

    for (let i = 0; i < rotCustomers.length; i++) {
      if (!rotCustomers[i].name.trim()) {
        setRotError(`Namn krävs för person ${i + 1}`);
        return;
      }
      const clean = rotCustomers[i].personnummer.replace(/\D/g, '');
      if (clean.length !== 12) {
        setRotError(`Ogiltigt personnummer för ${rotCustomers[i].name || `person ${i + 1}`}. Ange 12 siffror.`);
        return;
      }
    }

    const totalShare = rotCustomers.reduce((sum, c) => sum + c.share, 0);
    if (totalShare !== 100) {
      setRotError('Fördelningen måste summera till 100%');
      return;
    }

    const rotMaxPerPerson = data?.quote.rot_max_per_person ?? 50000;
    for (let i = 0; i < rotCustomers.length; i++) {
      if (rotCustomers[i].maxRot > rotMaxPerPerson) {
        setRotError(`Max ROT per person kan inte överstiga ${rotMaxPerPerson.toLocaleString('sv-SE')} kr`);
        return;
      }
    }

    setSubmittingRot(true);
    try {
      const customerMaxRot: Record<string, number> = {};
      rotCustomers.forEach((c, i) => {
        customerMaxRot[String(i)] = c.maxRot;
      });

      const res = await fetch(`/api/kund/${token}/rot-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fastighetsbeteckning: rotFastighetsbeteckning.trim(),
          customers: rotCustomers.map(c => ({
            name: c.name.trim(),
            personnummer: c.personnummer.replace(/\D/g, ''),
            share: c.share,
          })),
          customer_max_rot: customerMaxRot,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setRotError(errData.error || 'Kunde inte spara ROT-information');
        return;
      }

      setShowRotForm(false);
      fetchBooking();
    } catch {
      setRotError('Ett fel uppstod');
    } finally {
      setSubmittingRot(false);
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

  const { booking: bookingInfo, customer, quote, rot_customer_info, installers, can_reschedule, reschedule_deadline_days, has_booking } = data;
  const needsDateSelection = has_booking && bookingInfo && !bookingInfo.customer_booked_at && bookingInfo.status === 'scheduled';
  const noBookingYet = !has_booking;

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
            {noBookingYet
              ? 'Tack för din beställning! Här kan du välja installationsdatum och hantera dina uppgifter.'
              : 'Här kan du se information om din bokning och göra ändringar.'}
          </p>
        </div>

        {/* No booking yet — prominent date selection */}
        {(noBookingYet || needsDateSelection) && !showDatePicker && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-2">Välj installationsdatum</h3>
            <p className="text-sm text-gray-700 mb-4">
              {noBookingYet
                ? 'Välj ett datum som passar dig för installationen.'
                : 'Tack för din beställning! Välj ett datum som passar dig för installationen.'}
            </p>
            <button
              onClick={openDatePicker}
              className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700"
            >
              Välj datum
            </button>
          </div>
        )}

        {showDatePicker && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Välj installationsdatum</h3>

            {loadingSlots ? (
              <p className="text-sm text-gray-700">Hämtar tillgängliga datum...</p>
            ) : availableDates.length > 0 ? (
              renderCalendarPicker(handleBookDate, booking ? 'Bokar...' : 'Bekräfta datum', booking, () => setShowDatePicker(false))
            ) : (
              <p className="text-sm text-gray-700">Inga tillgängliga datum just nu. Kontakta oss för hjälp.</p>
            )}
          </div>
        )}

        {/* Booking Status — only show if booking exists */}
        {has_booking && bookingInfo && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-semibold text-gray-900">Din bokning</h3>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                needsDateSelection ? 'bg-yellow-100 text-yellow-800' : formatStatus(bookingInfo.status).color
              }`}>
                {needsDateSelection ? 'Väntar på datum' : formatStatus(bookingInfo.status).label}
              </span>
            </div>

            <div className="space-y-3">
              {!needsDateSelection && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Datum</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(bookingInfo.scheduled_date)}</span>
                </div>
              )}
              {!needsDateSelection && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Tid</span>
                  <span className="text-sm font-medium text-gray-900">{formatSlot(bookingInfo.slot_type)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">Adress</span>
                <span className="text-sm font-medium text-gray-900">{customer.address}</span>
              </div>
            </div>
          </div>
        )}

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

        {/* ROT Section */}
        {quote.apply_rot_deduction && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">ROT-avdrag</h3>

            {rot_customer_info && !showRotForm ? (
              /* ROT info submitted — read-only summary */
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="font-medium text-green-800 text-sm">ROT-information inskickad</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-700">Fastighetsbeteckning:</span>
                      <span className="ml-2 font-medium text-gray-900">{rot_customer_info.fastighetsbeteckning}</span>
                    </div>
                    {rot_customer_info.customers.map((c, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded p-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">{c.name}</span>
                          {rot_customer_info.customers.length > 1 && (
                            <span className="text-blue-700">{c.share}%</span>
                          )}
                        </div>
                        {quote.rot_customer_max?.[String(idx)] !== undefined && (
                          <span className="text-xs text-gray-700">
                            Max ROT: {quote.rot_customer_max[String(idx)].toLocaleString('sv-SE')} kr
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowRotForm(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ändra ROT-information
                </button>
              </div>
            ) : (
              /* ROT form — inline */
              <div>
                {!showRotForm && !rot_customer_info && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                    <p className="text-sm text-gray-900 font-medium mb-1">ROT-information behövs</p>
                    <p className="text-sm text-gray-700">
                      Fyll i uppgifter för ROT-avdraget. Du kan även sänka ditt maximala ROT-belopp om du redan använt ROT i år.
                    </p>
                  </div>
                )}

                {(showRotForm || !rot_customer_info) && (
                  <div className="space-y-4">
                    {rotError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{rotError}</div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Fastighetsbeteckning *</label>
                      <input
                        type="text"
                        value={rotFastighetsbeteckning}
                        onChange={(e) => setRotFastighetsbeteckning(e.target.value)}
                        placeholder="T.ex. STOCKHOLM SÖDERMALM 1:234"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                      />
                      <p className="text-xs text-gray-700 mt-1">
                        Finns på din senaste fastighetstaxering eller i lagfarten
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-900">Personer för ROT-avdrag *</label>
                        {rotCustomers.length < 4 && (
                          <button type="button" onClick={addRotCustomer} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            + Lägg till person
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {rotCustomers.map((c, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-900">Person {idx + 1}</span>
                              {rotCustomers.length > 1 && (
                                <button type="button" onClick={() => removeRotCustomer(idx)} className="text-xs text-red-600 hover:text-red-800">
                                  Ta bort
                                </button>
                              )}
                            </div>

                            <div className="space-y-2">
                              <input
                                type="text"
                                value={c.name}
                                onChange={(e) => updateRotCustomer(idx, 'name', e.target.value)}
                                placeholder="Förnamn Efternamn"
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                              />
                              <input
                                type="text"
                                value={c.personnummer}
                                onChange={(e) => updateRotCustomer(idx, 'personnummer', formatPersonnummer(e.target.value))}
                                placeholder="ÅÅÅÅMMDD-XXXX"
                                maxLength={13}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                              />

                              {rotCustomers.length > 1 && (
                                <div>
                                  <label className="block text-xs text-gray-700 mb-1">Andel av ROT-avdrag (%)</label>
                                  <input
                                    type="number"
                                    value={c.share}
                                    onChange={(e) => updateRotCustomer(idx, 'share', parseInt(e.target.value) || 0)}
                                    min={1}
                                    max={100}
                                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                                  />
                                </div>
                              )}

                              <div>
                                <label className="block text-xs text-gray-700 mb-1">
                                  Max ROT-avdrag (kr) — sänk om du använt ROT i år
                                </label>
                                <input
                                  type="number"
                                  value={c.maxRot}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    const maxAllowed = data?.quote.rot_max_per_person ?? 50000;
                                    updateRotCustomer(idx, 'maxRot', Math.min(val, maxAllowed));
                                  }}
                                  min={0}
                                  max={data?.quote.rot_max_per_person ?? 50000}
                                  step={1000}
                                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                                />
                                <p className="text-xs text-gray-700 mt-0.5">
                                  Max {(data?.quote.rot_max_per_person ?? 50000).toLocaleString('sv-SE')} kr per person/år
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {rotCustomers.length > 1 && (
                        <p className="text-xs text-gray-700 mt-1">
                          Total fördelning: {rotCustomers.reduce((sum, c) => sum + c.share, 0)}%
                          {rotCustomers.reduce((sum, c) => sum + c.share, 0) !== 100 && (
                            <span className="text-red-600"> (måste vara 100%)</span>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSubmitRot}
                        disabled={submittingRot}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submittingRot ? 'Skickar...' : 'Spara ROT-information'}
                      </button>
                      {showRotForm && rot_customer_info && (
                        <button
                          onClick={() => setShowRotForm(false)}
                          className="px-4 bg-gray-100 text-gray-700 rounded-lg py-3 text-sm hover:bg-gray-200"
                        >
                          Avbryt
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-700">
                      Uppgifterna hanteras enligt GDPR och används endast för ROT-ansökan hos Skatteverket.
                    </p>
                  </div>
                )}
              </div>
            )}
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
              {quote.rot_deduction > 0 && (
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-sm font-medium text-gray-900">Att betala</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(quote.total_incl_vat - quote.rot_deduction)}</span>
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
              renderCalendarPicker(handleReschedule, rescheduling ? 'Ombokar...' : 'Bekräfta ombokning', rescheduling, () => setShowReschedule(false))
            ) : (
              <p className="text-sm text-gray-700">Inga tillgängliga datum just nu. Kontakta oss för hjälp.</p>
            )}
          </div>
        )}

        {/* Cancel Booking */}
        {has_booking && bookingInfo && bookingInfo.status !== 'cancelled' && bookingInfo.status !== 'completed' && (
          <div className="bg-white rounded-lg shadow p-6">
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full text-red-600 text-sm font-medium hover:text-red-800"
              >
                Avboka installation
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 mb-2">Vill du verkligen avboka?</p>
                  <p className="text-xs text-red-700">
                    Vid avbokning kan du inte ångra beslutet. Kontakta oss om du vill boka om istället.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 bg-red-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelling ? 'Avbokar...' : 'Ja, avboka'}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-3 text-sm hover:bg-gray-200"
                  >
                    Nej, behåll
                  </button>
                </div>
              </div>
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
