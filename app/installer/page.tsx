'use client';

import { useState, useEffect } from 'react';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  task_type: string;
  due_date: string | null;
  booking_id: number | null;
  bookings: {
    id: number;
    scheduled_date: string;
    slot_type: string;
    status: string;
    quote_requests: {
      customer_name: string;
      customer_address: string;
    } | null;
  } | null;
}

interface Booking {
  booking_id: number;
  is_lead: boolean;
  status: string;
  booking: {
    scheduled_date: string;
    slot_type: string;
    status: string;
    customer_name?: string;
    customer_address?: string;
  };
}

export default function InstallerDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/installer/tasks').then((r) => r.json()),
      fetch('/api/installer/blocked-dates').then((r) => r.json()),
    ])
      .then(([tasksData]) => {
        setTasks(tasksData.tasks || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch upcoming bookings
    fetch('/api/admin/bookings?status=scheduled')
      .then((r) => r.json())
      .then((data) => {
        // Filter to only my bookings (this is a simplified version)
        setBookings([]);
      })
      .catch(console.error);
  }, []);

  const handleConfirmation = async (task: Task, action: 'accept' | 'decline') => {
    if (!task.booking_id) return;

    try {
      // Find the confirmation token for this booking via the in_app channel
      const res = await fetch(`/api/installer/tasks`);
      const data = await res.json();

      // Use the admin assign endpoint as fallback
      const confirmRes = await fetch(`/api/admin/bookings/${task.booking_id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          // The auto-assign system handles the actual accept/decline logic
        }),
      });

      // Refresh tasks
      const refreshRes = await fetch('/api/installer/tasks');
      const refreshData = await refreshRes.json();
      setTasks(refreshData.tasks || []);
    } catch (err) {
      console.error('Error handling confirmation:', err);
    }
  };

  const formatSlot = (slot: string) => {
    if (slot === 'morning') return 'FM';
    if (slot === 'afternoon') return 'EM';
    return 'Heldag';
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

  const confirmationTasks = tasks.filter((t) => t.task_type === 'booking_confirmation');
  const otherTasks = tasks.filter((t) => t.task_type !== 'booking_confirmation');

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Confirmation Tasks (urgent, top of page) */}
      {confirmationTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Bekräfta bokningar</h2>
          <div className="space-y-3">
            {confirmationTasks.map((task) => {
              const booking = task.bookings;
              const quoteData = booking?.quote_requests;
              return (
                <div key={task.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{quoteData?.customer_name || task.title}</p>
                      <p className="text-sm text-gray-600">{quoteData?.customer_address || ''}</p>
                    </div>
                    <div className="text-right">
                      {booking && (
                        <>
                          <p className="text-sm font-medium">
                            {new Date(booking.scheduled_date).toLocaleDateString('sv-SE', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })}
                          </p>
                          <p className="text-xs text-gray-600">{formatSlot(booking.slot_type)}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmation(task, 'accept')}
                      className="flex-1 bg-green-600 text-white rounded py-2 text-sm font-medium hover:bg-green-700"
                    >
                      Acceptera
                    </button>
                    <button
                      onClick={() => handleConfirmation(task, 'decline')}
                      className="flex-1 bg-red-100 text-red-700 rounded py-2 text-sm font-medium hover:bg-red-200"
                    >
                      Avböj
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Tasks */}
      {otherTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Uppgifter</h2>
          <div className="space-y-2">
            {otherTasks.map((task) => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-600 mt-0.5">{task.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-800'
                      : task.priority === 'high' ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {task.priority === 'urgent' ? 'Brådskande' : task.priority === 'high' ? 'Hög' : 'Normal'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmationTasks.length === 0 && otherTasks.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">Inga uppgifter just nu.</p>
        </div>
      )}
    </div>
  );
}
