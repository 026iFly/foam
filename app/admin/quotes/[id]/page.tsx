'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import type { QuoteRequest, QuoteStatus, CalculationData, BuildingPartRecommendation, RotCustomerInfo } from '@/lib/types/quote';
import ConfirmInstallationModal from '@/app/admin/components/ConfirmInstallationModal';
import InstallerPicker from '@/app/admin/components/InstallerPicker';
import { PageHeader, Card, CardHeader, CardBody, Badge, StatusBadge, Button, Skeleton, cn, type BadgeVariant } from '@/app/components/ui';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  pending: 'Väntar',
  reviewed: 'Granskad',
  quoted: 'Offerterad',
  sent: 'Skickad',
  accepted: 'Accepterad',
  rejected: 'Avvisad',
};

const CONDENSATION_RISK_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Låg risk', variant: 'success' },
  medium: { label: 'Medel risk', variant: 'warning' },
  high: { label: 'Hög risk', variant: 'danger' },
  unknown: { label: 'Okänd', variant: 'neutral' },
};

// Shared form styling (presentation only)
const inputCls =
  'w-full h-10 px-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

const SECTION_NAV: { href: string; label: string }[] = [
  { href: '#kund', label: 'Kund & fastighet' },
  { href: '#byggnadsdelar', label: 'Byggnadsdelar' },
  { href: '#kostnader', label: 'Kostnader' },
  { href: '#sammanstallning', label: 'Sammanställning' },
  { href: '#bokningar', label: 'Bokningar' },
  { href: '#fakturering', label: 'Fakturering' },
];

interface ParsedQuote extends Omit<QuoteRequest, 'calculation_data' | 'adjusted_data'> {
  calculation_data: CalculationData | null;
  adjusted_data: CalculationData | null;
  offer_views_count?: number;
  offer_last_viewed_at?: string | null;
  fortnox_ref?: { documentNumber: string; projectNumber: string; url?: string } | null;
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
  const [rotEnabled, setRotEnabled] = useState(false);
  const [rotMaxPerPerson, setRotMaxPerPerson] = useState(50000);
  const [savingRotSettings, setSavingRotSettings] = useState(false);

  // Per-offer cost overrides (empty string = use default shown as placeholder)
  const [costOverrides, setCostOverrides] = useState<Record<string, string>>({});
  const [costDefaults, setCostDefaults] = useState<Record<string, number>>({});
  const [showCostPanel, setShowCostPanel] = useState(false);

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
    installers?: Array<{
      installer_id: string;
      name: string;
      is_lead: boolean;
      status: string;
      responded_at?: string | null;
    }>;
  }>>([]);
  const [overridingInstaller, setOverridingInstaller] = useState<{bookingId: number; installerId: string} | null>(null);
  const [selectedInstallerIds, setSelectedInstallerIds] = useState<string[]>([]);
  const [leadInstallerId, setLeadInstallerId] = useState<string | undefined>();
  const [assigningBookingId, setAssigningBookingId] = useState<number | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [editBookingDate, setEditBookingDate] = useState('');
  const [editBookingTime, setEditBookingTime] = useState('');
  const [savingBookingEdit, setSavingBookingEdit] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);

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
    fetchCostDefaults();
  }, [id]);

  const fetchCostDefaults = async () => {
    try {
      const res = await fetch('/api/admin/cost-variables');
      if (res.ok) {
        const d = await res.json();
        const map: Record<string, number> = {};
        for (const v of d.variables || []) map[v.variable_key] = v.variable_value;
        setCostDefaults(map);
      }
    } catch (error) {
      console.error('Error fetching cost defaults:', error);
    }
  };

  // Build the numeric cost-override object to send (skips blank fields)
  const buildCostOverrides = (): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(costOverrides)) {
      if (val === '' || val === null || val === undefined) continue;
      const n = Number(val);
      if (!Number.isNaN(n)) out[k] = n;
    }
    return out;
  };

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
        // Set ROT settings
        const cd = data.adjusted_data || data.calculation_data;
        setRotEnabled(cd?.options?.applyRotDeduction ?? false);
        setRotMaxPerPerson(data.rot_max_per_person ?? 50000);
        // Initialize per-offer cost overrides from the saved record
        const savedOverrides = (data.cost_overrides || {}) as Record<string, number>;
        const overridesStr: Record<string, string> = {};
        for (const k of Object.keys(savedOverrides)) overridesStr[k] = String(savedOverrides[k]);
        setCostOverrides(overridesStr);
        if (Object.keys(overridesStr).length > 0) setShowCostPanel(true);
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
    setSelectedInstallerIds([]);
    setLeadInstallerId(undefined);
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
          installer_ids: selectedInstallerIds.length > 0 ? selectedInstallerIds : undefined,
          lead_id: leadInstallerId,
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

  const openAssignInstallers = (booking: { id: number; scheduled_date: string; installers?: Array<{ installer_id: string; is_lead: boolean }> }) => {
    setAssigningBookingId(booking.id);
    setBookingDate(booking.scheduled_date);
    setSelectedInstallerIds(booking.installers?.map(i => i.installer_id) || []);
    setLeadInstallerId(booking.installers?.find(i => i.is_lead)?.installer_id);
  };

  const handleSaveAssignment = async () => {
    if (!assigningBookingId) return;
    setSavingAssignment(true);
    try {
      const res = await fetch(`/api/admin/bookings/${assigningBookingId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installer_ids: selectedInstallerIds,
          lead_id: leadInstallerId,
        }),
      });
      if (res.ok) {
        setAssigningBookingId(null);
        fetchBookings();
      } else {
        const error = await res.json();
        alert(`Fel: ${error.error || 'Kunde inte tilldela'}`);
      }
    } catch (err) {
      console.error('Error assigning installers:', err);
    }
    setSavingAssignment(false);
  };

  const handleInstallerOverride = async (bookingId: number, installerId: string, action: 'accept' | 'decline') => {
    setOverridingInstaller({ bookingId, installerId });
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/installer-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installerId, action }),
      });
      if (res.ok) {
        fetchBookings();
      } else {
        const err = await res.json();
        alert(`Fel: ${err.error || 'Kunde inte uppdatera'}`);
      }
    } catch (err) {
      console.error('Override error:', err);
    }
    setOverridingInstaller(null);
  };

  const openEditBooking = (booking: { id: number; scheduled_date: string; scheduled_time: string }) => {
    setEditingBookingId(booking.id);
    setEditBookingDate(booking.scheduled_date);
    setEditBookingTime(booking.scheduled_time?.slice(0, 5) || '09:00');
  };

  const handleSaveBookingEdit = async () => {
    if (!editingBookingId || !editBookingDate) return;
    setSavingBookingEdit(true);
    try {
      const res = await fetch(`/api/admin/bookings/${editingBookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_date: editBookingDate,
          scheduled_time: editBookingTime,
        }),
      });
      if (res.ok) {
        setEditingBookingId(null);
        fetchBookings();
      } else {
        const error = await res.json();
        alert(`Fel: ${error.error || 'Kunde inte uppdatera bokning'}`);
      }
    } catch (err) {
      console.error('Error updating booking:', err);
      alert('Fel vid uppdatering av bokning');
    }
    setSavingBookingEdit(false);
  };

  const handleDeleteBooking = async (bookingId: number) => {
    if (!confirm('Är du säker på att du vill ta bort denna bokning? Detta kan inte ångras.')) return;
    setDeletingBookingId(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchBookings();
      } else {
        const error = await res.json();
        alert(`Fel: ${error.error || 'Kunde inte ta bort bokning'}`);
      }
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert('Fel vid borttagning av bokning');
    }
    setDeletingBookingId(null);
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
          options: { ...calcData.options, applyRotDeduction: rotEnabled },
          costOverrides: buildCostOverrides(),
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

  // Use server-side calculated totals (single source of truth)
  const getDisplayTotals = () => {
    if (!quote) return null;
    const calcData = quote.adjusted_data || quote.calculation_data;
    if (!calcData) return null;
    return calcData.totals;
  };

  // Alias for compatibility with save and render
  const recalculateTotals = getDisplayTotals;

  const handleSave = async () => {
    if (!quote) return;

    setSaving(true);
    try {
      // Always recalculate via server API first to ensure consistent totals
      const calcData = quote.adjusted_data || quote.calculation_data;
      if (calcData) {
        const recalcResponse = await fetch(`/api/admin/quotes/${id}/recalculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parts: editedRecommendations.map((r) => ({
              partId: r.partId,
              partName: r.partName,
              partType: r.partType,
              area: r.area,
              hasVaporBarrier: r.hasVaporBarrier,
              closedCellThickness: r.closedCellThickness,
              openCellThickness: r.openCellThickness,
            })),
            climate: calcData.climate,
            options: {
              ...calcData.options,
              applyRotDeduction: rotEnabled,
            },
            costOverrides: buildCostOverrides(),
          }),
        });

        if (recalcResponse.ok) {
          const recalcResult = await recalcResponse.json();
          const adjustedData = recalcResult.data;

          const response = await fetch(`/api/admin/quotes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              admin_notes: adminNotes,
              adjusted_data: adjustedData,
              adjusted_total_excl_vat: adjustedData.totals.totalExclVat,
              // incl-VAT is stored BEFORE ROT (consistent with the original
              // columns); ROT is stored separately and subtracted by consumers.
              adjusted_total_incl_vat: adjustedData.totals.totalInclVat,
              rot_deduction: adjustedData.totals.rotDeduction,
              cost_overrides: buildCostOverrides(),
            }),
          });

          if (response.ok) {
            await fetchQuote();
            setHasChanges(false);
          }
        } else {
          // Fallback: save with current data
          const response = await fetch(`/api/admin/quotes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              admin_notes: adminNotes,
            }),
          });
          if (response.ok) {
            await fetchQuote();
            setHasChanges(false);
          }
        }
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

  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const handleCreateFortnoxInvoice = async () => {
    if (!confirm('Skapa ett fakturautkast och projekt i Fortnox (Intelliray AB)? Fakturan skapas som utkast – du granskar och skickar den i Fortnox.')) {
      return;
    }
    setCreatingInvoice(true);
    try {
      const response = await fetch(`/api/admin/quotes/${id}/create-fortnox-invoice`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        await fetchQuote();
        alert(
          data.alreadyExists
            ? `Fakturautkast finns redan (faktura ${data.ref.documentNumber}, projekt ${data.ref.projectNumber}).`
            : `Fakturautkast skapat i Fortnox: faktura ${data.ref.documentNumber}, projekt ${data.ref.projectNumber}. Granska och skicka i Fortnox.`
        );
      } else {
        alert(`Fel: ${data.error || 'Kunde inte skapa faktura'}`);
      }
    } catch (error) {
      console.error('Create Fortnox invoice error:', error);
      alert('Ett fel uppstod vid skapande av faktura');
    }
    setCreatingInvoice(false);
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

  const handleSaveRotSettings = async () => {
    setSavingRotSettings(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apply_rot_deduction: rotEnabled,
          rot_max_per_person: rotMaxPerPerson,
        }),
      });
      if (res.ok) {
        // Trigger recalculation with new ROT settings
        await handleRecalculate();
        await fetchQuote();
      } else {
        const error = await res.json();
        alert(`Fel: ${error.error || 'Kunde inte spara ROT-inställningar'}`);
      }
    } catch (error) {
      console.error('Error saving ROT settings:', error);
    }
    setSavingRotSettings(false);
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
      <div className="p-6 md:p-8 max-w-7xl">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-80 mb-2" />
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <Card className="p-10 text-center flex flex-col items-center gap-3">
          <p className="text-red-600 font-medium">Offerten kunde inte hittas</p>
          <Button href="/admin/quotes" variant="secondary">Tillbaka till offertlistan</Button>
        </Card>
      </div>
    );
  }

  const calculatedTotals = recalculateTotals();
  const calcData = quote.adjusted_data || quote.calculation_data;

  // Per-offer cost-override fields. `derived` keys take their default placeholder
  // from the current calculated totals; the rest from the global cost variables.
  const COST_OVERRIDE_GROUPS: {
    group: string;
    fields: { key: string; label: string; unit: string; derived?: keyof NonNullable<typeof calculatedTotals> }[];
  }[] = [
    { group: 'Material – slutencell', fields: [
      { key: 'closed_material_cost', label: 'Materialkostnad', unit: 'kr/kg' },
      { key: 'closed_margin', label: 'Marginal', unit: '%' },
      { key: 'closed_density', label: 'Densitet', unit: 'kg/m³' },
      { key: 'closed_spray_time', label: 'Spruttid', unit: 'h/m³' },
    ] },
    { group: 'Material – öppencell', fields: [
      { key: 'open_material_cost', label: 'Materialkostnad', unit: 'kr/kg' },
      { key: 'open_margin', label: 'Marginal', unit: '%' },
      { key: 'open_density', label: 'Densitet', unit: 'kg/m³' },
      { key: 'open_spray_time', label: 'Spruttid', unit: 'h/m³' },
    ] },
    { group: 'Arbete', fields: [
      { key: 'personnel_cost_per_hour', label: 'Timkostnad', unit: 'kr/h' },
      { key: 'setup_hours', label: 'Riggtid', unit: 'h' },
      { key: 'spray_hours', label: 'Arbetstid totalt', unit: 'h', derived: 'sprayHours' },
    ] },
    { group: 'Resa & körning', fields: [
      { key: 'distance_km', label: 'Körsträcka (enkel)', unit: 'km', derived: 'distanceKm' },
      { key: 'travel_base_cost', label: 'Grundkostnad resa', unit: 'kr' },
      { key: 'travel_cost_per_km', label: 'Kostnad per km', unit: 'kr/km' },
      { key: 'average_travel_speed_kmh', label: 'Medelhastighet', unit: 'km/h' },
      { key: 'travel_hours', label: 'Restid', unit: 'h', derived: 'travelHours' },
      { key: 'travel_cost', label: 'Reskostnad totalt', unit: 'kr', derived: 'travelCost' },
    ] },
    { group: 'Utrustning', fields: [
      { key: 'generator_cost', label: 'Elverk (utan 3-fas)', unit: 'kr' },
    ] },
  ];
  const overrideCount = Object.values(costOverrides).filter((v) => v !== '' && v !== null && v !== undefined).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader
        backHref="/admin/quotes"
        backLabel="Offerter"
        title={`${quote.quote_number || `Förfrågan #${quote.id}`} · ${quote.customer_name}`}
        subtitle={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusBadge status={quote.status} />
            {quote.quote_number && <span>Förfrågan #{quote.id}</span>}
            {(quote.offer_views_count ?? 0) > 0 && (
              <span>
                Offert öppnad {quote.offer_views_count} {quote.offer_views_count === 1 ? 'gång' : 'gånger'}
                {quote.offer_last_viewed_at && <> · senast {formatDate(quote.offer_last_viewed_at)}</>}
              </span>
            )}
          </div>
        }
        actions={
          <>
            <Button variant="secondary" onClick={handleRecalculate} disabled={recalculating}>
              {recalculating ? 'Räknar om...' : 'Räkna om'}
            </Button>
            {hasChanges && (
              <Button variant="secondary" onClick={handleSave} disabled={saving}>
                {saving ? 'Sparar...' : 'Spara ändringar'}
              </Button>
            )}
            {quote.quote_number && quote.status !== 'sent' && quote.status !== 'accepted' && quote.status !== 'rejected' && (
              <Button onClick={handleSendOffer} disabled={sendingOffer}>
                {sendingOffer ? 'Skickar offert...' : 'Skicka offert'}
              </Button>
            )}
          </>
        }
      />

      {/* Section nav */}
      <nav aria-label="Sektioner" className="flex flex-wrap gap-x-5 gap-y-2 mb-6 pb-3 border-b border-gray-200">
        {SECTION_NAV.map((s) => (
          <a key={s.href} href={s.href} className="text-sm font-medium text-gray-700 hover:text-green-700">
            {s.label}
          </a>
        ))}
      </nav>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kund & fastighet (customer + ROT) */}
          <section id="kund" className="scroll-mt-6">
            <Card>
              <CardHeader title="Kund & fastighet" />
              <CardBody className="space-y-5">
                <dl className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600">Namn</dt>
                    <dd className="font-medium text-gray-900">{quote.customer_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">E-post</dt>
                    <dd className="font-medium text-gray-900 break-all">{quote.customer_email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Telefon</dt>
                    <dd className="font-medium text-gray-900">{quote.customer_phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Adress</dt>
                    <dd className="font-medium text-gray-900">{quote.customer_address}</dd>
                  </div>
                </dl>
                {quote.message && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Meddelande</p>
                    <p className="text-gray-900">{quote.message}</p>
                  </div>
                )}

                {/* ROT Settings & Information */}
                <div className="pt-5 border-t border-gray-200 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">ROT-avdrag</h3>
                      <p className="text-sm text-gray-600">Aktivera ROT-avdrag för denna offert</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rotEnabled}
                      onClick={() => setRotEnabled(!rotEnabled)}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
                        rotEnabled ? 'bg-green-700' : 'bg-gray-300'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          rotEnabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  {rotEnabled && (
                    <div>
                      <label className={labelCls}>Max ROT per person (kr)</label>
                      <input
                        type="number"
                        value={rotMaxPerPerson}
                        onChange={(e) => setRotMaxPerPerson(parseInt(e.target.value) || 0)}
                        min={0}
                        max={50000}
                        step={1000}
                        className={inputCls}
                      />
                      <p className="text-xs text-gray-600 mt-1">Lagstadgat max: 50 000 kr/person/år</p>
                    </div>
                  )}

                  {rotEnabled && calculatedTotals && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-700">30% av arbete inkl moms:</span>
                        <span className="font-medium text-gray-900">
                          {Math.round(calculatedTotals.laborCostTotal * 1.25 * 0.30).toLocaleString('sv-SE')} kr
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Max per person:</span>
                        <span className="font-medium text-gray-900">{rotMaxPerPerson.toLocaleString('sv-SE')} kr</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1">
                        <span className="font-medium text-gray-900">Beräknat ROT-avdrag:</span>
                        <span className="font-bold text-green-700">{calculatedTotals.rotDeduction.toLocaleString('sv-SE')} kr</span>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleSaveRotSettings}
                    disabled={savingRotSettings}
                  >
                    {savingRotSettings ? 'Sparar...' : 'Spara ROT-inställningar & räkna om'}
                  </Button>

                  {rotEnabled && (
                    <>
                      {/* ROT Customer Info - if submitted */}
                      {quote.rot_customer_info ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="success">Mottagen</Badge>
                            <span className="font-semibold text-gray-900">ROT-information</span>
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
                                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                                          <div className="flex justify-between items-center gap-2">
                                            <span className="font-medium text-gray-900">{customer.name}</span>
                                            {rotInfo.customers.length > 1 && (
                                              <Badge variant="info">{customer.share}%</Badge>
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
                                    <p className="text-xs text-gray-600">
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
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="warning">Väntar</Badge>
                            <span className="font-semibold text-gray-900">Väntar på ROT-information</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            Kunden behöver fylla i fastighetsbeteckning och personnummer för ROT-avdraget.
                          </p>
                        </div>
                      )}

                      {/* ROT Link Generation */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Länk för kunduppgifter</h4>
                        {rotLink ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                readOnly
                                value={rotLink}
                                className={cn(inputCls, 'flex-1 bg-gray-50 text-sm')}
                              />
                              <Button variant="secondary" onClick={copyRotLink}>
                                {rotLinkCopied ? 'Kopierad!' : 'Kopiera'}
                              </Button>
                            </div>
                            <Button className="w-full" onClick={handleSendRotLink} disabled={sendingRotLink}>
                              {sendingRotLink ? 'Skickar...' : 'Skicka länk via e-post'}
                            </Button>
                            <p className="text-xs text-gray-600">
                              Eller kopiera länken ovan och skicka manuellt till kunden.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700">
                              Generera en länk som kunden kan använda för att fylla i sina uppgifter för ROT-avdraget.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" onClick={handleGenerateRotLink} disabled={generatingRotLink}>
                                {generatingRotLink ? 'Genererar...' : 'Generera ROT-länk'}
                              </Button>
                              <Button onClick={handleSendRotLink} disabled={sendingRotLink}>
                                {sendingRotLink ? 'Skickar...' : 'Generera & skicka direkt'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          </section>

          {/* Building Parts Breakdown */}
          <section id="byggnadsdelar" className="scroll-mt-6">
            <Card>
              <CardHeader
                title="Byggnadsdelar & tjocklek"
                action={<span className="text-sm text-gray-600">{editedRecommendations.length} {editedRecommendations.length === 1 ? 'del' : 'delar'}</span>}
              />
              <CardBody className="space-y-5">
                {editedRecommendations.map((rec, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{rec.partName}</h3>
                        <span className="text-sm text-gray-600">{rec.partType}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Vapor Barrier Status */}
                        <Badge variant={rec.hasVaporBarrier ? 'info' : 'warning'}>
                          {rec.hasVaporBarrier ? 'Med ångspärr' : 'Utan ångspärr'}
                        </Badge>
                        {/* Config Type */}
                        {rec.configType && (
                          <Badge>
                            {rec.configType === 'closed_only' ? 'Endast slutencell' :
                             rec.configType === 'open_only' ? 'Endast öppencell' :
                             'Flash & Batt'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* U-Value Info */}
                    <div className="p-3 bg-gray-50 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Krav U-värde:</span>
                        <span className="ml-2 font-medium text-gray-900">{rec.requiredUValue?.toFixed(2) || '-'} W/m²K</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Uppnått U-värde:</span>
                        <span className={cn('ml-2 font-medium', rec.meetsUValue ? 'text-green-700' : 'text-red-600')}>
                          {rec.actualUValue?.toFixed(2) || '-'} W/m²K
                        </span>
                      </div>
                      <Badge variant={rec.meetsUValue ? 'success' : 'danger'}>
                        {rec.meetsUValue ? 'Uppfyller krav' : 'Uppfyller ej krav'}
                      </Badge>
                    </div>

                    {/* Condensation Analysis */}
                    {rec.condensationAnalysis && (
                      <div className="p-3 border border-gray-200 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Kondensanalys</h4>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Kondensrisk:</span>
                            <Badge variant={CONDENSATION_RISK_LABELS[rec.condensationAnalysis.risk]?.variant || 'neutral'}>
                              {CONDENSATION_RISK_LABELS[rec.condensationAnalysis.risk]?.label || rec.condensationAnalysis.risk}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Daggpunkt inomhus:</span>
                            <span className="font-medium text-gray-900">{rec.condensationAnalysis.dewPointInside?.toFixed(1)}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Temp vid gränssnitt:</span>
                            <span className="font-medium text-gray-900">{rec.condensationAnalysis.tempAtInterface?.toFixed(1)}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Säkerhetsmarginal:</span>
                            <span className={cn('font-medium', rec.condensationAnalysis.safetyMargin > 0 ? 'text-green-700' : 'text-red-600')}>
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
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Justera tjocklek (räkna om för nya kostnader och daggpunkt)</h4>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <label className={labelCls}>Slutencell tjocklek (mm)</label>
                          <input
                            type="number"
                            step="5"
                            min="0"
                            value={rec.closedCellThickness}
                            onChange={(e) => updateThickness(idx, 'closedCellThickness', parseInt(e.target.value) || 0)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Öppencell tjocklek (mm)</label>
                          <input
                            type="number"
                            step="5"
                            min="0"
                            value={rec.openCellThickness}
                            onChange={(e) => updateThickness(idx, 'openCellThickness', parseInt(e.target.value) || 0)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Total tjocklek</label>
                          <div className="h-10 px-3 flex items-center bg-gray-100 rounded-lg text-gray-900 font-medium">
                            {rec.totalThickness} mm
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Material Specification (calculated values) */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Materialspecifikation (exkl. moms)</h4>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 block">Slutencell skum</span>
                          <span className="font-bold text-green-700 text-lg">{rec.closedCellKg?.toFixed(1) || 0} kg</span>
                          <span className="text-gray-600 block">{rec.closedCellThickness} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-600 block">Öppencell skum</span>
                          <span className="font-bold text-green-700 text-lg">{rec.openCellKg?.toFixed(1) || 0} kg</span>
                          <span className="text-gray-600 block">{rec.openCellThickness} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-600 block">Slutencell kostnad</span>
                          <span className="font-medium text-gray-900">{Math.round(rec.closedCellCost || 0).toLocaleString('sv-SE')} kr</span>
                        </div>
                        <div>
                          <span className="text-gray-600 block">Öppencell kostnad</span>
                          <span className="font-medium text-gray-900">{Math.round(rec.openCellCost || 0).toLocaleString('sv-SE')} kr</span>
                        </div>
                      </div>
                    </div>

                    {/* Other Editable Fields */}
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      {/* Area */}
                      <div>
                        <label className={labelCls}>Yta (m²)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={rec.area}
                          onChange={(e) => updateRecommendation(idx, 'area', parseFloat(e.target.value) || 0)}
                          className={inputCls}
                        />
                      </div>

                      {/* Material Cost */}
                      <div>
                        <label className={labelCls}>Materialkostnad exkl. moms (kr)</label>
                        <input
                          type="number"
                          value={Math.round(rec.materialCost)}
                          onChange={(e) => updateRecommendation(idx, 'materialCost', parseInt(e.target.value) || 0)}
                          className={inputCls}
                        />
                      </div>

                      {/* Labor Cost */}
                      <div>
                        <label className={labelCls}>Arbetskostnad exkl. moms (kr)</label>
                        <input
                          type="number"
                          value={Math.round(rec.laborCost)}
                          onChange={(e) => updateRecommendation(idx, 'laborCost', parseInt(e.target.value) || 0)}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    {/* Part Total */}
                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-sm text-gray-600">Deltotal exkl. moms ({rec.laborHours?.toFixed(1) || 0} arbetstimmar):</span>
                      <span className="font-semibold text-gray-900">{Math.round(rec.totalCost || 0).toLocaleString('sv-SE')} kr</span>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </section>

          {/* Per-offer cost overrides */}
          <section id="kostnader" className="scroll-mt-6">
            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    Justera kostnader för denna offert
                    {overrideCount > 0 && <Badge variant="success">{overrideCount} ändrade</Badge>}
                  </span>
                }
                action={
                  <button
                    type="button"
                    onClick={() => setShowCostPanel((s) => !s)}
                    aria-expanded={showCostPanel}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-green-700"
                  >
                    {showCostPanel ? 'Dölj' : 'Visa'}
                    <svg className={cn('w-4 h-4 transition-transform', showCostPanel && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                }
              />

              {showCostPanel && (
                <CardBody className="space-y-5">
                  <p className="text-sm text-gray-700">
                    Lämna fältet tomt för att använda standardvärdet (visas som grå text). Ett ifyllt värde gäller endast denna offert. Klicka <strong>Räkna om</strong> för att uppdatera totalen.
                  </p>
                  {COST_OVERRIDE_GROUPS.map((grp) => (
                    <div key={grp.group}>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">{grp.group}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {grp.fields.map((f) => {
                          const defaultVal = f.derived
                            ? (calculatedTotals as Record<string, number> | null)?.[f.derived as string]
                            : costDefaults[f.key];
                          const isOverridden = costOverrides[f.key] !== undefined && costOverrides[f.key] !== '';
                          return (
                            <div key={f.key}>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                {f.label} <span className="text-gray-600">({f.unit})</span>
                              </label>
                              <input
                                type="number"
                                value={costOverrides[f.key] ?? ''}
                                placeholder={defaultVal !== undefined && defaultVal !== null ? String(defaultVal) : '–'}
                                onChange={(e) => {
                                  setCostOverrides((o) => ({ ...o, [f.key]: e.target.value }));
                                  setHasChanges(true);
                                }}
                                className={cn(inputCls, 'text-sm', isOverridden && 'border-green-700 shadow-[inset_3px_0_0_#1e6b3f]')}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {overrideCount > 0 && (
                    <button
                      type="button"
                      onClick={() => { setCostOverrides({}); setHasChanges(true); }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Återställ alla till standard
                    </button>
                  )}
                </CardBody>
              )}
            </Card>
          </section>

          {/* Admin Notes */}
          <Card>
            <CardHeader title="Interna anteckningar" />
            <CardBody>
              <textarea
                value={adminNotes}
                onChange={(e) => {
                  setAdminNotes(e.target.value);
                  setHasChanges(true);
                }}
                rows={4}
                placeholder="Anteckningar för intern användning..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Status & actions */}
          <Card>
            <CardHeader
              title="Status & åtgärder"
              action={
                <button
                  type="button"
                  onClick={() => {
                    fetchStatusHistory();
                    setShowStatusHistory(!showStatusHistory);
                  }}
                  className="text-sm font-medium text-gray-700 hover:text-green-700"
                >
                  Historik
                </button>
              }
            />
            <CardBody className="space-y-3">
              <div>
                <label className={labelCls}>Status</label>
                <select
                  value={quote.status}
                  onChange={(e) => handleChangeStatus(e.target.value)}
                  disabled={changingStatus}
                  className={cn(inputCls, 'disabled:bg-gray-100')}
                >
                  <option value="pending">Ny förfrågan</option>
                  <option value="reviewed">Under granskning</option>
                  <option value="sent">Offert skickad</option>
                  <option value="accepted">Accepterad</option>
                  <option value="rejected">Avvisad</option>
                  <option value="expired">Utgången</option>
                </select>
              </div>

              {quote.status === 'pending' && (
                <Button variant="secondary" className="w-full" onClick={handleMarkReviewed}>
                  Markera som granskad
                </Button>
              )}

              {(quote.status === 'reviewed' || quote.status === 'pending') && !quote.quote_number && (
                <Button className="w-full" onClick={handleGenerateQuote}>
                  Skapa offert
                </Button>
              )}

              {quote.quote_number && (
                <Button variant="secondary" className="w-full" onClick={handleGeneratePDF}>
                  Ladda ned PDF
                </Button>
              )}

              <p className="text-xs text-gray-600">
                Räkna om uppdaterar kostnader, materialåtgång och daggpunktsanalys baserat på aktuella priser och tjocklekar.
              </p>
            </CardBody>
          </Card>

          {/* Cost Summary */}
          <section id="sammanstallning" className="scroll-mt-6">
            <Card>
              <CardHeader title="Kostnadssammanställning" />
              {calculatedTotals && (
                <CardBody className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total yta</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.totalArea.toFixed(1)} m²</span>
                  </div>

                  {/* Costs excluding VAT */}
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 pt-3">Exkl. moms</p>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Material</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.materialCostTotal.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Arbete</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.laborCostTotal.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transport</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.travelCost.toLocaleString('sv-SE')} kr</span>
                  </div>
                  {calculatedTotals.generatorCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Generator</span>
                      <span className="font-medium text-gray-900">{calculatedTotals.generatorCost.toLocaleString('sv-SE')} kr</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Summa exkl. moms</span>
                    <span className="font-semibold text-gray-900">{calculatedTotals.totalExclVat.toLocaleString('sv-SE')} kr</span>
                  </div>

                  {/* VAT Calculation */}
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-600">Moms (25%)</span>
                    <span className="font-medium text-gray-900">+ {calculatedTotals.vat.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Totalt inkl. moms</span>
                    <span className="font-medium text-gray-900">{calculatedTotals.totalInclVat.toLocaleString('sv-SE')} kr</span>
                  </div>
                  {calculatedTotals.rotDeduction > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ROT-avdrag</span>
                      <span className="font-medium text-green-700">- {calculatedTotals.rotDeduction.toLocaleString('sv-SE')} kr</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-3 mt-1 border-t-2 border-green-700">
                    <span className="text-base font-bold text-gray-900">Att betala</span>
                    <span className="text-2xl font-bold text-green-700">
                      {calculatedTotals.finalTotal.toLocaleString('sv-SE')} kr
                    </span>
                  </div>
                </CardBody>
              )}
            </Card>
          </section>

          {/* Bookings & installers */}
          <section id="bokningar" className="scroll-mt-6">
            <Card>
              <CardHeader title="Bokningar & installatörer" />
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openBookingModal('visit')}>
                    Boka hembesök
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openBookingModal('installation')}>
                    Boka installation
                  </Button>
                </div>

                {/* Existing Bookings for this quote */}
                {quoteBookings.length === 0 ? (
                  <p className="text-sm text-gray-600">Inga bokningar ännu.</p>
                ) : (
                  <div className="space-y-3">
                    {quoteBookings.map(booking => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-3 text-sm space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                              </span>
                              <StatusBadge status={booking.status} />
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {new Date(booking.scheduled_date).toLocaleDateString('sv-SE')} {booking.scheduled_time?.slice(0, 5)}
                            </div>
                          </div>
                          {booking.status !== 'completed' &&
                            booking.status !== 'cancelled' && (
                            <Button size="sm" onClick={() => setConfirmBookingId(booking.id)}>
                              Bekräfta
                            </Button>
                          )}
                        </div>
                        {/* Assigned Installers */}
                        {booking.installers && booking.installers.length > 0 && (() => {
                          const active = booking.installers!.filter(i => i.status !== 'declined');
                          const hasPending = active.some(i => i.status === 'pending');
                          const hasDeclined = booking.installers!.some(i => i.status === 'declined');
                          const aggStatus = (booking.status === 'confirmed' || (active.length > 0 && !hasPending))
                            ? 'accepted'
                            : (hasDeclined && active.length === 0)
                            ? 'rejected'
                            : 'pending';
                          return (
                            <div className="space-y-1.5">
                              {/* Aggregate badge */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Installatör:</span>
                                <Badge variant={aggStatus === 'accepted' ? 'success' : aggStatus === 'rejected' ? 'danger' : 'warning'}>
                                  {aggStatus === 'accepted' ? 'Alla klara' : aggStatus === 'rejected' ? 'Nekad' : `Väntar ${active.filter(i=>i.status==='pending').length}/${active.length}`}
                                </Badge>
                              </div>
                              {/* Per-installer rows */}
                              {booking.installers!.map((inst) => (
                                <div key={inst.installer_id} className="flex items-center gap-1.5 flex-wrap">
                                  <Badge variant={inst.status === 'accepted' ? 'success' : inst.status === 'declined' ? 'danger' : 'warning'}>
                                    {inst.name || 'Installatör'}{inst.is_lead && ' *'}
                                  </Badge>
                                  {inst.responded_at && (
                                    <span className="text-xs text-gray-600">
                                      {new Date(inst.responded_at).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                  {/* Admin override buttons */}
                                  {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                                    <span className="flex gap-2">
                                      {inst.status !== 'accepted' && (
                                        <button
                                          type="button"
                                          onClick={() => handleInstallerOverride(booking.id, inst.installer_id, 'accept')}
                                          disabled={overridingInstaller?.installerId === inst.installer_id}
                                          className="text-xs font-medium text-green-700 hover:text-green-800 underline disabled:opacity-50"
                                        >
                                          Force-ok
                                        </button>
                                      )}
                                      {inst.status !== 'declined' && (
                                        <button
                                          type="button"
                                          onClick={() => handleInstallerOverride(booking.id, inst.installer_id, 'decline')}
                                          disabled={overridingInstaller?.installerId === inst.installer_id}
                                          className="text-xs font-medium text-red-600 hover:text-red-700 underline disabled:opacity-50"
                                        >
                                          Force-neka
                                        </button>
                                      )}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        {/* Action buttons */}
                        {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                          <div className="flex flex-wrap gap-3 pt-1 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => openAssignInstallers(booking)}
                              className="text-xs font-medium text-green-700 hover:text-green-800 underline"
                            >
                              {booking.installers && booking.installers.length > 0 ? 'Ändra installatörer' : 'Tilldela installatörer'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditBooking(booking)}
                              className="text-xs font-medium text-gray-700 hover:text-gray-900 underline"
                            >
                              Ändra datum
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(booking.id)}
                              disabled={deletingBookingId === booking.id}
                              className="text-xs font-medium text-red-600 hover:text-red-700 underline disabled:opacity-50"
                            >
                              {deletingBookingId === booking.id ? 'Tar bort...' : 'Ta bort'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </section>

          {/* Fortnox invoice */}
          <section id="fakturering" className="scroll-mt-6">
            <Card>
              <CardHeader title="Fakturering (Fortnox)" />
              <CardBody>
                {quote.fortnox_ref?.documentNumber ? (
                  <div className="text-sm text-gray-700 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Fakturautkast skapat</Badge>
                    </div>
                    <p>
                      Faktura <span className="font-medium text-gray-900">#{quote.fortnox_ref.documentNumber}</span>
                      {quote.fortnox_ref.projectNumber && (
                        <> · projekt <span className="font-medium text-gray-900">{quote.fortnox_ref.projectNumber}</span></>
                      )}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      href={quote.fortnox_ref.url || 'https://apps.fortnox.se'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Öppna i Fortnox
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Skapar ett fakturautkast och projekt i Fortnox (Intelliray AB). Du granskar och skickar fakturan i Fortnox.
                    </p>
                    <Button className="w-full" onClick={handleCreateFortnoxInvoice} disabled={creatingInvoice}>
                      {creatingInvoice ? 'Skapar i Fortnox...' : 'Skapa fakturautkast i Fortnox'}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </section>

          {/* Offer Status */}
          {quote.offer_token && (
            <Card>
              <CardHeader title="Offertstatus" />
              <CardBody className="space-y-4">
                {/* Status indicator */}
                <div className={cn(
                  'p-3 rounded-lg border',
                  quote.status === 'accepted'
                    ? 'bg-green-50 border-green-200'
                    : quote.status === 'rejected'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                )}>
                  <div className="flex items-center gap-2">
                    {quote.status === 'accepted' && (
                      <>
                        <Badge variant="success">Godkänd</Badge>
                        <span className="font-semibold text-gray-900">Offert godkänd</span>
                      </>
                    )}
                    {quote.status === 'rejected' && (
                      <>
                        <Badge variant="danger">Avböjd</Badge>
                        <span className="font-semibold text-gray-900">Offert avböjd</span>
                      </>
                    )}
                    {quote.status === 'sent' && (
                      <>
                        <Badge variant="info">Skickad</Badge>
                        <span className="font-semibold text-gray-900">Väntar på svar</span>
                      </>
                    )}
                  </div>
                  {quote.signed_name && (
                    <p className="text-sm text-gray-700 mt-2">
                      Signerad av: <span className="font-medium text-gray-900">{quote.signed_name}</span>
                    </p>
                  )}
                  {quote.accepted_at && (
                    <p className="text-xs text-gray-600 mt-1">
                      Godkänd: {formatDate(quote.accepted_at)}
                    </p>
                  )}
                  {quote.rejected_at && (
                    <p className="text-xs text-gray-600 mt-1">
                      Avböjd: {formatDate(quote.rejected_at)}
                    </p>
                  )}
                  {quote.signed_ip && (
                    <p className="text-xs text-gray-600">
                      IP-adress: {quote.signed_ip}
                    </p>
                  )}
                </div>

                {/* Offer link */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Offertlänk för kund:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/offert/${quote.offer_token}`}
                      className={cn(inputCls, 'flex-1 bg-gray-50 text-sm')}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/offert/${quote.offer_token}`);
                        alert('Länk kopierad!');
                      }}
                    >
                      Kopiera
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Material Totals + Hours Breakdown */}
          {calcData && (
            <Card>
              <CardHeader title="Material & tidsåtgång" />
              <CardBody className="space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Materialåtgång totalt</p>
                <div className="flex justify-between">
                  <span className="text-gray-600">Slutencell skum</span>
                  <span className="font-bold text-green-700">{calcData.totals.totalClosedCellKg?.toFixed(1) || 0} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Öppencell skum</span>
                  <span className="font-bold text-green-700">{calcData.totals.totalOpenCellKg?.toFixed(1) || 0} kg</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Totalt skum</span>
                  <span className="text-base font-bold text-green-700">
                    {((calcData.totals.totalClosedCellKg || 0) + (calcData.totals.totalOpenCellKg || 0)).toFixed(1)} kg
                  </span>
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 pt-4">Tidsåtgång</p>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sprutning</span>
                  <span className="font-medium text-gray-900">{calcData.totals.sprayHours?.toFixed(1) || 0} tim</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Uppsättning</span>
                  <span className="font-medium text-gray-900">{calcData.totals.setupHours?.toFixed(1) || 0} tim</span>
                </div>
                {(calcData.totals.switchingHours ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Maskinbyte</span>
                    <span className="font-medium text-gray-900">{calcData.totals.switchingHours?.toFixed(1)} tim</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Restid</span>
                  <span className="font-medium text-gray-900">{calcData.totals.travelHours?.toFixed(1) || 0} tim</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Totalt</span>
                  <span className="text-base font-bold text-green-700">{calcData.totals.totalHours?.toFixed(1) || 0} tim</span>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Project Logistics - Distance & Generator */}
          {calcData && (
            <Card>
              <CardHeader title="Projektlogistik" />
              <CardBody className="space-y-3">
                {/* Distance */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">Avstånd till kund</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {calcData.totals.distanceKm || calcData.options.distanceKm || '?'} km
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Enkel väg från {quote.customer_address}</p>
                </div>

                {/* Generator Requirement */}
                <div className={cn('p-3 rounded-lg', calcData.options.hasThreePhase ? 'bg-green-50' : 'bg-amber-50')}>
                  <p className="text-sm font-semibold text-gray-900">Elförsörjning</p>
                  {calcData.options.hasThreePhase ? (
                    <>
                      <p className="text-lg font-bold text-green-700">3-fas tillgänglig</p>
                      <p className="text-xs text-gray-600">Ingen generator behövs</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-amber-800">Generator krävs</p>
                      <p className="text-xs text-gray-600">Kunden har ej 3-fas</p>
                      {calcData.totals.generatorCost > 0 && (
                        <p className="text-sm font-medium text-amber-800 mt-1">
                          Kostnad: {calcData.totals.generatorCost.toLocaleString('sv-SE')} kr
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Climate Settings */}
          {calcData && (
            <Card>
              <CardHeader title="Klimatinställningar" />
              <CardBody className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Klimatzon</span>
                  <span className="text-gray-900">{calcData.climate.zone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inomhustemp</span>
                  <span className="text-gray-900">{calcData.climate.indoorTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Luftfuktighet</span>
                  <span className="text-gray-900">{calcData.climate.indoorRH}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Utomhustemp (DUT)</span>
                  <span className="text-gray-900">{calcData.climate.outdoorTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ROT-avdrag</span>
                  <span className={cn('font-medium', rotEnabled ? 'text-green-700' : 'text-gray-900')}>
                    {rotEnabled ? 'Ja' : 'Nej'}
                  </span>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardHeader title="Tidsstämplar" />
            <CardBody className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Skapad</span>
                <p className="text-gray-900">{formatDate(quote.created_at)}</p>
              </div>
              <div>
                <span className="text-gray-600">Uppdaterad</span>
                <p className="text-gray-900">{formatDate(quote.updated_at)}</p>
              </div>
              {quote.email_sent_at && (
                <div>
                  <span className="text-gray-600">E-post skickad</span>
                  <p className="text-gray-900">{formatDate(quote.email_sent_at)}</p>
                </div>
              )}
              <div>
                <span className="text-gray-600">Offert öppnad</span>
                {quote.offer_views_count && quote.offer_views_count > 0 ? (
                  <p className="text-gray-900">
                    {quote.offer_views_count} {quote.offer_views_count === 1 ? 'gång' : 'gånger'}
                    {quote.offer_last_viewed_at && (
                      <span className="text-gray-600"> · senast {formatDate(quote.offer_last_viewed_at)}</span>
                    )}
                  </p>
                ) : (
                  <p className="text-gray-700">Inte öppnad än</p>
                )}
              </div>
              {quote.quote_valid_until && (
                <div>
                  <span className="text-gray-600">Offert giltig till</span>
                  <p className="text-gray-900">{formatDate(quote.quote_valid_until)}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Delete Quote */}
          <Card className="border-red-200">
            <CardHeader title={<span className="text-red-700">Farlig zon</span>} />
            <CardBody className="space-y-3">
              <p className="text-sm text-gray-700">
                Att ta bort en offertförfrågan är permanent och kan inte ångras.
              </p>
              <Button variant="danger" className="w-full" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Tar bort...' : 'Ta bort offertförfrågan'}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                {bookingType === 'visit' ? 'Boka hembesök' : 'Boka installation'}
              </h2>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="text-gray-600 hover:text-gray-900"
                aria-label="Stäng"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Customer Info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-900">{quote?.customer_name}</div>
                <div className="text-sm text-gray-600">{quote?.customer_address}</div>
              </div>

              {/* Date */}
              <div>
                <label className={labelCls}>
                  Datum
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Time */}
              <div>
                <label className={labelCls}>
                  Tid
                </label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className={inputCls}
                >
                  {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              {/* Installer Selection (for installations) */}
              {bookingType === 'installation' && bookingDate && (
                <div>
                  <label className={labelCls}>
                    Installatörer
                  </label>
                  <InstallerPicker
                    date={bookingDate}
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
                <label className={labelCls}>
                  Anteckningar
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  rows={3}
                  placeholder="Valfria anteckningar..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <Button variant="ghost" onClick={() => setShowBookingModal(false)}>
                Avbryt
              </Button>
              <Button onClick={handleCreateBooking} disabled={savingBooking}>
                {savingBooking ? 'Skapar...' : 'Skapa bokning'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status History Modal */}
      {showStatusHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900">Statushistorik</h2>
              <button
                type="button"
                onClick={() => setShowStatusHistory(false)}
                className="text-gray-600 hover:text-gray-900"
                aria-label="Stäng"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {statusHistory.length === 0 ? (
                <p className="text-gray-600 text-center py-4">Ingen statushistorik finns.</p>
              ) : (
                <div className="space-y-3">
                  {statusHistory.slice().reverse().map((entry, index) => (
                    <div key={index} className="border-l-4 border-green-700 pl-4 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <StatusBadge status={entry.from_status} />
                        <span className="text-gray-600">→</span>
                        <StatusBadge status={entry.to_status} />
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
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
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">Signaturinformation</h3>
                  <div className="text-sm text-gray-700 space-y-1">
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

            <div className="flex justify-end px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <Button variant="secondary" onClick={() => setShowStatusHistory(false)}>
                Stäng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Installers Modal */}
      {assigningBookingId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Tilldela installatörer</h2>
              <button
                type="button"
                onClick={() => setAssigningBookingId(null)}
                className="text-gray-600 hover:text-gray-900"
                aria-label="Stäng"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <InstallerPicker
                date={bookingDate}
                selectedIds={selectedInstallerIds}
                leadId={leadInstallerId}
                onChange={(ids, lead) => {
                  setSelectedInstallerIds(ids);
                  setLeadInstallerId(lead);
                }}
              />
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <Button variant="ghost" onClick={() => setAssigningBookingId(null)}>
                Avbryt
              </Button>
              <Button onClick={handleSaveAssignment} disabled={savingAssignment || selectedInstallerIds.length === 0}>
                {savingAssignment ? 'Sparar...' : 'Spara tilldelning'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Date Modal */}
      {editingBookingId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Ändra datum</h2>
              <button
                type="button"
                onClick={() => setEditingBookingId(null)}
                className="text-gray-600 hover:text-gray-900"
                aria-label="Stäng"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Datum</label>
                <input
                  type="date"
                  value={editBookingDate}
                  onChange={(e) => setEditBookingDate(e.target.value)}
                  className={cn(inputCls, 'text-sm')}
                />
              </div>
              <div>
                <label className={labelCls}>Tid</label>
                <input
                  type="time"
                  value={editBookingTime}
                  onChange={(e) => setEditBookingTime(e.target.value)}
                  className={cn(inputCls, 'text-sm')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <Button variant="ghost" onClick={() => setEditingBookingId(null)}>
                Avbryt
              </Button>
              <Button onClick={handleSaveBookingEdit} disabled={savingBookingEdit || !editBookingDate}>
                {savingBookingEdit ? 'Sparar...' : 'Spara'}
              </Button>
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
