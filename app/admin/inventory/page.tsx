'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Badge, StatusBadge, Button, Skeleton, cn } from '@/app/components/ui';

interface Material {
  id: number;
  name: string;
  sku: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_cost: number;
  supplier: string;
  lead_time_days: number;
  is_low: boolean;
  reserved_7_days: number;
  reserved_30_days: number;
  incoming_7_days: number;
  incoming_30_days: number;
  stock_in_7_days: number;
  stock_in_30_days: number;
}

interface Shipment {
  id: number;
  supplier: string;
  order_number: string;
  expected_date: string;
  status: string;
  shipment_items?: Array<{
    id: number;
    material_id: number;
    quantity: number;
    materials: { name: string; unit: string };
  }>;
}

interface DeliveryItem {
  material_id: number;
  quantity: number;
}

export default function InventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{
    id: number;
    material_name: string;
    material_unit: string;
    quantity: number;
    transaction_type: string;
    reference_type: string;
    notes: string | null;
    created_at: string;
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Delivery modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [deliveryForm, setDeliveryForm] = useState({
    supplier: '',
    order_number: '',
    expected_date: '',
    notes: '',
  });
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [receivingShipment, setReceivingShipment] = useState<number | null>(null);
  const [deletingShipment, setDeletingShipment] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materialsRes, shipmentsRes] = await Promise.all([
        fetch('/api/admin/materials'),
        fetch('/api/admin/shipments').catch(() => ({ ok: false, json: () => ({ shipments: [] }) })),
      ]);

      const materialsData = await materialsRes.json();
      setMaterials(materialsData.materials || []);

      if (shipmentsRes.ok) {
        const shipmentsData = await shipmentsRes.json();
        setShipments(shipmentsData.shipments || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/materials/history?limit=100');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setHistoryLoading(false);
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const adjustStock = async (materialId: number) => {
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      showMessage('Ange ett giltigt antal');
      return;
    }

    try {
      const res = await fetch(`/api/admin/materials/${materialId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: amount,
          transaction_type: 'adjustment',
          notes: adjustNotes || 'Manuell justering',
        }),
      });

      if (res.ok) {
        showMessage('Lager uppdaterat!');
        setAdjusting(null);
        setAdjustAmount('');
        setAdjustNotes('');
        loadData();
      } else {
        showMessage('Fel vid uppdatering');
      }
    } catch {
      showMessage('Fel vid uppdatering');
    }
  };

  const openDeliveryModal = (shipment?: Shipment) => {
    if (shipment) {
      // Edit mode
      setEditingShipment(shipment);
      setDeliveryForm({
        supplier: shipment.supplier || '',
        order_number: shipment.order_number || '',
        expected_date: shipment.expected_date,
        notes: '',
      });
      setDeliveryItems(
        shipment.shipment_items?.map(item => ({
          material_id: item.material_id,
          quantity: item.quantity,
        })) || [{ material_id: 0, quantity: 0 }]
      );
    } else {
      // Create mode
      setEditingShipment(null);
      setDeliveryForm({
        supplier: '',
        order_number: '',
        expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
      });
      setDeliveryItems([{ material_id: 0, quantity: 0 }]);
    }
    setShowDeliveryModal(true);
  };

  const addDeliveryItem = () => {
    setDeliveryItems([...deliveryItems, { material_id: 0, quantity: 0 }]);
  };

  const removeDeliveryItem = (index: number) => {
    setDeliveryItems(deliveryItems.filter((_, i) => i !== index));
  };

  const updateDeliveryItem = (index: number, field: keyof DeliveryItem, value: number) => {
    const updated = [...deliveryItems];
    updated[index] = { ...updated[index], [field]: value };
    setDeliveryItems(updated);
  };

  const handleSaveDelivery = async () => {
    if (!deliveryForm.expected_date) {
      showMessage('Välj ett förväntat leveransdatum');
      return;
    }

    const validItems = deliveryItems.filter(item => item.material_id > 0 && item.quantity > 0);
    if (validItems.length === 0) {
      showMessage('Lägg till minst ett material');
      return;
    }

    setSavingDelivery(true);
    try {
      const url = editingShipment
        ? `/api/admin/shipments/${editingShipment.id}`
        : '/api/admin/shipments';
      const method = editingShipment ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier: deliveryForm.supplier,
          order_number: deliveryForm.order_number,
          expected_date: deliveryForm.expected_date,
          notes: deliveryForm.notes,
          items: validItems,
        }),
      });

      if (res.ok) {
        showMessage(editingShipment ? 'Leverans uppdaterad!' : 'Leverans skapad!');
        setShowDeliveryModal(false);
        setEditingShipment(null);
        loadData();
      } else {
        const error = await res.json();
        showMessage(`Fel: ${error.error || 'Kunde inte spara leverans'}`);
      }
    } catch {
      showMessage('Fel vid sparande av leverans');
    }
    setSavingDelivery(false);
  };

  const handleDeleteShipment = async (shipmentId: number) => {
    if (!confirm('Är du säker på att du vill ta bort denna leverans?')) {
      return;
    }

    setDeletingShipment(shipmentId);
    try {
      const res = await fetch(`/api/admin/shipments/${shipmentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showMessage('Leverans borttagen!');
        loadData();
      } else {
        const error = await res.json();
        showMessage(`Fel: ${error.error || 'Kunde inte ta bort leverans'}`);
      }
    } catch {
      showMessage('Fel vid borttagning av leverans');
    }
    setDeletingShipment(null);
  };

  const handleReceiveShipment = async (shipmentId: number) => {
    if (!confirm('Markera leveransen som mottagen? Lagernivåerna kommer att uppdateras.')) {
      return;
    }

    setReceivingShipment(shipmentId);
    try {
      const res = await fetch(`/api/admin/shipments/${shipmentId}/receive`, {
        method: 'POST',
      });

      if (res.ok) {
        showMessage('Leverans mottagen och lager uppdaterat!');
        loadData();
      } else {
        const error = await res.json();
        showMessage(`Fel: ${error.error || 'Kunde inte motta leverans'}`);
      }
    } catch {
      showMessage('Fel vid mottagning av leverans');
    }
    setReceivingShipment(null);
  };

  const updateMinimumStock = async (materialId: number, minimum: number) => {
    try {
      await fetch(`/api/admin/materials/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minimum_stock: minimum }),
      });
      showMessage('Minimigräns uppdaterad!');
      loadData();
    } catch {
      showMessage('Fel vid uppdatering');
    }
  };

  const inputCls =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20';

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <PageHeader title="Lager" subtitle="Lagerstatus, väntande leveranser och historik" />
        <Card className="mb-6">
          <CardHeader title={<Skeleton className="h-5 w-32" />} />
          <CardBody className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </CardBody>
        </Card>
        <Card className="mb-6">
          <CardHeader title={<Skeleton className="h-5 w-48" />} />
          <CardBody className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={<Skeleton className="h-5 w-36" />} />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader
        title="Lager"
        subtitle="Lagerstatus, väntande leveranser och historik"
        actions={<Button onClick={() => openDeliveryModal()}>Ny leverans</Button>}
      />

      {message && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {message}
        </div>
      )}

      {/* Stock Overview */}
      <Card className="mb-6">
        <CardHeader title="Lagerstatus" />
        <CardBody>
          {materials.length === 0 ? (
            <div className="py-8 text-center text-gray-700">
              Inga material hittades. Kör databasen migreringen först.
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className={cn(
                    'rounded-lg border p-4',
                    material.is_low ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  )}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{material.name}</h3>
                      {material.sku && (
                        <div className="text-sm text-gray-600">SKU: {material.sku}</div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className={cn('text-2xl font-bold leading-none', material.is_low ? 'text-red-700' : 'text-gray-900')}>
                        {material.current_stock} {material.unit}
                      </div>
                      {material.is_low && <Badge variant="danger">Under minimigräns</Badge>}
                    </div>
                  </div>

                  {/* Projections */}
                  <div className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div className={cn('rounded-lg p-3', material.is_low ? 'bg-white' : 'bg-gray-50')}>
                      <div className="text-gray-600">Om 7 dagar</div>
                      <div className={cn('font-semibold', material.stock_in_7_days < 0 ? 'text-red-700' : 'text-gray-900')}>
                        {material.stock_in_7_days} {material.unit}
                      </div>
                      <div className="text-xs text-gray-600">
                        -{material.reserved_7_days} bokat, +{material.incoming_7_days} leverans
                      </div>
                    </div>
                    <div className={cn('rounded-lg p-3', material.is_low ? 'bg-white' : 'bg-gray-50')}>
                      <div className="text-gray-600">Om 30 dagar</div>
                      <div className={cn('font-semibold', material.stock_in_30_days < 0 ? 'text-red-700' : 'text-gray-900')}>
                        {material.stock_in_30_days} {material.unit}
                      </div>
                      <div className="text-xs text-gray-600">
                        -{material.reserved_30_days} bokat, +{material.incoming_30_days} leverans
                      </div>
                    </div>
                    <div className={cn('rounded-lg p-3', material.is_low ? 'bg-white' : 'bg-gray-50')}>
                      <div className="mb-1 text-gray-600">Minimigräns</div>
                      <input
                        type="number"
                        defaultValue={material.minimum_stock}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val !== material.minimum_stock) {
                            updateMinimumStock(material.id, val);
                          }
                        }}
                        className={cn(inputCls, 'w-full py-1')}
                      />
                    </div>
                  </div>

                  {/* Stock Adjustment */}
                  {adjusting === material.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Justera lager</label>
                        <input
                          type="number"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.value)}
                          placeholder="+100 eller -50"
                          className={cn(inputCls, 'w-full')}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Anteckning</label>
                        <input
                          type="text"
                          value={adjustNotes}
                          onChange={(e) => setAdjustNotes(e.target.value)}
                          placeholder="Anledning..."
                          className={cn(inputCls, 'w-full')}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => adjustStock(material.id)}>Spara</Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setAdjusting(null);
                            setAdjustAmount('');
                            setAdjustNotes('');
                          }}
                        >
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="-ml-3" onClick={() => setAdjusting(material.id)}>
                      Justera lager
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Incoming Shipments */}
      <Card className="mb-6">
        <CardHeader title="Väntande leveranser" />
        <CardBody>
          {shipments.length === 0 ? (
            <div className="py-4 text-center text-gray-700">Inga väntande leveranser.</div>
          ) : (
            <div className="space-y-3">
              {shipments.map((shipment) => (
                <div key={shipment.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{shipment.supplier || 'Okänd leverantör'}</div>
                      {shipment.order_number && (
                        <div className="text-sm text-gray-600">Order: {shipment.order_number}</div>
                      )}
                      {/* Shipment items */}
                      {shipment.shipment_items && shipment.shipment_items.length > 0 && (
                        <div className="mt-2 space-y-0.5 text-sm text-gray-700">
                          {shipment.shipment_items.map(item => (
                            <div key={item.id}>
                              {item.quantity} {item.materials?.unit || 'st'} {item.materials?.name || `Material #${item.material_id}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {new Date(shipment.expected_date).toLocaleDateString('sv-SE')}
                        </span>
                        <StatusBadge status={shipment.status} />
                      </div>
                      {shipment.status !== 'received' && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openDeliveryModal(shipment)}>
                            Redigera
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReceiveShipment(shipment.id)}
                            disabled={receivingShipment === shipment.id}
                          >
                            {receivingShipment === shipment.id ? 'Tar emot...' : 'Mottagen'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteShipment(shipment.id)}
                            disabled={deletingShipment === shipment.id}
                          >
                            {deletingShipment === shipment.id ? '...' : 'Ta bort'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* History Section */}
      <Card>
        <CardHeader
          title="Lagerhistorik"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!showHistory) loadHistory();
                setShowHistory(!showHistory);
              }}
            >
              {showHistory ? 'Dölj historik' : 'Visa historik'}
            </Button>
          }
        />
        {showHistory && (
          <CardBody>
            {historyLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-4 text-center text-gray-700">Ingen historik ännu.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-600">Datum</th>
                      <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-600">Material</th>
                      <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-gray-600">Typ</th>
                      <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Ändring</th>
                      <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Anteckning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-900">
                          {new Date(entry.created_at).toLocaleString('sv-SE', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 pr-4 text-gray-900">{entry.material_name}</td>
                        <td className="py-2 pr-4">
                          <Badge
                            variant={
                              entry.transaction_type === 'received' ? 'success'
                                : entry.transaction_type === 'consumed' ? 'danger'
                                : 'neutral'
                            }
                          >
                            {entry.transaction_type === 'received' ? 'Leverans'
                              : entry.transaction_type === 'consumed' ? 'Förbrukat'
                              : entry.transaction_type === 'adjustment' ? 'Justering'
                              : entry.transaction_type}
                          </Badge>
                        </td>
                        <td className={cn('py-2 pr-4 text-right font-medium', entry.quantity > 0 ? 'text-green-700' : 'text-red-700')}>
                          {entry.quantity > 0 ? '+' : ''}{entry.quantity} {entry.material_unit}
                        </td>
                        <td className="py-2 text-gray-700">{entry.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        )}
      </Card>

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingShipment ? 'Redigera leverans' : 'Ny leverans'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowDeliveryModal(false);
                  setEditingShipment(null);
                }}
                className="rounded-lg p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Stäng"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Supplier */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Leverantör
                </label>
                <input
                  type="text"
                  value={deliveryForm.supplier}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, supplier: e.target.value })}
                  placeholder="T.ex. Huntsman"
                  className={cn(inputCls, 'w-full')}
                />
              </div>

              {/* Order Number */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Ordernummer
                </label>
                <input
                  type="text"
                  value={deliveryForm.order_number}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, order_number: e.target.value })}
                  placeholder="T.ex. PO-2024-001"
                  className={cn(inputCls, 'w-full')}
                />
              </div>

              {/* Expected Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Förväntat leveransdatum
                </label>
                <input
                  type="date"
                  value={deliveryForm.expected_date}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, expected_date: e.target.value })}
                  className={cn(inputCls, 'w-full')}
                />
              </div>

              {/* Materials */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Material
                </label>
                <div className="space-y-2">
                  {deliveryItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={item.material_id}
                        onChange={(e) => updateDeliveryItem(index, 'material_id', parseInt(e.target.value))}
                        className={cn(inputCls, 'flex-1')}
                      >
                        <option value={0}>Välj material...</option>
                        {materials.map(mat => (
                          <option key={mat.id} value={mat.id}>
                            {mat.name} ({mat.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateDeliveryItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Antal"
                        className={cn(inputCls, 'w-24')}
                      />
                      {deliveryItems.length > 1 && (
                        <Button variant="secondary" size="sm" onClick={() => removeDeliveryItem(index)}>
                          Ta bort
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={addDeliveryItem}>
                  Lägg till material
                </Button>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Anteckningar
                </label>
                <textarea
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Valfria anteckningar..."
                  className={cn(inputCls, 'w-full')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 rounded-b-lg border-t border-gray-200 bg-gray-50 px-5 py-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeliveryModal(false);
                  setEditingShipment(null);
                }}
              >
                Avbryt
              </Button>
              <Button onClick={handleSaveDelivery} disabled={savingDelivery}>
                {savingDelivery ? 'Sparar...' : (editingShipment ? 'Spara ändringar' : 'Skapa leverans')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
