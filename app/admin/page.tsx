'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'quoted': return 'bg-purple-100 text-purple-800';
      case 'sent': return 'bg-indigo-100 text-indigo-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ny';
      case 'reviewed': return 'Granskad';
      case 'quoted': return 'Offert skapad';
      case 'sent': return 'Skickad';
      case 'accepted': return 'Accepterad';
      case 'rejected': return 'Avböjd';
      default: return status;
    }
  };

  const getTodoPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-gray-300';
      default: return 'border-l-gray-300';
    }
  };

  // Calculate projections
  const projectedRevenue = recentQuotes.reduce((sum, q) => {
    const value = q.total_incl_vat || q.total_excl_vat || 0;
    let rate = 0.1; // pending
    if (q.status === 'sent') rate = 0.5;
    if (q.status === 'accepted') rate = 1.0;
    return sum + (value * rate);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Laddar dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-yellow-600">{counts?.pending || 0}</div>
              <div className="text-sm text-gray-600">Nya förfrågningar</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-indigo-600">{counts?.sent || 0}</div>
              <div className="text-sm text-gray-600">Skickade offerter</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600">{counts?.accepted || 0}</div>
              <div className="text-sm text-gray-600">Accepterade</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-gray-600">{counts?.all || 0}</div>
              <div className="text-sm text-gray-600">Totalt</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - To-do list */}
            <div className="lg:col-span-2 space-y-6">
              {/* To-do List */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Att göra</h2>
                  <button
                    onClick={syncTasks}
                    disabled={syncing}
                    className="text-sm px-3 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    {syncing ? 'Synkar...' : 'Uppdatera'}
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {todos.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <p>Inga uppgifter just nu.</p>
                      <button
                        onClick={syncTasks}
                        className="mt-2 text-sm text-green-600 hover:text-green-700"
                      >
                        Skapa uppgifter från offerter
                      </button>
                    </div>
                  ) : (
                    todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`flex items-center gap-3 p-4 hover:bg-gray-50 border-l-4 ${getTodoPriorityColor(todo.priority)}`}
                      >
                        <button
                          onClick={(e) => completeTask(todo.id, e)}
                          className="flex-shrink-0 w-5 h-5 border-2 border-gray-300 rounded hover:border-green-500 hover:bg-green-50 flex items-center justify-center"
                          title="Markera som klar"
                        >
                          <span className="text-transparent hover:text-green-500 text-xs">✓</span>
                        </button>
                        <Link
                          href={todo.quote_id ? `/admin/quotes/${todo.quote_id}` : '/admin/quotes'}
                          className="flex-1 min-w-0"
                        >
                          <div className="font-medium text-gray-800">{todo.title}</div>
                          <div className="text-sm text-gray-500 truncate">{todo.description}</div>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
                {todos.length > 0 && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <Link
                      href="/admin/quotes"
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      Visa alla offerter →
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Quotes */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Senaste offertförfrågningar</h2>
                  <Link
                    href="/admin/quotes"
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    Visa alla
                  </Link>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentQuotes.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      Inga offertförfrågningar ännu.
                    </div>
                  ) : (
                    recentQuotes.map((quote) => (
                      <Link
                        key={quote.id}
                        href={`/admin/quotes/${quote.id}`}
                        className="block p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-800">{quote.customer_name}</div>
                            <div className="text-sm text-gray-500">{quote.customer_address}</div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(quote.status)}`}>
                              {getStatusLabel(quote.status)}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">
                              {formatCurrency(quote.total_incl_vat || quote.total_excl_vat || 0)}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          {formatDate(quote.created_at)}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Stock & Calendar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Snabbval</h2>
                <div className="space-y-2">
                  <Link
                    href="/admin/quotes"
                    className="block w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                  >
                    📋 Alla offerter
                  </Link>
                  <Link
                    href="/admin/inventory"
                    className="block w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                  >
                    📦 Lagerstatus
                  </Link>
                  <Link
                    href="/admin/calendar"
                    className="block w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
                  >
                    📅 Kalender
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="block w-full text-left px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    ⚙️ Inställningar
                  </Link>
                </div>
              </div>

              {/* Stock Levels */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">Lagerprognos</h2>
                </div>
                <div className="p-4">
                  {stockLevels.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Lagerdata inte tillgänglig. Kör databasen migreringen.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stockLevels.map((stock) => (
                        <div key={stock.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">{stock.name}</span>
                            <span className={stock.is_low ? 'text-red-600 font-bold' : 'text-gray-600'}>
                              {stock.current_stock} {stock.unit}
                            </span>
                          </div>
                          <div className={`text-xs ${stock.low_in_7_days ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                            Om 7d: {stock.stock_in_7_days} {stock.unit}
                            {stock.confirmed_7_days > 0 && ` (${stock.confirmed_7_days} ${stock.unit} bokade)`}
                          </div>
                          <div className={`text-xs ${stock.low_in_30_days ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                            Om 30d: {stock.stock_in_30_days} {stock.unit}
                            {stock.projected_from_quotes > 0 && ` (inkl. ~${stock.projected_from_quotes} ${stock.unit} från offerter)`}
                          </div>
                          {stock.is_low && (
                            <div className="text-xs text-red-600 font-medium">
                              ⚠️ Under minimigräns ({stock.minimum_stock} {stock.unit})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {materialProjections && (materialProjections.closedCellKg > 0 || materialProjections.openCellKg > 0) && (
                  <div className="px-4 pb-3 text-xs text-gray-400">
                    Prognos: {Math.round(materialProjections.conversionRates.signed * 100)}% signerade, {Math.round(materialProjections.conversionRates.sent * 100)}% skickade, {Math.round(materialProjections.conversionRates.pending * 100)}% nya
                  </div>
                )}
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <Link
                    href="/admin/inventory"
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Hantera lager →
                  </Link>
                </div>
              </div>

              {/* Revenue Projection */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Prognos</h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(projectedRevenue)}
                    </div>
                    <div className="text-sm text-gray-500">Projicerade intäkter</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Baserat på konverteringsgrader: 100% accepterade, 50% skickade, 10% nya
                  </div>
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">Kommande</h2>
                </div>
                <div className="p-4">
                  {upcomingBookings.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Inga bokade besök eller installationer.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingBookings.slice(0, 5).map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            booking.booking_type === 'installation' ? 'bg-green-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <div className="font-medium text-gray-700">
                              {booking.booking_type === 'installation' ? 'Installation' : 'Hembesök'}
                            </div>
                            <div className="text-gray-500">{booking.customer_name}</div>
                          </div>
                          <div className="text-gray-500">
                            {formatDate(booking.scheduled_date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <Link
                    href="/admin/calendar"
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    Öppna kalendern →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
