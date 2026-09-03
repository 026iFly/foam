'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  CardBody,
  StatusBadge,
  Button,
  Skeleton,
} from '@/app/components/ui';

interface QuoteCounts {
  pending: number;
  reviewed: number;
  quoted: number;
  sent: number;
  accepted: number;
  rejected: number;
  all: number;
}

interface Quote {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  status: string;
  total_excl_vat: number;
  total_incl_vat: number;
  created_at: string;
  email_sent_at: string | null;
  accepted_at: string | null;
  quote_number: string | null;
  apply_rot_deduction: boolean;
  rot_customer_info: string | null;
}

interface Booking {
  id: number;
  quote_id: number;
  booking_type: 'visit' | 'installation';
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  customer_name: string;
  customer_address: string;
  quote_value: number;
}

interface StockLevel {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  is_low: boolean;
  confirmed_7_days: number;
  confirmed_30_days: number;
  incoming_7_days: number;
  incoming_30_days: number;
  projected_from_quotes: number;
  stock_in_7_days: number;
  stock_in_30_days: number;
  low_in_7_days: boolean;
  low_in_30_days: boolean;
}

interface MaterialProjections {
  closedCellKg: number;
  openCellKg: number;
  conversionRates: {
    signed: number;
    sent: number;
    pending: number;
  };
}

interface TodoItem {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  quote_id: number | null;
  booking_id: number | null;
  task_type: string;
  due_date: string | null;
  created_at: string;
  quote_requests?: {
    id: number;
    customer_name: string;
    quote_number: string | null;
  } | null;
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<QuoteCounts | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [materialProjections, setMaterialProjections] = useState<MaterialProjections | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const syncTasks = async () => {
    setSyncing(true);
    try {
      await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      // Reload tasks
      const tasksRes = await fetch('/api/admin/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTodos(tasksData.tasks || []);
      }
    } catch (err) {
      console.error('Failed to sync tasks:', err);
    }
    setSyncing(false);
  };

  const completeTask = async (taskId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      setTodos(todos.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load quote counts and recent quotes
      const quotesRes = await fetch('/api/admin/quotes');
      const quotesData = await quotesRes.json();

      setCounts(quotesData.counts);
      setRecentQuotes(quotesData.quotes?.slice(0, 5) || []);

      // Load tasks from database
      try {
        const tasksRes = await fetch('/api/admin/tasks');
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTodos(tasksData.tasks?.slice(0, 10) || []);
        }
      } catch {
        // Tasks API not ready yet - will sync on first use
      }

      // Try to load bookings (may not exist yet)
      try {
        const bookingsRes = await fetch('/api/admin/bookings');
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setUpcomingBookings(bookingsData.bookings || []);
        }
      } catch {
        // Bookings API not ready yet
      }

      // Try to load stock levels (may not exist yet)
      try {
        const materialsRes = await fetch('/api/admin/materials');
        if (materialsRes.ok) {
          const materialsData = await materialsRes.json();
          setStockLevels(materialsData.materials || []);
          if (materialsData.projections) {
            setMaterialProjections(materialsData.projections);
          }
        }
      } catch {
        // Materials API not ready yet
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Derived presentation data (no extra fetching)
  const todayLabel = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcoming = upcomingBookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const d = new Date(b.scheduled_date);
    return !Number.isNaN(d.getTime()) && d >= startOfToday;
  });

  const header = (
    <PageHeader
      title="Översikt"
      subtitle={<span suppressHydrationWarning>{todayLabel}</span>}
      actions={<Button href="/admin/calendar">Ny bokning</Button>}
    />
  );

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl">
        {header}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-5 flex flex-col gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader title={<Skeleton className="h-5 w-24" />} />
              <CardBody className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={<Skeleton className="h-5 w-56" />} />
              <CardBody className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardBody>
            </Card>
          </div>
          <div className="space-y-5">
            <Card>
              <CardHeader title={<Skeleton className="h-5 w-40" />} />
              <CardBody className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={<Skeleton className="h-5 w-32" />} />
              <CardBody className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/5" />
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      {header}

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Nya förfrågningar" value={counts?.pending || 0} accent hint="Väntar på granskning" />
        <StatCard label="Skickade offerter" value={counts?.sent || 0} hint="Inväntar svar från kund" />
        <StatCard label="Accepterade" value={counts?.accepted || 0} hint={`${counts?.all || 0} offerter totalt`} />
        <StatCard label="Kommande bokningar" value={upcoming.length} hint="Hembesök och installationer" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* To-do list */}
          <Card>
            <CardHeader
              title="Att göra"
              action={
                <Button variant="secondary" size="sm" onClick={syncTasks} disabled={syncing}>
                  {syncing ? 'Synkar...' : 'Uppdatera'}
                </Button>
              }
            />
            {todos.length === 0 ? (
              <CardBody className="text-center">
                <p className="text-gray-700">Inga uppgifter just nu.</p>
                <Button variant="ghost" size="sm" onClick={syncTasks} className="mt-2">
                  Skapa uppgifter från offerter
                </Button>
              </CardBody>
            ) : (
              <ul className="divide-y divide-gray-100">
                {todos.map((todo) => (
                  <li key={todo.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={(e) => completeTask(todo.id, e)}
                      className="group flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 hover:border-green-600 hover:bg-green-50 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                      title="Markera som klar"
                      aria-label="Markera som klar"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-transparent group-hover:text-green-700"
                        aria-hidden="true"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <Link
                      href={todo.quote_id ? `/admin/quotes/${todo.quote_id}` : '/admin/quotes'}
                      className="flex-1 min-w-0"
                    >
                      <div className="font-medium text-gray-900 truncate">{todo.title}</div>
                      {todo.description && (
                        <div className="text-sm text-gray-600 truncate">{todo.description}</div>
                      )}
                    </Link>
                    <StatusBadge status={todo.priority} className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
            {todos.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-200">
                <Link href="/admin/quotes" className="text-sm font-medium text-green-700 hover:text-green-800">
                  Visa alla offerter
                </Link>
              </div>
            )}
          </Card>

          {/* Recent quotes */}
          <Card>
            <CardHeader
              title="Senaste offertförfrågningar"
              action={
                <Button href="/admin/quotes" variant="ghost" size="sm">
                  Visa alla
                </Button>
              }
            />
            {recentQuotes.length === 0 ? (
              <CardBody className="text-center text-gray-700">Inga offertförfrågningar ännu.</CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 border-b border-gray-200">
                      <th scope="col" className="px-5 py-2.5">Kund</th>
                      <th scope="col" className="px-5 py-2.5 text-right">Belopp</th>
                      <th scope="col" className="px-5 py-2.5">Status</th>
                      <th scope="col" className="px-5 py-2.5 text-right">Datum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentQuotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 min-w-0">
                          <Link href={`/admin/quotes/${quote.id}`} className="block">
                            <div className="font-medium text-gray-900 truncate">{quote.customer_name}</div>
                            <div className="text-xs text-gray-600 truncate">{quote.customer_address}</div>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(quote.total_incl_vat || quote.total_excl_vat || 0)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={quote.status} />
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700 whitespace-nowrap">
                          {formatDate(quote.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Upcoming bookings */}
          <Card>
            <CardHeader
              title="Kommande bokningar"
              action={
                <Button href="/admin/calendar" variant="ghost" size="sm">
                  Öppna kalendern
                </Button>
              }
            />
            {upcoming.length === 0 ? (
              <CardBody className="text-sm text-gray-700">Inga bokade besök eller installationer.</CardBody>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcoming.slice(0, 5).map((booking) => (
                  <li key={booking.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        booking.booking_type === 'installation' ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                      </div>
                      <div className="text-gray-600 truncate">{booking.customer_name}</div>
                    </div>
                    <div className="text-gray-700 whitespace-nowrap">{formatDate(booking.scheduled_date)}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Stock levels */}
          <Card>
            <CardHeader
              title="Lagerprognos"
              action={
                <Button href="/admin/inventory" variant="ghost" size="sm">
                  Hantera lager
                </Button>
              }
            />
            <CardBody>
              {stockLevels.length === 0 ? (
                <div className="text-sm text-gray-700">Lagerdata inte tillgänglig. Kör databasen migreringen.</div>
              ) : (
                <div className="space-y-4">
                  {stockLevels.map((stock) => (
                    <div key={stock.id} className="space-y-1">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-900 truncate">{stock.name}</span>
                        <span className={`tabular-nums whitespace-nowrap ${stock.is_low ? 'text-red-700 font-bold' : 'text-gray-900'}`}>
                          {stock.current_stock} {stock.unit}
                        </span>
                      </div>
                      <div className={`text-xs ${stock.low_in_7_days ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                        Om 7d: {stock.stock_in_7_days} {stock.unit}
                        {stock.confirmed_7_days > 0 && ` (${stock.confirmed_7_days} ${stock.unit} bokade)`}
                      </div>
                      <div className={`text-xs ${stock.low_in_30_days ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                        Om 30d: {stock.stock_in_30_days} {stock.unit}
                        {stock.projected_from_quotes > 0 && ` (inkl. ~${stock.projected_from_quotes} ${stock.unit} från offerter)`}
                      </div>
                      {stock.is_low && (
                        <div className="text-xs text-red-700 font-medium">
                          Under minimigräns ({stock.minimum_stock} {stock.unit})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
            {materialProjections && (materialProjections.closedCellKg > 0 || materialProjections.openCellKg > 0) && (
              <div className="px-5 py-3 border-t border-gray-200 text-xs text-gray-600">
                Prognos: {Math.round(materialProjections.conversionRates.signed * 100)}% signerade,{' '}
                {Math.round(materialProjections.conversionRates.sent * 100)}% skickade,{' '}
                {Math.round(materialProjections.conversionRates.pending * 100)}% nya
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
