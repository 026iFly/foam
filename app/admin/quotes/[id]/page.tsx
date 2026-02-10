'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { QuoteRequest, QuoteStatus, CalculationData, BuildingPartRecommendation, RotCustomerInfo } from '@/lib/types/quote';
import ConfirmInstallationModal from '@/app/admin/components/ConfirmInstallationModal';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  pending: 'Väntar',
  reviewed: 'Granskad',
  quoted: 'Offerterad',
  sent: 'Skickad',
  accepted: 'Accepterad',
  rejected: 'Avvisad',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  reviewed: 'bg-blue-100 text-blue-800 border-blue-300',
  quoted: 'bg-purple-100 text-purple-800 border-purple-300',
  sent: 'bg-green-100 text-green-800 border-green-300',
  accepted: 'bg-green-200 text-green-900 border-green-400',
  rejected: 'bg-red-100 text-red-800 border-red-300',
};

const CONDENSATION_RISK_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Låg risk', color: 'text-green-600 bg-green-50' },
  medium: { label: 'Medel risk', color: 'text-yellow-600 bg-yellow-50' },
  high: { label: 'Hög risk', color: 'text-red-600 bg-red-50' },
  unknown: { label: 'Okänd', color: 'text-gray-600 bg-gray-50' },
};

interface ParsedQuote extends Omit<QuoteRequest, 'calculation_data' | 'adjusted_data'> {
  calculation_data: CalculationData | null;
  adjusted_data: CalculationData | null;
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<ParsedQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [editedRecommendations, setEditedRecommendations] = useState<BuildingPartRecommendation[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [rotLink, setRotLink] = useState<string | null>(null);
  const [rotLinkCopied, setRotLinkCopied] = useState(false);
  const [generatingRotLink, setGeneratingRotLink] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [sendingRotLink, setSendingRotLink] = useState(false);

  // Booking state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingType, setBookingType] = useState<'visit' | 'installation'>('visit');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingNotes, setBookingNotes] = useState('');
  const [savingBooking, setSavingBooking] = useState(false);
  const [confirmBookingId, setConfirmBookingId] = useState<number | null>(null);
  const [quoteBookings, setQuoteBookings] = useState<Array<{
    id: number;
    booking_type: string;
    scheduled_date: string;
    scheduled_time: string;
    status: string;
  }>>([]);

  // Status change state
  const [changingStatus, setChangingStatus] = useState(false);
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [statusHistory, setStatusHistory] = useState<Array<{
    from_status: string;
    to_status: string;
    changed_at: string;
    changed_by: string;
    notes?: string;
  }>>([]);

  useEffect(() => {
    fetchQuote();
    fetchBookings();
  }, [id]);

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/admin/quotes/${id}`);
      if (response.ok) {
        const data = await response.json();
        setQuote(data);
        setAdminNotes(data.admin_notes || '');
        // Use adjusted data if available, otherwise use original
        const calcData = data.adjusted_data || data.calculation_data;
        setEditedRecommendations(calcData?.recommendations || []);
        // Set ROT link if token exists
        if (data.rot_info_token) {
          const baseUrl = window.location.origin;
          setRotLink(`${baseUrl}/rot-info/${data.rot_info_token}`);
        }
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    }
    setLoading(false);
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      if (res.ok) {
        const data = await res.json();
        // Filter bookings for this quote
        const thisQuoteBookings = (data.bookings || []).filter(
          (b: { quote_id: number }) => b.quote_id === parseInt(id as string)
        );
        setQuoteBookings(thisQuoteBookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const openBookingModal = (type: 'visit' | 'installation') => {
    setBookingType(type);
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTime('09:00');
    setBookingNotes('');
    setShowBookingModal(true);
  };

  const handleCreateBooking = async () => {
    if (!bookingDate) {
      alert('Välj ett datum');
      return;
    }

    setSavingBooking(true);
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: parseInt(id as string),
          booking_type: bookingType,
          scheduled_date: bookingDate,
          scheduled_time: bookingTime,
          notes: bookingNotes,
        }),
      });

      if (res.ok) {
        setShowBookingModal(false);
        fetchBookings();
        alert(`${bookingType === 'visit' ? 'Hembesök' : 'Installation'} bokad!`);
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

  const handleChangeStatus = async (newStatus: string) => {
    if (!confirm(`Ändra status till "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}"?`)) {
      return;
    }

    setChangingStatus(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: 'Manuell ändring av admin',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusHistory(data.history || []);
        fetchQuote(); // Reload the quote
      } else {
        const error = await res.json();
        alert(`Fel: ${error.error || 'Kunde inte ändra status'}`);
      }
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Fel vid statusändring');
    }
    setChangingStatus(false);
  };

  const fetchStatusHistory = async () => {
    try {
      const res = await fetch(`/api/admin/quotes/${id}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatusHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching status history:', error);
    }
  };

  const updateRecommendation = (index: number, field: keyof BuildingPartRecommendation, value: number) => {
    setEditedRecommendations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  };

  const updateThickness = (index: number, field: 'closedCellThickness' | 'openCellThickness', value: number) => {
    setEditedRecommendations(prev => {
      const updated = [...prev];
      const newClosedThickness = field === 'closedCellThickness' ? value : updated[index].closedCellThickness;
      const newOpenThickness = field === 'openCellThickness' ? value : updated[index].openCellThickness;
      updated[index] = {
        ...updated[index],
        [field]: value,
        totalThickness: newClosedThickness + newOpenThickness,
      };
      return updated;
    });
    setHasChanges(true);
  };

  const handleRecalculate = async () => {
    if (!quote) return;

    const calcData = quote.adjusted_data || quote.calculation_data;
    if (!calcData) return;

    setRecalculating(true);
    try {
      const response = await fetch(`/api/admin/quotes/${id}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: editedRecommendations.map(rec => ({
            partId: rec.partId,
            partName: rec.partName,
            partType: rec.partType,
            area: rec.area,
            hasVaporBarrier: rec.hasVaporBarrier,
            closedCellThickness: rec.closedCellThickness,
            openCellThickness: rec.openCellThickness,
          })),
          climate: calcData.climate,
          options: calcData.options,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update recommendations with recalculated data
        setEditedRecommendations(result.data.recommendations);
        // Update the quote with the new adjusted data (but don't save yet)
        setQuote(prev => prev ? {
          ...prev,
          adjusted_data: result.data,
        } : null);
        setHasChanges(true);
      } else {
        const error = await response.json();
        alert(`Fel: ${error.error || 'Kunde inte räkna om'}`);
      }
    } catch (error) {
      console.error('Error recalculating:', error);
      alert('Ett fel uppstod vid omräkning');
    }
    setRecalculating(false);
  };

  const recalculateTotals = () => {
    if (!quote) return null;

    const calcData = quote.adjusted_data || quote.calculation_data;
    if (!calcData) return null;

    // Recalculate totals based on edited recommendations
    const materialCostTotal = editedRecommendations.reduce((sum, r) => sum + (r.materialCost || 0), 0);
    const laborCostTotal = editedRecommendations.reduce((sum, r) => sum + (r.laborCost || 0), 0);
    const totalExclVat = materialCostTotal + laborCostTotal + calcData.totals.travelCost + calcData.totals.generatorCost;
    const vat = Math.round(totalExclVat * 0.25);
    const totalInclVat = totalExclVat + vat;
    const laborCostInclVat = laborCostTotal * 1.25;
    const rotDeduction = calcData.options.applyRotDeduction ? Math.round(laborCostInclVat * 0.30) : 0;
    const finalTotal = totalInclVat - rotDeduction;

    return {
      totalArea: editedRecommendations.reduce((sum, r) => sum + (r.area || 0), 0),
      materialCostTotal,
      laborCostTotal,
      travelCost: calcData.totals.travelCost,
      generatorCost: calcData.totals.generatorCost,
      totalExclVat,
      vat,
      totalInclVat,
      rotDeduction,
      finalTotal,
    };
  };

  const handleSave = async () => {
    if (!quote) return;

    setSaving(true);
    try {
      const newTotals = recalculateTotals();
      const calcData = quote.adjusted_data || quote.calculation_data;

      const adjustedData: CalculationData = {
        ...calcData!,
        recommendations: editedRecommendations,
        totals: {
          ...calcData!.totals,
          ...newTotals,
        },
      };

      const response = await fetch(`/api/admin/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_notes: adminNotes,
          adjusted_data: adjustedData,
          adjusted_total_excl_vat: newTotals?.totalExclVat,
          adjusted_total_incl_vat: newTotals?.finalTotal,
        }),
      });

      if (response.ok) {
        await fetchQuote();
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving quote:', error);
    }
    setSaving(false);
  };

  const handleMarkReviewed = async () => {
    try {
      const response = await fetch(`/api/admin/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_reviewed' }),
      });
      if (response.ok) {
        await fetchQuote();
      }
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };

  const handleGenerateQuote = async () => {
    try {
      const response = await fetch(`/api/admin/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_quoted' }),
      });
      if (response.ok) {
        await fetchQuote();
      }
    } catch (error) {
      console.error('Error generating quote:', error);
    }
  };

  const handleGeneratePDF = async () => {
    window.open(`/api/admin/quotes/${id}/pdf`, '_blank');
  };

  const [sendingOffer, setSendingOffer] = useState(false);

  const handleSendOffer = async () => {
    if (!confirm('Är du säker på att du vill skicka offerten via e-post till kunden? PDF-filen kommer att bifogas.')) {
      return;
    }

    setSendingOffer(true);
    try {
      const response = await fetch(`/api/admin/quotes/${id}/send-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include_pdf: true }),
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Offert skickad till ${quote?.customer_email}!`);
        await fetchQuote();
      } else {
        const error = await response.json();
        alert(`Fel: ${error.error || 'Kunde inte skicka e-post'}`);
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      alert('Ett fel uppstod vid skickande av offert');
    }
    setSendingOffer(false);
  };

  const handleDelete = async () => {
    if (!confirm('Är du säker på att du vill ta bort denna offertförfrågan? Detta kan inte ångras.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/quotes/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/admin/quotes');
      } else {
        const error = await response.json();
        alert(`Fel: ${error.error || 'Kunde inte ta bort offerten'}`);
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
      alert('Ett fel uppstod vid borttagning av offert');
    }
    setDeleting(false);
  };

  const handleGenerateRotLink = async () => {
    setGeneratingRotLink(true);
    try {
      const response = await fetch(`/api/admin/quotes/${id}/rot-link`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setRotLink(data.link);
        await fetchQuote(); // Refresh to get updated token
      } else {
        const error = await response.json();
        alert(`Fel: ${error.error || 'Kunde inte generera ROT-länk'}`);
      }
    } catch (error) {
      console.error('Error generating ROT link:', error);
      alert('Ett fel uppstod vid generering av ROT-länk');
    }
    setGeneratingRotLink(false);
  };

  const copyRotLink = async () => {
    if (rotLink) {
      await navigator.clipboard.writeText(rotLink);
      setRotLinkCopied(true);
      setTimeout(() => setRotLinkCopied(false), 2000);
    }
  };

  const handleSendRotLink = async () => {
    if (!quote?.rot_info_token && !rotLink) {
      // First generate the link if it doesn't exist
      await handleGenerateRotLink();
    }

    setSendingRotLink(true);
    try {
      const response = await fetch(`/api/admin/quotes/${id}/send-rot-link`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        alert(`ROT-länk skickad till ${quote?.customer_email}!`);
        if (data.rot_link) {
          setRotLink(data.rot_link);
        }
      } else {
        const error = await response.json();
        alert(`Fel: ${error.error || 'Kunde inte skicka e-post'}`);
      }
    } catch (error) {
      console.error('Error sending ROT link:', error);
      alert('Ett fel uppstod vid skickande av ROT-länk');
    }
    setSendingRotLink(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          Laddar offert...
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-red-600">Offerten kunde inte hittas</p>
          <Link href="/admin/quotes" className="text-green-600 hover:underline mt-4 inline-block">
            Tillbaka till offertlistan
          </Link>
        </div>
      </div>
    );
  }

  const calculatedTotals = recalculateTotals();
  const calcData = quote.adjusted_data || quote.calculation_data;

  return (
    <div className="py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link
              href="/admin/quotes"
              className="text-green-600 hover:text-green-700 text-sm mb-2 inline-block"
            >
              ← Tillbaka till offertlistan
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">
              Offertförfrågan #{quote.id}
            </h1>
            {quote.quote_number && (
              <p className="text-lg text-gray-600 mt-1">Offertnummer: {quote.quote_number}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full border ${STATUS_COLORS[quote.status]}`}>
                {STATUS_LABELS[quote.status]}
              </span>
              <select
                value={quote.status}
                onChange={(e) => handleChangeStatus(e.target.value)}
                disabled={changingStatus}
                className="px-2 py-1 text-sm border border-gray-300 rounded-lg text-gray-700 bg-white cursor-pointer hover:border-gray-400 disabled:bg-gray-100"
              >
                <option value="pending">Ny förfrågan</option>
                <option value="reviewed">Under granskning</option>
                <option value="sent">Offert skickad</option>
                <option value="accepted">Accepterad</option>
                <option value="rejected">Avvisad</option>
                <option value="expired">Utgången</option>
              </select>
              <button
                onClick={() => {
                  fetchStatusHistory();
                  setShowStatusHistory(!showStatusHistory);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Historik
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Kundinformation</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Namn</p>
                  <p className="font-medium text-gray-900">{quote.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">E-post</p>
                  <p className="font-medium text-gray-900">{quote.customer_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefon</p>
                  <p className="font-medium text-gray-900">{quote.customer_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Adress</p>
                  <p className="font-medium text-gray-900">{quote.customer_address}</p>
                </div>
              </div>
              {quote.message && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Meddelande</p>
                  <p className="text-gray-900">{quote.message}</p>
                </div>
              )}
            </div>

            {/* ROT Information Section */}
            {calcData?.options.applyRotDeduction && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="text-blue-600">🏠</span>
                  ROT-avdrag Information
                </h2>

                {/* ROT Customer Info - if submitted */}
                {quote.rot_customer_info ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-green-600 text-lg">✓</span>
                      <span className="font-semibold text-green-800">ROT-information mottagen</span>
                    </div>
                    {(() => {
                      try {
                        const rotInfo: RotCustomerInfo = JSON.parse(quote.rot_customer_info);
                        return (
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm text-gray-600">Fastighetsbeteckning:</span>
                              <p className="font-medium text-gray-900">{rotInfo.fastighetsbeteckning}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Personer för ROT-avdrag:</span>
                              <div className="mt-2 space-y-2">
                                {rotInfo.customers.map((customer, idx) => (
                                  <div key={idx} className="bg-white border border-gray-200 rounded p-3">
                                    <div className="flex justify-between">
                                      <span className="font-medium text-gray-900">{customer.name}</span>
                                      {rotInfo.customers.length > 1 && (
                                        <span className="text-blue-600">{customer.share}%</span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      Personnummer: {customer.personnummer.slice(0, 8)}-{customer.personnummer.slice(8)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {rotInfo.submittedAt && (
                              <p className="text-xs text-gray-500">
                                Inskickat: {new Date(rotInfo.submittedAt).toLocaleString('sv-SE')}
                              </p>
                            )}
                          </div>
                        );
                      } catch {
                        return <p className="text-red-600">Kunde inte läsa ROT-information</p>;
                      }
                    })()}
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-600 text-lg">⏳</span>
                      <span className="font-semibold text-yellow-800">Väntar på ROT-information</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Kunden behöver fylla i fastighetsbeteckning och personnummer för ROT-avdraget.
                    </p>
                  </div>
                )}

                {/* ROT Link Generation */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Länk för kunduppgifter</h3>
                  {rotLink ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={rotLink}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-900 text-sm"
                        />
                        <button
                          onClick={copyRotLink}
                          className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                        >
                          {rotLinkCopied ? 'Kopierad!' : 'Kopiera'}
                        </button>
                      </div>
                      <button
                        onClick={handleSendRotLink}
                        disabled={sendingRotLink}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
                      >
                        {sendingRotLink ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Skickar...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Skicka länk via e-post
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500">
                        Eller kopiera länken ovan och skicka manuellt till kunden.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Generera en länk som kunden kan använda för att fylla i sina uppgifter för ROT-avdraget.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleGenerateRotLink}
                          disabled={generatingRotLink}
                          className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
                        >
                          {generatingRotLink ? 'Genererar...' : 'Generera ROT-länk'}
                        </button>
                        <button
                          onClick={handleSendRotLink}
                          disabled={sendingRotLink}
                          className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition disabled:bg-gray-400 flex items-center gap-2"
                        >
                          {sendingRotLink ? 'Skickar...' : 'Generera & skicka direkt'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Building Parts Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Byggnadsdelar - Detaljerad specifikation</h2>
              <div className="space-y-6">
                {editedRecommendations.map((rec, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{rec.partName}</h3>
                        <span className="text-sm text-gray-500">{rec.partType}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        {/* Vapor Barrier Status */}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          rec.hasVaporBarrier
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {rec.hasVaporBarrier ? 'Med ångspärr' : 'Utan ångspärr'}
                        </span>
                        {/* Config Type */}
                        {rec.configType && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {rec.configType === 'closed_only' ? 'Endast slutencell' :
                             rec.configType === 'open_only' ? 'Endast öppencell' :
                             'Flash & Batt'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* U-Value Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-gray-500">Krav U-värde:</span>
                          <span className="ml-2 font-medium text-gray-900">{rec.requiredUValue?.toFixed(2) || '-'} W/m²K</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Uppnått U-värde:</span>
                          <span className={`ml-2 font-medium ${rec.meetsUValue ? 'text-green-600' : 'text-red-600'}`}>
                            {rec.actualUValue?.toFixed(2) || '-'} W/m²K
                          </span>
                        </div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded ${rec.meetsUValue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {rec.meetsUValue ? 'Uppfyller krav' : 'Uppfyller ej krav'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Condensation Analysis */}
                    {rec.condensationAnalysis && (
                      <div className="mb-4 p-3 border border-gray-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Kondensanalys</h4>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Kondensrisk:</span>
                            <span className={`px-2 py-0.5 rounded ${CONDENSATION_RISK_LABELS[rec.condensationAnalysis.risk]?.color || 'bg-gray-100'}`}>
                              {CONDENSATION_RISK_LABELS[rec.condensationAnalysis.risk]?.label || rec.condensationAnalysis.risk}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Daggpunkt inomhus:</span>
                            <span className="font-medium text-gray-900">{rec.condensationAnalysis.dewPointInside?.toFixed(1)}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Temp vid gränssnitt:</span>
                            <span className="font-medium text-gray-900">{rec.condensationAnalysis.tempAtInterface?.toFixed(1)}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Säkerhetsmarginal:</span>
                            <span className={`font-medium ${rec.condensationAnalysis.safetyMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {rec.condensationAnalysis.safetyMargin?.toFixed(1)}°C
                            </span>
                          </div>
                        </div>
                        {rec.condensationAnalysis.explanation && (
                          <p className="mt-2 text-xs text-gray-600 italic">{rec.condensationAnalysis.explanation}</p>
                        )}
                      </div>
                    )}

                    {/* Editable Thickness Fields */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Justera tjocklek (räkna om för nya kostnader och daggpunkt)</h4>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <label className="block text-gray-600 mb-1">Slutencell tjocklek (mm)</label>
                          <input
                            type="number"
                            step="5"
                            min="0"
                            value={rec.closedCellThickness}
                            onChange={(e) => updateThickness(idx, 'closedCellThickness', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">Öppencell tjocklek (mm)</label>
                          <input
                            type="number"
                            step="5"
                            min="0"
                            value={rec.openCellThickness}
                            onChange={(e) => updateThickness(idx, 'openCellThickness', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-600 mb-1">Total tjocklek</label>
                          <div className="px-3 py-2 bg-gray-100 rounded text-gray-900 font-medium">
                            {rec.totalThickness} mm
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Material Specification (calculated values) */}
                    <div className="mb-4 p-3 bg-green-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Materialspecifikation (exkl. moms)</h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 block">Slutencell skum</span>
                          <span className="font-bold text-green-700 text-lg">{rec.closedCellKg?.toFixed(1) || 0} kg</span>
                          <span className="text-gray-600 block">{rec.closedCellThickness} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Öppencell skum</span>
                          <span className="font-bold text-green-700 text-lg">{rec.openCellKg?.toFixed(1) || 0} kg</span>
                          <span className="text-gray-600 block">{rec.openCellThickness} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Slutencell kostnad</span>
                          <span className="font-medium text-gray-900">{Math.round(rec.closedCellCost || 0).toLocaleString('sv-SE')} kr</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Öppencell kostnad</span>
                          <span className="font-medium text-gray-900">{Math.round(rec.openCellCost || 0).toLocaleString('sv-SE')} kr</span>
                        </div>
                      </div>
                    </div>

                    {/* Other Editable Fields */}
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      {/* Area */}
                      <div>
                        <label className="block text-gray-500 mb-1">Yta (m²)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rec.area}
                          onChange={(e) => updateRecommendation(idx, 'area', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                        />
                      </div>

                      {/* Material Cost */}
                      <div>
                        <label className="block text-gray-500 mb-1">Materialkostnad exkl. moms (kr)</label>
                        <input
                          type="number"
                          value={Math.round(rec.materialCost)}
                          onChange={(e) => updateRecommendation(idx, 'materialCost', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                        />
                      </div>

                      {/* Labor Cost */}
                      <div>
                        <label className="block text-gray-500 mb-1">Arbetskostnad exkl. moms (kr)</label>
                        <input
                          type="number"
                          value={Math.round(rec.laborCost)}
                          onChange={(e) => updateRecommendation(idx, 'laborCost', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Part Total */}
                    <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-sm text-gray-600">Deltotal exkl. moms ({rec.laborHours?.toFixed(1) || 0} arbetstimmar):</span>
                      <span className="font-semibold text-gray-900">{Math.round(rec.totalCost || 0).toLocaleString('sv-SE')} kr</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Interna anteckningar</h2>
              <textarea
                value={adminNotes}
                onChange={(e) => {
                  setAdminNotes(e.target.value);
                  setHasChanges(true);
                }}
                rows={4}
                placeholder="Anteckningar för intern användning..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900"
              />
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Åtgärder</h2>
              <div className="space-y-3">
                {/* Recalculate Button */}
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {recalculating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Räknar om...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Räkna om med nya värden
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 -mt-1 mb-2">Uppdaterar kostnader, materialåtgång och daggpunktsanalys baserat på aktuella priser och tjocklekar</p>

                {hasChanges && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
                  >
                    {saving ? 'Sparar...' : 'Spara ändringar'}
                  </button>
                )}

                {quote.status === 'pending' && (
                  <button
                    onClick={handleMarkReviewed}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Markera som granskad
                  </button>
                )}

                {(quote.status === 'reviewed' || quote.status === 'pending') && !quote.quote_number && (
                  <button
                    onClick={handleGenerateQuote}
                    className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition"
                  >
                    Skapa offert
                  </button>
                )}

                {quote.quote_number && (
                  <>
                    <button
                      onClick={handleGeneratePDF}
                      className="w-full bg-gray-600 text-white py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition"
                    >
                      Ladda ned PDF
                    </button>

                    {quote.status !== 'sent' && quote.status !== 'accepted' && quote.status !== 'rejected' && (
                      <button
                        onClick={handleSendOffer}
                        disabled={sendingOffer}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
                      >
                        {sendingOffer ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Skickar offert...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Skicka offert via e-post
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}

                {/* Booking Buttons */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Bokningar</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openBookingModal('visit')}
                      className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 py-2 rounded-lg font-medium hover:bg-blue-100 transition text-sm"
                    >
                      Boka hembesök
                    </button>
                    <button
                      onClick={() => openBookingModal('installation')}
                      className="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded-lg font-medium hover:bg-green-100 transition text-sm"
                    >
                      Boka installation
                    </button>
                  </div>

                  {/* Existing Bookings for this quote */}
                  {quoteBookings.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {quoteBookings.map(booking => (
                        <div
                          key={booking.id}
                          className={`text-sm p-2 rounded ${
                            booking.booking_type === 'installation'
                              ? 'bg-green-50 text-green-800'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                              </div>
                              <div className="text-xs opacity-75">
                                {new Date(booking.scheduled_date).toLocaleDateString('sv-SE')} {booking.scheduled_time?.slice(0, 5)}
                                <span className="ml-2 capitalize">({booking.status})</span>
                              </div>
                            </div>
                            {booking.booking_type === 'installation' &&
                              booking.status !== 'completed' &&
                              booking.status !== 'cancelled' && (
                              <button
                                onClick={() => setConfirmBookingId(booking.id)}
                                className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition whitespace-nowrap"
                              >
                                Bekräfta installation
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Material Totals */}
            {calcData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Materialåtgång totalt</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Slutencell skum:</span>
                    <span className="font-bold text-green-700">{calcData.totals.totalClosedCellKg?.toFixed(1) || 0} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Öppencell skum:</span>
                    <span className="font-bold text-green-700">{calcData.totals.totalOpenCellKg?.toFixed(1) || 0} kg</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-semibold text-gray-900">Totalt skum:</span>
                    <span className="text-lg font-bold text-green-600">
                      {((calcData.totals.totalClosedCellKg || 0) + (calcData.totals.totalOpenCellKg || 0)).toFixed(1)} kg
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cost Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Kostnadssammanställning</h2>
              {calculatedTotals && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total yta:</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.totalArea.toFixed(1)} m²</span>
                  </div>

                  {/* Costs excluding VAT */}
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">Kostnader exkl. moms:</p>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Material:</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.materialCostTotal.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arbete:</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.laborCostTotal.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transport:</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.travelCost.toLocaleString('sv-SE')} kr</span>
                  </div>
                  {calculatedTotals.generatorCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Generator:</span>
                      <span className="font-medium text-gray-900">{calculatedTotals.generatorCost.toLocaleString('sv-SE')} kr</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 flex justify-between bg-gray-50 -mx-6 px-6 py-2">
                    <span className="font-semibold text-gray-700">Summa exkl. moms:</span>
                    <span className="font-bold text-gray-900">{calculatedTotals.totalExclVat.toLocaleString('sv-SE')} kr</span>
                  </div>

                  {/* VAT Calculation */}
                  <p className="text-xs text-gray-500 pt-2">Momsberäkning:</p>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Moms (25%):</span>
                    <span className="font-medium text-gray-900">+ {calculatedTotals.vat.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Totalt inkl. moms:</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.totalInclVat.toLocaleString('sv-SE')} kr</span>
                  </div>
                  {calculatedTotals.rotDeduction > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>ROT-avdrag:</span>
                      <span className="font-medium">- {calculatedTotals.rotDeduction.toLocaleString('sv-SE')} kr</span>
                    </div>
                  )}
                  <div className="border-t-2 border-green-500 pt-3 flex justify-between bg-green-50 -mx-6 px-6 py-3 rounded-b-lg">
                    <span className="font-bold text-gray-900">Att betala:</span>
                    <span className="text-xl font-bold text-green-600">
                      {calculatedTotals.finalTotal.toLocaleString('sv-SE')} kr
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Offer Status */}
            {quote.offer_token && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Offertstatus</h2>
                <div className="space-y-4">
                  {/* Status indicator */}
                  <div className={`p-3 rounded-lg ${
                    quote.status === 'accepted'
                      ? 'bg-green-50 border border-green-200'
                      : quote.status === 'rejected'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {quote.status === 'accepted' && (
                        <>
                          <span className="text-green-600 text-xl">✓</span>
                          <span className="font-semibold text-green-800">Offert godkänd</span>
                        </>
                      )}
                      {quote.status === 'rejected' && (
                        <>
                          <span className="text-red-600 text-xl">✕</span>
                          <span className="font-semibold text-red-800">Offert avböjd</span>
                        </>
                      )}
                      {quote.status === 'sent' && (
                        <>
                          <span className="text-blue-600 text-xl">📧</span>
                          <span className="font-semibold text-blue-800">Väntar på svar</span>
                        </>
                      )}
                    </div>
                    {quote.signed_name && (
                      <p className="text-sm text-gray-600 mt-2">
                        Signerad av: <span className="font-medium">{quote.signed_name}</span>
                      </p>
                    )}
                    {quote.accepted_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Godkänd: {formatDate(quote.accepted_at)}
                      </p>
                    )}
                    {quote.rejected_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Avböjd: {formatDate(quote.rejected_at)}
                      </p>
                    )}
                    {quote.signed_ip && (
                      <p className="text-xs text-gray-500">
                        IP-adress: {quote.signed_ip}
                      </p>
                    )}
                  </div>

                  {/* Offer link */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-500 mb-2">Offertlänk för kund:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/offert/${quote.offer_token}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-900 text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/offert/${quote.offer_token}`);
                          alert('Länk kopierad!');
                        }}
                        className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                      >
                        Kopiera
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Tidsstämplar</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Skapad:</span>
                  <p className="text-gray-900">{formatDate(quote.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Uppdaterad:</span>
                  <p className="text-gray-900">{formatDate(quote.updated_at)}</p>
                </div>
                {quote.email_sent_at && (
                  <div>
                    <span className="text-gray-500">E-post skickad:</span>
                    <p className="text-gray-900">{formatDate(quote.email_sent_at)}</p>
                  </div>
                )}
                {quote.quote_valid_until && (
                  <div>
                    <span className="text-gray-500">Offert giltig till:</span>
                    <p className="text-gray-900">{formatDate(quote.quote_valid_until)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Project Logistics - Distance & Generator */}
            {calcData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Projektlogistik</h2>
                <div className="space-y-4">
                  {/* Distance */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-semibold text-gray-900">Avstånd till kund</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {calcData.totals.distanceKm || calcData.options.distanceKm || '?'} km
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Enkel väg från {quote.customer_address}</p>
                  </div>

                  {/* Generator Requirement */}
                  <div className={`p-3 rounded-lg ${calcData.options.hasThreePhase ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="font-semibold text-gray-900">Elförsörjning</span>
                    </div>
                    {calcData.options.hasThreePhase ? (
                      <>
                        <p className="text-lg font-bold text-green-700">3-fas tillgänglig</p>
                        <p className="text-xs text-gray-600">Ingen generator behövs</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-bold text-orange-700">Generator krävs</p>
                        <p className="text-xs text-gray-600">Kunden har ej 3-fas</p>
                        {calcData.totals.generatorCost > 0 && (
                          <p className="text-sm font-medium text-orange-800 mt-1">
                            Kostnad: {calcData.totals.generatorCost.toLocaleString('sv-SE')} kr
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Hours Breakdown */}
            {calcData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Tidsåtgång</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sprutning:</span>
                    <span className="font-medium text-gray-900">{calcData.totals.sprayHours?.toFixed(1) || 0} tim</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uppsättning:</span>
                    <span className="font-medium text-gray-900">{calcData.totals.setupHours?.toFixed(1) || 0} tim</span>
                  </div>
                  {(calcData.totals.switchingHours ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Maskinbyte:</span>
                      <span className="font-medium text-gray-900">{calcData.totals.switchingHours?.toFixed(1)} tim</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Restid:</span>
                    <span className="font-medium text-gray-900">{calcData.totals.travelHours?.toFixed(1) || 0} tim</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-semibold text-gray-900">Totalt:</span>
                    <span className="text-lg font-bold text-green-600">{calcData.totals.totalHours?.toFixed(1) || 0} tim</span>
                  </div>
                </div>
              </div>
            )}

            {/* Climate Settings */}
            {calcData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Klimatinställningar</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Klimatzon:</span>
                    <span className="text-gray-900">{calcData.climate.zone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inomhustemp:</span>
                    <span className="text-gray-900">{calcData.climate.indoorTemp}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Luftfuktighet:</span>
                    <span className="text-gray-900">{calcData.climate.indoorRH}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utomhustemp (DUT):</span>
                    <span className="text-gray-900">{calcData.climate.outdoorTemp}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ROT-avdrag:</span>
                    <span className={`font-medium ${calcData.options.applyRotDeduction ? 'text-green-600' : 'text-gray-900'}`}>
                      {calcData.options.applyRotDeduction ? 'Ja' : 'Nej'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Quote */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-red-200">
              <h2 className="text-xl font-semibold mb-4 text-red-700">Farlig zon</h2>
              <p className="text-sm text-gray-600 mb-4">
                Att ta bort en offertförfrågan är permanent och kan inte ångras.
              </p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400"
              >
                {deleting ? 'Tar bort...' : 'Ta bort offertförfrågan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {bookingType === 'visit' ? 'Boka hembesök' : 'Boka installation'}
              </h2>
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
              {/* Customer Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-800">{quote?.customer_name}</div>
                <div className="text-sm text-gray-600">{quote?.customer_address}</div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tid
                </label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anteckningar
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
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
                className={`px-4 py-2 text-white rounded-lg disabled:bg-gray-400 ${
                  bookingType === 'visit'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {savingBooking ? 'Skapar...' : 'Skapa bokning'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status History Modal */}
      {showStatusHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Statushistorik</h2>
              <button
                onClick={() => setShowStatusHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              {statusHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Ingen statushistorik finns.</p>
              ) : (
                <div className="space-y-3">
                  {statusHistory.slice().reverse().map((entry, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[entry.from_status as keyof typeof STATUS_COLORS] || 'bg-gray-100'}`}>
                          {STATUS_LABELS[entry.from_status as keyof typeof STATUS_LABELS] || entry.from_status}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[entry.to_status as keyof typeof STATUS_COLORS] || 'bg-gray-100'}`}>
                          {STATUS_LABELS[entry.to_status as keyof typeof STATUS_LABELS] || entry.to_status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(entry.changed_at).toLocaleString('sv-SE')}
                        {entry.changed_by && ` av ${entry.changed_by}`}
                      </div>
                      {entry.notes && (
                        <div className="text-xs text-gray-600 mt-1 italic">{entry.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Current status info */}
              {quote?.signed_name && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-medium text-gray-800 mb-2">Signaturinformation</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Signerad av:</strong> {quote.signed_name}</p>
                    {quote.accepted_at && (
                      <p><strong>Signerad:</strong> {new Date(quote.accepted_at).toLocaleString('sv-SE')}</p>
                    )}
                    {quote.signed_ip && (
                      <p><strong>IP-adress:</strong> {quote.signed_ip}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowStatusHistory(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Stäng
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
            fetchBookings();
          }}
          onClose={() => setConfirmBookingId(null)}
        />
      )}
    </div>
  );
}
