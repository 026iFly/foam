'use client';

import { useState, useEffect } from 'react';

interface Installer {
  id: string;
  first_name: string;
  last_name: string;
  installer_type: string;
}

interface ReportRow {
  date: string;
  booking_id: number;
  customer_name: string;
  customer_address: string;
  hours: number;
  actual_hours: number | null;
  debitable_hours: number | null;
  rate: number;
  amount: number;
  is_lead: boolean;
}

interface ReportData {
  installer: {
    id: string;
    name: string;
    type: string;
    hourly_rate: number;
  };
  period: { from: string; to: string };
  rows: ReportRow[];
  totals: {
    hours: number;
    amount: number;
    amount_incl_vat: number;
  };
}

export default function ReportsPage() {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [selectedInstaller, setSelectedInstaller] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/installers')
      .then((r) => r.json())
      .then((data) => setInstallers(data.installers || []))
      .catch(console.error);

    // Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!selectedInstaller || !fromDate || !toDate) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reports/installer?installer_id=${selectedInstaller}&from=${fromDate}&to=${toDate}`
      );
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!selectedInstaller || !fromDate || !toDate) return;
    window.open(
      `/api/admin/reports/installer?installer_id=${selectedInstaller}&from=${fromDate}&to=${toDate}&format=csv`,
      '_blank'
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Rapporter</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Installatör</label>
            <select
              value={selectedInstaller}
              onChange={(e) => setSelectedInstaller(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="">Välj installatör...</option>
              {installers.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.first_name} {inst.last_name}
                  {inst.installer_type === 'subcontractor' ? ' (UE)' : ' (Anst.)'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Från</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Till</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={generateReport}
              disabled={loading || !selectedInstaller}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Genererar...' : 'Visa rapport'}
            </button>
            {report && (
              <button
                onClick={downloadCsv}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
              >
                CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report */}
      {report && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              {report.installer.name}
              <span className="text-sm font-normal text-gray-600 ml-2">
                {report.installer.type === 'subcontractor' ? 'Underentreprenad' : 'Anställd'}
              </span>
            </h2>
            <p className="text-sm text-gray-600">
              {new Date(report.period.from).toLocaleDateString('sv-SE')} - {new Date(report.period.to).toLocaleDateString('sv-SE')}
            </p>
          </div>

          {report.rows.length > 0 ? (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Datum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Kund</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Adress</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Timmar</th>
                    {report.rows.some(r => r.debitable_hours != null) && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Fakturerbara</th>
                    )}
                    {report.installer.type === 'subcontractor' && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Timpris</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Belopp</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {report.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(row.date).toLocaleDateString('sv-SE')}
                      </td>
                      <td className="px-4 py-3 text-sm">{row.customer_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.customer_address}</td>
                      <td className="px-4 py-3 text-sm text-right">{row.hours}h</td>
                      {report.rows.some(r => r.debitable_hours != null) && (
                        <td className="px-4 py-3 text-sm text-right">
                          {row.debitable_hours != null ? `${row.debitable_hours}h` : '-'}
                        </td>
                      )}
                      {report.installer.type === 'subcontractor' && (
                        <>
                          <td className="px-4 py-3 text-sm text-right">{row.rate} kr</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(row.amount)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Totalt</span>
                  <div className="text-right">
                    <p className="text-sm">
                      <span className="text-gray-600">Timmar:</span>{' '}
                      <span className="font-semibold">{report.totals.hours}h</span>
                    </p>
                    {report.installer.type === 'subcontractor' && (
                      <>
                        <p className="text-sm">
                          <span className="text-gray-600">Exkl moms:</span>{' '}
                          <span className="font-semibold">{formatCurrency(report.totals.amount)}</span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">Inkl moms:</span>{' '}
                          <span className="font-bold">{formatCurrency(report.totals.amount_incl_vat)}</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="px-6 py-8 text-center text-gray-600">
              Inga slutförda bokningar för denna period.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
