'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader, Card, CardHeader, CardBody, Badge, StatusBadge, Button, Skeleton, EmptyState } from '@/app/components/ui';
import type { BadgeVariant } from '@/app/components/ui';

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

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
// Plain anchors for API downloads (must be a full navigation, not a Next.js client route).
const linkBtnCls =
  'inline-flex items-center h-9 px-3 rounded-lg text-sm font-semibold border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer';

const CONTRACT_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  signed: { label: 'Signerat', variant: 'success' },
  sent: { label: 'Skickat', variant: 'info' },
  expired: { label: 'Utgånget', variant: 'danger' },
};

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
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="max-w-4xl flex flex-col gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!installer) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <div className="max-w-4xl">
          <PageHeader title="Installatören hittades inte" backHref="/admin/installers" />
          <EmptyState
            title="Installatören hittades inte"
            action={<Button href="/admin/installers" variant="secondary">Tillbaka</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <div className="max-w-4xl flex flex-col gap-6">
        <PageHeader
          title={`${installer.first_name ?? ''} ${installer.last_name ?? ''}`.trim() || installer.email}
          subtitle={installer.email}
          backHref="/admin/installers"
          backLabel="Tillbaka till installatörer"
        />

        {/* Profile Section */}
        <Card>
          <CardHeader title="Profil" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>E-post</label>
                <p className="text-sm text-gray-900">{installer.email}</p>
              </div>
              <div>
                <label className={labelCls}>Telefon</label>
                <p className="text-sm text-gray-900">{installer.phone || '-'}</p>
              </div>
              <div>
                <label className={labelCls}>Typ</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Välj typ...</option>
                  <option value="employee">Anställd</option>
                  <option value="subcontractor">Underentreprenad</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  Timpris (kr/h) {formType === 'employee' ? '(lön före skatt)' : '(exkl moms)'}
                </label>
                <input
                  type="number"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelCls}>Hardplast-certifikat utgår</label>
                <input
                  type="date"
                  value={formHardplast}
                  onChange={(e) => setFormHardplast(e.target.value)}
                  className={inputCls}
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
                    className="rounded accent-green-700"
                  />
                  <span className="text-sm text-gray-700">Aktiv</span>
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? 'Sparar...' : 'Spara ändringar'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Blocked Dates Section */}
        <Card>
          <CardHeader title="Blockerade datum" />
          <CardBody>
            <div className="flex gap-2 mb-4 flex-wrap">
              <input
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                className={`${inputCls} w-auto`}
              />
              <select
                value={blockSlot}
                onChange={(e) => setBlockSlot(e.target.value)}
                className={`${inputCls} w-auto`}
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
                className={`${inputCls} flex-1 min-w-[200px]`}
              />
              <Button onClick={addBlockedDate} variant="danger">
                Blockera
              </Button>
            </div>

            {blockedDates.length > 0 ? (
              <div className="space-y-2">
                {blockedDates.map((bd) => (
                  <div key={bd.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <div className="text-sm text-gray-900">
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
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Ta bort
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-700">Inga blockerade datum.</p>
            )}
          </CardBody>
        </Card>

        {/* Assignments Section */}
        <Card>
          <CardHeader title="Tilldelade bokningar" />
          <CardBody>
            {assignments.length > 0 ? (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="text-sm text-gray-900 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">
                        {new Date(a.booking.scheduled_date).toLocaleDateString('sv-SE')}
                      </span>
                      <span>{a.booking.quote_requests?.customer_name || '-'}</span>
                      <span className="text-gray-600">{a.booking.quote_requests?.customer_address || ''}</span>
                      {a.is_lead && <Badge variant="warning">Ansvarig</Badge>}
                    </div>
                    <StatusBadge status={a.status === 'accepted' || a.status === 'declined' ? a.status : 'pending'} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-700">Inga tilldelade bokningar.</p>
            )}
          </CardBody>
        </Card>

        {/* Contracts Section */}
        <Card>
          <CardHeader
            title="Avtal"
            action={
              <Button onClick={() => setShowContractForm(true)} size="sm">
                Skapa avtal
              </Button>
            }
          />
          <CardBody>
            {/* Create Contract Form */}
            {showContractForm && (
              <div className="border border-gray-200 rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Avtalstyp</label>
                    <select
                      value={contractForm.contract_type}
                      onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}
                      className={inputCls}
                    >
                      <option value="employee">Anställningsavtal</option>
                      <option value="subcontractor">Underentreprenadavtal</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Giltigt från</label>
                    <input
                      type="date"
                      value={contractForm.valid_from}
                      onChange={(e) => setContractForm({ ...contractForm, valid_from: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Giltigt till (valfritt)</label>
                    <input
                      type="date"
                      value={contractForm.valid_to}
                      onChange={(e) => setContractForm({ ...contractForm, valid_to: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Anteckningar</label>
                    <input
                      type="text"
                      value={contractForm.notes}
                      onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                      placeholder="Valfria anteckningar"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => setShowContractForm(false)} variant="secondary" size="sm">
                    Avbryt
                  </Button>
                  <Button onClick={createContract} size="sm">
                    Skapa
                  </Button>
                </div>
              </div>
            )}

            {contracts.length > 0 ? (
              <div className="space-y-3">
                {contracts.map((c) => {
                  const cs = CONTRACT_STATUS[c.status] ?? { label: 'Utkast', variant: 'neutral' as BadgeVariant };
                  return (
                    <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-sm text-gray-900">
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
                        <Badge variant={cs.variant}>{cs.label}</Badge>
                      </div>
                      {c.notes && <p className="text-sm text-gray-700 mb-3">{c.notes}</p>}
                      <div className="flex gap-2 flex-wrap">
                        {c.draft_pdf_path && (
                          <a href={`/api/admin/contracts/${c.id}/download?type=draft`} className={linkBtnCls}>
                            Ladda ner utkast
                          </a>
                        )}
                        {c.signed_pdf_path && (
                          <a href={`/api/admin/contracts/${c.id}/download?type=signed`} className={linkBtnCls}>
                            Ladda ner signerat
                          </a>
                        )}
                        {c.status !== 'signed' && (
                          <label className={linkBtnCls}>
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
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-700">Inga avtal.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
