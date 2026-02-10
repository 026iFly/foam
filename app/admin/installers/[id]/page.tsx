'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Installer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  installer_type: 'employee' | 'subcontractor' | null;
  hourly_rate: number | null;
  hardplast_expiry: string | null;
  priority_order: number;
  is_active: boolean;
}

interface BlockedDate {
  id: number;
  blocked_date: string;
  slot: 'full' | 'morning' | 'afternoon';
  reason: string | null;
}

interface Assignment {
  id: number;
  booking_id: number;
  is_lead: boolean;
  status: string;
  booking: {
    id: number;
    scheduled_date: string;
    scheduled_time: string;
    status: string;
    slot_type: string;
    quote_requests: {
      customer_name: string;
      customer_address: string;
    } | null;
  };
}

interface Contract {
  id: number;
  contract_type: string;
  status: string;
  valid_from: string | null;
  valid_to: string | null;
  notes: string | null;
  draft_pdf_path: string | null;
  signed_pdf_path: string | null;
  created_at: string;
}

export default function InstallerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const installerId = params.id as string;

  const [installer, setInstaller] = useState<Installer | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [formType, setFormType] = useState<string>('');
  const [formRate, setFormRate] = useState('');
  const [formHardplast, setFormHardplast] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Block date form
  const [blockDate, setBlockDate] = useState('');
  const [blockSlot, setBlockSlot] = useState('full');
  const [blockReason, setBlockReason] = useState('');

  // Contract form
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractForm, setContractForm] = useState({
    contract_type: 'employee',
    valid_from: '',
    valid_to: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/installers/${installerId}`);
      const data = await res.json();
      if (data.installer) {
        setInstaller(data.installer);
        setFormType(data.installer.installer_type || '');
        setFormRate(data.installer.hourly_rate?.toString() || '');
        setFormHardplast(data.installer.hardplast_expiry || '');
        setFormActive(data.installer.is_active !== false);
      }
      setBlockedDates(data.blocked_dates || []);
      setAssignments(data.assignments || []);
      setContracts(data.contracts || []);
    } catch (err) {
      console.error('Error fetching installer:', err);
    } finally {
      setLoading(false);
    }
  }, [installerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/installers/${installerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installer_type: formType || null,
          hourly_rate: formRate ? parseFloat(formRate) : null,
          hardplast_expiry: formHardplast || null,
          is_active: formActive,
        }),
      });
      fetchData();
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const addBlockedDate = async () => {
    if (!blockDate) return;
    try {
      await fetch(`/api/admin/installers/${installerId}/blocked-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: blockDate,
          slot: blockSlot,
          reason: blockReason || null,
        }),
      });
      setBlockDate('');
      setBlockReason('');
      fetchData();
    } catch (err) {
      console.error('Error adding blocked date:', err);
    }
  };

  const removeBlockedDate = async (dateId: number) => {
    try {
      await fetch(
        `/api/admin/installers/${installerId}/blocked-dates?date_id=${dateId}`,
        { method: 'DELETE' }
      );
      fetchData();
    } catch (err) {
      console.error('Error removing blocked date:', err);
    }
  };

  const createContract = async () => {
    try {
      await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installer_id: installerId,
          contract_type: contractForm.contract_type,
          valid_from: contractForm.valid_from || null,
          valid_to: contractForm.valid_to || null,
          notes: contractForm.notes || null,
        }),
      });
      setShowContractForm(false);
      setContractForm({ contract_type: 'employee', valid_from: '', valid_to: '', notes: '' });
      fetchData();
    } catch (err) {
      console.error('Error creating contract:', err);
    }
  };

  const uploadSignedContract = async (contractId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/upload-signed`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(`Fel: ${data.error || 'Kunde inte ladda upp'}`);
      }
    } catch (err) {
      console.error('Error uploading signed contract:', err);
    }
  };

  const formatSlot = (slot: string) => {
    if (slot === 'morning') return 'Förmiddag';
    if (slot === 'afternoon') return 'Eftermiddag';
    return 'Heldag';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!installer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">Installatören hittades inte.</p>
        <Link href="/admin/installers" className="text-blue-600 hover:underline mt-2 inline-block">
          Tillbaka
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/installers" className="text-gray-600 hover:text-gray-800">
          &larr; Tillbaka
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {installer.first_name} {installer.last_name}
        </h1>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profil</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
            <p className="text-sm text-gray-900">{installer.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <p className="text-sm text-gray-900">{installer.phone || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Välj typ...</option>
              <option value="employee">Anställd</option>
              <option value="subcontractor">Underentreprenad</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timpris (kr/h) {formType === 'employee' ? '(lön före skatt)' : '(exkl moms)'}
            </label>
            <input
              type="number"
              value={formRate}
              onChange={(e) => setFormRate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hardplast-certifikat utgår
            </label>
            <input
              type="date"
              value={formHardplast}
              onChange={(e) => setFormHardplast(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
            />
            {formHardplast && new Date(formHardplast) < new Date() && (
              <p className="text-xs text-red-600 mt-1">Certifikatet har utgått - installatören blockeras automatiskt.</p>
            )}
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Aktiv</span>
            </label>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Sparar...' : 'Spara ändringar'}
          </button>
        </div>
      </div>

      {/* Blocked Dates Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Blockerade datum</h2>

        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
          />
          <select
            value={blockSlot}
            onChange={(e) => setBlockSlot(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
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
            className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
          />
          <button
            onClick={addBlockedDate}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          >
            Blockera
          </button>
        </div>

        {blockedDates.length > 0 ? (
          <div className="space-y-2">
            {blockedDates.map((bd) => (
              <div key={bd.id} className="flex items-center justify-between bg-red-50 rounded px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">
                    {new Date(bd.blocked_date).toLocaleDateString('sv-SE', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </span>
                  <span className="text-gray-600 ml-2">{formatSlot(bd.slot)}</span>
                  {bd.reason && <span className="text-gray-600 ml-2">- {bd.reason}</span>}
                </div>
                <button
                  onClick={() => removeBlockedDate(bd.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Inga blockerade datum.</p>
        )}
      </div>

      {/* Assignments Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tilldelade bokningar</h2>
        {assignments.length > 0 ? (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">
                    {new Date(a.booking.scheduled_date).toLocaleDateString('sv-SE')}
                  </span>
                  <span className="ml-2">{a.booking.quote_requests?.customer_name || '-'}</span>
                  <span className="ml-2 text-gray-600">{a.booking.quote_requests?.customer_address || ''}</span>
                  {a.is_lead && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">Ansvarig</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  a.status === 'accepted' ? 'bg-green-100 text-green-800'
                    : a.status === 'declined' ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {a.status === 'accepted' ? 'Accepterad' : a.status === 'declined' ? 'Avböjd' : 'Väntar'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Inga tilldelade bokningar.</p>
        )}
      </div>

      {/* Contracts Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Avtal</h2>
          <button
            onClick={() => setShowContractForm(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
          >
            Skapa avtal
          </button>
        </div>

        {/* Create Contract Form */}
        {showContractForm && (
          <div className="border border-gray-200 rounded p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avtalstyp</label>
                <select
                  value={contractForm.contract_type}
                  onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                >
                  <option value="employee">Anställningsavtal</option>
                  <option value="subcontractor">Underentreprenadavtal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giltigt från</label>
                <input
                  type="date"
                  value={contractForm.valid_from}
                  onChange={(e) => setContractForm({ ...contractForm, valid_from: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giltigt till (valfritt)</label>
                <input
                  type="date"
                  value={contractForm.valid_to}
                  onChange={(e) => setContractForm({ ...contractForm, valid_to: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anteckningar</label>
                <input
                  type="text"
                  value={contractForm.notes}
                  onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                  placeholder="Valfria anteckningar"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowContractForm(false)}
                className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
              >
                Avbryt
              </button>
              <button
                onClick={createContract}
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
              >
                Skapa
              </button>
            </div>
          </div>
        )}

        {contracts.length > 0 ? (
          <div className="space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">
                    <span className="font-medium">
                      {c.contract_type === 'employee' ? 'Anställningsavtal' : 'Underentreprenadavtal'}
                    </span>
                    {c.valid_from && (
                      <span className="ml-2 text-gray-600">
                        {new Date(c.valid_from).toLocaleDateString('sv-SE')}
                        {c.valid_to && ` - ${new Date(c.valid_to).toLocaleDateString('sv-SE')}`}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.status === 'signed' ? 'bg-green-100 text-green-800'
                      : c.status === 'sent' ? 'bg-blue-100 text-blue-800'
                      : c.status === 'expired' ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {c.status === 'signed' ? 'Signerat' : c.status === 'sent' ? 'Skickat' : c.status === 'expired' ? 'Utgånget' : 'Utkast'}
                  </span>
                </div>
                {c.notes && <p className="text-sm text-gray-600 mb-2">{c.notes}</p>}
                <div className="flex gap-2 flex-wrap">
                  {c.draft_pdf_path && (
                    <a
                      href={`/api/admin/contracts/${c.id}/download?type=draft`}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      Ladda ner utkast
                    </a>
                  )}
                  {c.signed_pdf_path && (
                    <a
                      href={`/api/admin/contracts/${c.id}/download?type=signed`}
                      className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                    >
                      Ladda ner signerat
                    </a>
                  )}
                  {c.status !== 'signed' && (
                    <label className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100 cursor-pointer">
                      Ladda upp signerat PDF
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadSignedContract(c.id, file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Inga avtal.</p>
        )}
      </div>
    </div>
  );
}
