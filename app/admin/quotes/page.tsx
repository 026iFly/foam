'use client';

import { useState, useEffect } from 'react';
import type { QuoteRequest, QuoteStatus } from '@/lib/types/quote';
import { PageHeader, Card, StatusBadge, Button, Skeleton, EmptyState, cn } from '@/app/components/ui';

interface QuoteListResponse {
  quotes: QuoteRequest[];
  total: number;
  limit: number;
  offset: number;
  counts: Record<QuoteStatus | 'all', number>;
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent';

export default function AdminQuotesPage() {
  const [data, setData] = useState<QuoteListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<QuoteStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      if (searchTerm) params.set('search', searchTerm);

      const response = await fetch(`/api/admin/quotes?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotes();
  };

  const handleMarkReviewed = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_reviewed' }),
      });
      if (response.ok) {
        fetchQuotes();
      }
    } catch (error) {
      console.error('Error marking quote as reviewed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs: Array<{ key: QuoteStatus | 'all'; label: string }> = [
    { key: 'all', label: 'Alla' },
    { key: 'pending', label: 'Väntar' },
    { key: 'reviewed', label: 'Granskad' },
    { key: 'quoted', label: 'Offererad' },
    { key: 'sent', label: 'Skickad' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <PageHeader
        title="Offertförfrågningar"
        subtitle="Hantera inkomna offertförfrågningar"
        actions={
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Sök på namn eller e-post..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(inputCls, 'w-64 h-10')}
            />
            <Button type="submit" variant="secondary">Sök</Button>
          </form>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-green-700 text-green-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              )}
            >
              {tab.label}
              {data?.counts && (
                <span className="ml-2 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {data.counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading */}
      {loading && (
        <Card className="p-5 flex flex-col gap-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </Card>
      )}

      {/* Empty state */}
      {!loading && data?.quotes.length === 0 && (
        <EmptyState title="Inga offertförfrågningar hittades" />
      )}

      {/* Quotes table */}
      {!loading && data && data.quotes.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-5 py-3 text-left">Datum</th>
                  <th className="px-5 py-3 text-left">Kund</th>
                  <th className="px-5 py-3 text-left">Adress</th>
                  <th className="px-5 py-3 text-left">Yta</th>
                  <th className="px-5 py-3 text-left">Totalt</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {data.quotes.map((quote) => (
                  <tr key={quote.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(quote.created_at)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {quote.customer_name}
                      </div>
                      <div className="text-sm text-gray-700">
                        {quote.customer_email}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate">
                      {quote.customer_address}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                      {quote.total_area ? `${quote.total_area} m²` : '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {quote.adjusted_total_incl_vat
                        ? quote.adjusted_total_incl_vat.toLocaleString('sv-SE')
                        : quote.total_incl_vat
                          ? quote.total_incl_vat.toLocaleString('sv-SE')
                          : '-'
                      } kr
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button href={`/admin/quotes/${quote.id}`} variant="ghost" size="sm">
                          Visa
                        </Button>
                        {quote.status === 'pending' && (
                          <Button onClick={() => handleMarkReviewed(quote.id)} variant="secondary" size="sm">
                            Granskad
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination info */}
      {data && data.total > data.limit && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Visar {data.quotes.length} av {data.total} offerter
        </div>
      )}
    </div>
  );
}
