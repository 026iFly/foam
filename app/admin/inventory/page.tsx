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
}

export default function InventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

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
              <button className="text-sm text-green-600 hover:text-green-700 font-medium">
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
                      className="flex justify-between items-center p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium text-gray-800">{shipment.supplier}</div>
                        <div className="text-sm text-gray-500">Order: {shipment.order_number}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-800">
                          {new Date(shipment.expected_date).toLocaleDateString('sv-SE')}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">{shipment.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
