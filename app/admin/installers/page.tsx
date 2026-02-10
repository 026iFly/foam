'use client';

import { useState, useEffect, useCallback } from 'react';
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
  upcoming_bookings: number;
  hardplast_valid: boolean;
}

export default function InstallersPage() {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchInstallers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/installers');
      const data = await res.json();
      setInstallers(data.installers || []);
    } catch (err) {
      console.error('Error fetching installers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstallers();
  }, [fetchInstallers]);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newList = [...installers];
    const draggedIdx = newList.findIndex((i) => i.id === draggedId);
    const targetIdx = newList.findIndex((i) => i.id === targetId);

    const [dragged] = newList.splice(draggedIdx, 1);
    newList.splice(targetIdx, 0, dragged);

    setInstallers(newList);
  };

  const handleDragEnd = async () => {
    setDraggedId(null);
    setSaving(true);

    const priorities = installers.map((inst, index) => ({
      id: inst.id,
      priority_order: index + 1,
    }));

    try {
      await fetch('/api/admin/installers/priority', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorities }),
      });
    } catch (err) {
      console.error('Error saving priority:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (installer: Installer) => {
    try {
      await fetch(`/api/admin/installers/${installer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !installer.is_active }),
      });
      fetchInstallers();
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  };

  const formatType = (type: string | null) => {
    if (type === 'employee') return 'Anställd';
    if (type === 'subcontractor') return 'Underentreprenad';
    return 'Ej angiven';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Installatörer</h1>
        {saving && (
          <span className="text-sm text-gray-500">Sparar prioritet...</span>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Dra och släpp för att ändra prioritetsordning. Högre prioritet = tilldelas först.
      </p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Namn</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timpris</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hardplast</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bokningar</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {installers.map((installer, index) => (
              <tr
                key={installer.id}
                draggable
                onDragStart={() => handleDragStart(installer.id)}
                onDragOver={(e) => handleDragOver(e, installer.id)}
                onDragEnd={handleDragEnd}
                className={`cursor-grab hover:bg-gray-50 ${
                  draggedId === installer.id ? 'opacity-50' : ''
                } ${!installer.is_active ? 'opacity-60' : ''}`}
              >
                <td className="px-3 py-3 text-sm text-gray-400">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {installer.first_name} {installer.last_name}
                  </div>
                  <div className="text-xs text-gray-500">{installer.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    installer.installer_type === 'employee'
                      ? 'bg-blue-100 text-blue-800'
                      : installer.installer_type === 'subcontractor'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {formatType(installer.installer_type)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {installer.hourly_rate ? `${installer.hourly_rate} kr/h` : '-'}
                </td>
                <td className="px-4 py-3">
                  {installer.hardplast_expiry ? (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      installer.hardplast_valid
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {installer.hardplast_valid ? 'Giltig' : 'Utgången'}
                      {' '}
                      {new Date(installer.hardplast_expiry).toLocaleDateString('sv-SE')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Ej angiven</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {installer.upcoming_bookings}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(installer)}
                    className={`text-xs px-2 py-1 rounded-full ${
                      installer.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {installer.is_active ? 'Aktiv' : 'Inaktiv'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/installers/${installer.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Detaljer
                  </Link>
                </td>
              </tr>
            ))}
            {installers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Inga installatörer hittade. Lägg till användare med rollen &quot;installer&quot; under Användare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
