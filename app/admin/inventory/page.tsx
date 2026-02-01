'use client';

import { useState, useEffect } from 'react';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Laddar lager...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Lager</h1>

          {message && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
              {message}
            </div>
          )}

          {/* Stock Overview */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Lagerstatus</h2>
            </div>
            <div className="p-6">
              {materials.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  Inga material hittades. Kör databasen migreringen först.
                </div>
              ) : (
                <div className="space-y-6">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className={`p-4 rounded-lg border ${
                        material.is_low ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">{material.name}</h3>
                          {material.sku && (
                            <div className="text-sm text-gray-500">SKU: {material.sku}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${material.is_low ? 'text-red-600' : 'text-gray-800'}`}>
                            {material.current_stock} {material.unit}
                          </div>
                          {material.is_low && (
                            <div className="text-sm text-red-600 font-medium">
                              Under minimigräns!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Projections */}
                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-gray-500">Om 7 dagar</div>
                          <div className={`font-semibold ${material.stock_in_7_days < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                            {material.stock_in_7_days} {material.unit}
                          </div>
                          <div className="text-xs text-gray-400">
                            -{material.reserved_7_days} bokat, +{material.incoming_7_days} leverans
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-gray-500">Om 30 dagar</div>
                          <div className={`font-semibold ${material.stock_in_30_days < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                            {material.stock_in_30_days} {material.unit}
                          </div>
                          <div className="text-xs text-gray-400">
                            -{material.reserved_30_days} bokat, +{material.incoming_30_days} leverans
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-gray-500">Minimigräns</div>
                          <input
                            type="number"
                            defaultValue={material.minimum_stock}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val !== material.minimum_stock) {
                                updateMinimumStock(material.id, val);
                              }
                            }}
                            className="w-full px-2 py-1 border rounded text-gray-800 text-sm"
                          />
                        </div>
                      </div>

                      {/* Stock Adjustment */}
                      {adjusting === material.id ? (
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-sm text-gray-600 mb-1">Justera lager</label>
                            <input
                              type="number"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              placeholder="+100 eller -50"
                              className="w-full px-3 py-2 border rounded text-gray-800"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm text-gray-600 mb-1">Anteckning</label>
                            <input
                              type="text"
                              value={adjustNotes}
                              onChange={(e) => setAdjustNotes(e.target.value)}
                              placeholder="Anledning..."
                              className="w-full px-3 py-2 border rounded text-gray-800"
                            />
                          </div>
                          <button
                            onClick={() => adjustStock(material.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          >
                            Spara
                          </button>
                          <button
                            onClick={() => {
                              setAdjusting(null);
                              setAdjustAmount('');
                              setAdjustNotes('');
                            }}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                          >
                            Avbryt
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAdjusting(material.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Justera lager
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Incoming Shipments */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Väntande leveranser</h2>
              <button
                onClick={() => openDeliveryModal()}
                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 font-medium"
              >
                + Ny leverans
              </button>
            </div>
            <div className="p-6">
              {shipments.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  Inga väntande leveranser.
                </div>
              ) : (
                <div className="space-y-3">
                  {shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="p-3 border rounded"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-800">{shipment.supplier || 'Okänd leverantör'}</div>
                          {shipment.order_number && (
                            <div className="text-sm text-gray-500">Order: {shipment.order_number}</div>
                          )}
                          {/* Shipment items */}
                          {shipment.shipment_items && shipment.shipment_items.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                              {shipment.shipment_items.map(item => (
                                <div key={item.id}>
                                  {item.quantity} {item.materials?.unit || 'st'} {item.materials?.name || `Material #${item.material_id}`}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-gray-800">
                            {new Date(shipment.expected_date).toLocaleDateString('sv-SE')}
                          </div>
                          <div className="text-sm text-gray-500 capitalize mb-2">{shipment.status}</div>
                          {shipment.status !== 'received' && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => openDeliveryModal(shipment)}
                                className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                              >
                                Redigera
                              </button>
                              <button
                                onClick={() => handleReceiveShipment(shipment.id)}
                                disabled={receivingShipment === shipment.id}
                                className="text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
                              >
                                {receivingShipment === shipment.id ? 'Tar emot...' : 'Mottagen'}
                              </button>
                              <button
                                onClick={() => handleDeleteShipment(shipment.id)}
                                disabled={deletingShipment === shipment.id}
                                className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 disabled:bg-gray-400"
                              >
                                {deletingShipment === shipment.id ? '...' : 'Ta bort'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingShipment ? 'Redigera leverans' : 'Ny leverans'}
              </h2>
              <button
                onClick={() => {
                  setShowDeliveryModal(false);
                  setEditingShipment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leverantör
                </label>
                <input
                  type="text"
                  value={deliveryForm.supplier}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, supplier: e.target.value })}
                  placeholder="T.ex. Huntsman"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              {/* Order Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordernummer
                </label>
                <input
                  type="text"
                  value={deliveryForm.order_number}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, order_number: e.target.value })}
                  placeholder="T.ex. PO-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              {/* Expected Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Förväntat leveransdatum
                </label>
                <input
                  type="date"
                  value={deliveryForm.expected_date}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, expected_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              {/* Materials */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material
                </label>
                <div className="space-y-2">
                  {deliveryItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={item.material_id}
                        onChange={(e) => updateDeliveryItem(index, 'material_id', parseInt(e.target.value))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                      {deliveryItems.length > 1 && (
                        <button
                          onClick={() => removeDeliveryItem(index)}
                          className="text-red-500 hover:text-red-700 px-2"
                        >
                          Ta bort
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addDeliveryItem}
                  className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  + Lägg till material
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anteckningar
                </label>
                <textarea
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Valfria anteckningar..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowDeliveryModal(false);
                  setEditingShipment(null);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Avbryt
              </button>
              <button
                onClick={handleSaveDelivery}
                disabled={savingDelivery}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {savingDelivery ? 'Sparar...' : (editingShipment ? 'Spara ändringar' : 'Skapa leverans')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
