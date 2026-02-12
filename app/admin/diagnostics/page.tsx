'use client';

import { useState, useEffect } from 'react';

interface NotificationLog {
  id: number;
  channel: string;
  event_type: string;
  recipient: string;
  reference_type: string | null;
  reference_id: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface SystemStatus {
  email_configured: boolean;
  discord_configured: boolean;
}

export default function DiagnosticsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [testResult, setTestResult] = useState<{ type: string; message: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filterChannel, filterStatus]);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filterChannel) params.set('channel', filterChannel);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`/api/admin/diagnostics?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setSystemStatus(data.status || null);
      }
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async (type: 'email' | 'discord') => {
    setTesting(type);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/diagnostics/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setTestResult({ type, message: data.message || data.error || 'Okänt resultat' });
      loadLogs();
    } catch {
      setTestResult({ type, message: 'Nätverksfel' });
    } finally {
      setTesting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'skipped': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'discord': return 'bg-purple-100 text-purple-800';
      case 'in_app': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">Laddar diagnostik...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Diagnostik</h1>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">E-post (SMTP)</div>
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded text-sm font-medium ${systemStatus?.email_configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {systemStatus?.email_configured ? 'Konfigurerad' : 'Ej konfigurerad'}
            </span>
            <button
              onClick={() => sendTest('email')}
              disabled={testing === 'email'}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {testing === 'email' ? 'Skickar...' : 'Testa'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Discord Webhook</div>
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded text-sm font-medium ${systemStatus?.discord_configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {systemStatus?.discord_configured ? 'Konfigurerad' : 'Ej konfigurerad'}
            </span>
            <button
              onClick={() => sendTest('discord')}
              disabled={testing === 'discord'}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {testing === 'discord' ? 'Skickar...' : 'Testa'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Senaste 24h</div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-600">Skickade:</span>{' '}
              <span className="font-semibold text-green-700">{logs.filter(l => l.status === 'sent' && new Date(l.created_at) > new Date(Date.now() - 86400000)).length}</span>
            </div>
            <div>
              <span className="text-gray-600">Misslyckade:</span>{' '}
              <span className="font-semibold text-red-700">{logs.filter(l => l.status === 'failed' && new Date(l.created_at) > new Date(Date.now() - 86400000)).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`mb-4 p-3 rounded ${testResult.message.includes('skickat') || testResult.message.includes('skickat') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {testResult.message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-4 items-center">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Kanal:</label>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
            >
              <option value="">Alla</option>
              <option value="email">E-post</option>
              <option value="discord">Discord</option>
              <option value="in_app">In-app</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
            >
              <option value="">Alla</option>
              <option value="sent">Skickad</option>
              <option value="failed">Misslyckad</option>
              <option value="skipped">Hoppades över</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Log */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Notifieringslogg</h2>
        </div>
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Tid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Kanal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Händelse</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Mottagare</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Fel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('sv-SE')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getChannelBadge(log.channel)}`}>
                        {log.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{log.event_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">{log.recipient}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.reference_type && log.reference_id ? `${log.reference_type}#${log.reference_id}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-red-700 max-w-[200px] truncate" title={log.error_message || ''}>
                      {log.error_message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-600">
            Inga loggposter hittades.
          </div>
        )}
      </div>
    </div>
  );
}
