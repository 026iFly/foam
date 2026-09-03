'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, Badge, Button, Skeleton, EmptyState, cn } from '@/app/components/ui';

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
      <div className="p-6 md:p-8 max-w-7xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader
        title="Installatörer"
        subtitle="Dra och släpp för att ändra prioritetsordning. Högre prioritet = tilldelas först."
        actions={saving ? <span className="text-sm text-gray-600">Sparar prioritet...</span> : undefined}
      />

      {installers.length === 0 ? (
        <EmptyState
          title="Inga installatörer hittade"
          description="Ange installatörstyp på en användare för att lägga till dem här."
          action={<Button href="/admin/users" variant="secondary">Gå till användare</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-4 py-3 text-left w-10">#</th>
                  <th className="px-4 py-3 text-left">Namn</th>
                  <th className="px-4 py-3 text-left">Typ</th>
                  <th className="px-4 py-3 text-left">Timpris</th>
                  <th className="px-4 py-3 text-left">Hardplast</th>
                  <th className="px-4 py-3 text-left">Bokningar</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {installers.map((installer, index) => (
                  <tr
                    key={installer.id}
                    draggable
                    onDragStart={() => handleDragStart(installer.id)}
                    onDragOver={(e) => handleDragOver(e, installer.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'border-t border-gray-100 cursor-grab hover:bg-gray-50',
                      draggedId === installer.id && 'opacity-50',
                      !installer.is_active && 'opacity-60'
                    )}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {installer.first_name} {installer.last_name}
                      </div>
                      <div className="text-xs text-gray-600">{installer.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={installer.installer_type === 'employee' ? 'info' : 'neutral'}>
                        {formatType(installer.installer_type)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {installer.hourly_rate ? (
                        <>
                          {installer.hourly_rate} kr/h
                          <span className="text-xs text-gray-600 ml-1">
                            {installer.installer_type === 'employee' ? '(lön)' : '(exkl moms)'}
                          </span>
                        </>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {installer.hardplast_expiry ? (
                        <Badge variant={installer.hardplast_valid ? 'success' : 'danger'}>
                          {installer.hardplast_valid ? 'Giltig' : 'Utgången'}
                          {' '}
                          {new Date(installer.hardplast_expiry).toLocaleDateString('sv-SE')}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-600">Ej angiven</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {installer.upcoming_bookings}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(installer)}
                        title={installer.is_active ? 'Klicka för att inaktivera' : 'Klicka för att aktivera'}
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                      >
                        <Badge variant={installer.is_active ? 'success' : 'neutral'}>
                          {installer.is_active ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button href={`/admin/installers/${installer.id}`} variant="ghost" size="sm">
                        Detaljer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
