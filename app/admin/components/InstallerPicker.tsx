'use client';

import { useState, useEffect } from 'react';
import { Skeleton, cn } from '@/app/components/ui';

interface AvailabilityInfo {
  installerId: string;
  installerName: string;
  available: boolean;
  reason?: string;
  priorityOrder: number;
}

interface InstallerPickerProps {
  date: string;
  slot?: 'full' | 'morning' | 'afternoon';
  selectedIds: string[];
  leadId?: string;
  onChange: (selectedIds: string[], leadId?: string) => void;
  maxInstallers?: number;
}

export default function InstallerPicker({
  date,
  slot = 'full',
  selectedIds,
  leadId,
  onChange,
  maxInstallers = 4,
}: InstallerPickerProps) {
  const [installers, setInstallers] = useState<AvailabilityInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;

    setLoading(true);
    fetch(`/api/admin/availability?date=${date}&slot=${slot}`)
      .then((res) => res.json())
      .then((data) => {
        setInstallers(data.installers || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date, slot]);

  const toggleInstaller = (id: string) => {
    let newIds: string[];
    if (selectedIds.includes(id)) {
      newIds = selectedIds.filter((i) => i !== id);
    } else {
      if (selectedIds.length >= maxInstallers) return;
      newIds = [...selectedIds, id];
    }

    // If removing the lead, pick the first selected as new lead
    let newLead = leadId;
    if (newLead && !newIds.includes(newLead)) {
      newLead = newIds[0] || undefined;
    }
    if (newIds.length > 0 && !newLead) {
      newLead = newIds[0];
    }

    onChange(newIds, newLead);
  };

  const setLead = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds, id);
    }
  };

  if (!date) {
    return <p className="text-sm text-gray-600">Välj ett datum först.</p>;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const available = installers.filter((i) => i.available);
  const unavailable = installers.filter((i) => !i.available);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        {available.length} tillgängliga av {installers.length} installatörer
        {selectedIds.length > 0 && ` | ${selectedIds.length} valda`}
      </p>

      {/* Available installers */}
      {available.map((inst) => {
        const isSelected = selectedIds.includes(inst.installerId);
        const isLead = inst.installerId === leadId;

        return (
          <div
            key={inst.installerId}
            onClick={() => toggleInstaller(inst.installerId)}
            className={cn(
              'flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors',
              isSelected
                ? 'border-green-600 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                className="rounded accent-green-700"
              />
              <span className="text-sm font-medium text-gray-900">{inst.installerName}</span>
              <span className="text-xs text-gray-600">#{inst.priorityOrder}</span>
            </div>
            {isSelected && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLead(inst.installerId);
                }}
                className={cn(
                  'h-6 rounded-full px-2.5 text-xs font-semibold transition-colors',
                  isLead
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-amber-50'
                )}
              >
                {isLead ? 'Ansvarig' : 'Gör ansvarig'}
              </button>
            )}
          </div>
        );
      })}

      {/* Unavailable installers */}
      {unavailable.length > 0 && (
        <div className="mt-2 border-t border-gray-200 pt-2">
          <p className="mb-1 text-xs text-gray-600">Ej tillgängliga:</p>
          {unavailable.map((inst) => (
            <div
              key={inst.installerId}
              className="flex items-center justify-between rounded-lg px-3 py-1.5"
            >
              <span className="text-sm text-gray-700">{inst.installerName}</span>
              <span className="text-xs text-red-700">{inst.reason}</span>
            </div>
          ))}
        </div>
      )}

      {installers.length === 0 && (
        <p className="text-sm text-gray-600">Inga installatörer registrerade.</p>
      )}
    </div>
  );
}
