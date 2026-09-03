'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Badge, Button, Skeleton, cn } from '@/app/components/ui';
import type { BadgeVariant } from '@/app/components/ui';

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

const selectCls =
  'border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent';

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

  const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
      case 'sent': return 'success';
      case 'failed': return 'danger';
      case 'skipped': return 'warning';
      default: return 'neutral';
    }
  };

  const getChannelVariant = (channel: string): BadgeVariant => {
    switch (channel) {
      case 'email': return 'info';
      default: return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader title="Diagnostik" subtitle="Status för notifieringskanaler och logg över skickade meddelanden" />

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="text-sm font-medium text-gray-600 mb-3">E-post (SMTP)</div>
          <div className="flex items-center justify-between gap-3">
            <Badge variant={systemStatus?.email_configured ? 'success' : 'danger'}>
              {systemStatus?.email_configured ? 'Konfigurerad' : 'Ej konfigurerad'}
            </Badge>
            <Button
              onClick={() => sendTest('email')}
              disabled={testing === 'email'}
              variant="secondary"
              size="sm"
            >
              {testing === 'email' ? 'Skickar...' : 'Testa'}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-medium text-gray-600 mb-3">Discord Webhook</div>
          <div className="flex items-center justify-between gap-3">
            <Badge variant={systemStatus?.discord_configured ? 'success' : 'danger'}>
              {systemStatus?.discord_configured ? 'Konfigurerad' : 'Ej konfigurerad'}
            </Badge>
            <Button
              onClick={() => sendTest('discord')}
              disabled={testing === 'discord'}
              variant="secondary"
              size="sm"
            >
              {testing === 'discord' ? 'Skickar...' : 'Testa'}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-medium text-gray-600 mb-3">Senaste 24h</div>
          <div className="flex gap-5 text-sm">
            <div>
              <span className="text-gray-600">Skickade:</span>{' '}
              <span className="font-semibold text-green-700">{logs.filter(l => l.status === 'sent' && new Date(l.created_at) > new Date(Date.now() - 86400000)).length}</span>
            </div>
            <div>
              <span className="text-gray-600">Misslyckade:</span>{' '}
              <span className="font-semibold text-red-700">{logs.filter(l => l.status === 'failed' && new Date(l.created_at) > new Date(Date.now() - 86400000)).length}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          'mb-4 p-3 rounded-lg text-sm border',
          testResult.message.includes('skickat') || testResult.message.includes('skickat')
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
        )}>
          {testResult.message}
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Kanal:</label>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className={selectCls}
            >
              <option value="">Alla</option>
              <option value="email">E-post</option>
              <option value="discord">Discord</option>
              <option value="in_app">In-app</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={selectCls}
            >
              <option value="">Alla</option>
              <option value="sent">Skickad</option>
              <option value="failed">Misslyckad</option>
              <option value="skipped">Hoppades över</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Notification Log */}
      <Card className="overflow-hidden">
        <CardHeader title="Notifieringslogg" />
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-5 py-3 text-left">Tid</th>
                  <th className="px-5 py-3 text-left">Kanal</th>
                  <th className="px-5 py-3 text-left">Händelse</th>
                  <th className="px-5 py-3 text-left">Mottagare</th>
                  <th className="px-5 py-3 text-left">Ref</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Fel</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('sv-SE')}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={getChannelVariant(log.channel)}>{log.channel}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900">{log.event_type}</td>
                    <td className="px-5 py-3 text-sm text-gray-700 max-w-[200px] truncate">{log.recipient}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {log.reference_type && log.reference_id ? `${log.reference_type}#${log.reference_id}` : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={getStatusVariant(log.status)}>{log.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-sm text-red-700 max-w-[200px] truncate" title={log.error_message || ''}>
                      {log.error_message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CardBody className="py-10 text-center text-gray-700">
            Inga loggposter hittades.
          </CardBody>
        )}
      </Card>
    </div>
  );
}
