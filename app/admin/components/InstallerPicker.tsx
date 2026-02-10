'use client';

import { useState, useEffect } from 'react';

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
    return <p className="text-sm text-gray-600">Hämtar tillgänglighet...</p>;
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
            className={`flex items-center justify-between rounded px-3 py-2 cursor-pointer border ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-900">{inst.installerName}</span>
              <span className="text-xs text-gray-600">#{inst.priorityOrder}</span>
            </div>
            {isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLead(inst.installerId);
                }}
                className={`text-xs px-2 py-0.5 rounded ${
                  isLead
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-yellow-50'
                }`}
              >
                {isLead ? 'Ansvarig' : 'Gör ansvarig'}
              </button>
            )}
          </div>
        );
      })}

      {/* Unavailable installers */}
      {unavailable.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Ej tillgängliga:</p>
          {unavailable.map((inst) => (
            <div
              key={inst.installerId}
              className="flex items-center justify-between rounded px-3 py-1.5 opacity-50"
            >
              <span className="text-sm text-gray-700">{inst.installerName}</span>
              <span className="text-xs text-red-600">{inst.reason}</span>
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
