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

export default function InstallerDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/installer/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmation = async (task: Task, action: 'accept' | 'decline') => {
    if (!task.booking_id) return;
    setActionLoading(task.id);

    try {
      const res = await fetch('/api/installer/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: task.booking_id, action }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({
          id: task.id,
          message: action === 'accept' ? 'Bokning accepterad!' : 'Bokning avböjd',
          type: 'success',
        });
        // Refresh tasks after short delay so feedback is visible
        setTimeout(() => {
          loadTasks();
          setFeedback(null);
        }, 1500);
      } else {
        setFeedback({
          id: task.id,
          message: data.error || 'Något gick fel',
          type: 'error',
        });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Error handling confirmation:', err);
      setFeedback({
        id: task.id,
        message: 'Nätverksfel. Försök igen.',
        type: 'error',
      });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    setActionLoading(task.id);
    try {
      const res = await fetch('/api/installer/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id }),
      });

      if (res.ok) {
        setFeedback({
          id: task.id,
          message: 'Uppgift slutförd!',
          type: 'success',
        });
        setTimeout(() => {
          loadTasks();
          setFeedback(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Error completing task:', err);
    } finally {
      setActionLoading(null);
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
              const taskFeedback = feedback?.id === task.id ? feedback : null;
              const isLoading = actionLoading === task.id;

              return (
                <div key={task.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  {taskFeedback && (
                    <div className={`mb-2 text-sm font-medium rounded px-3 py-1.5 ${
                      taskFeedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {taskFeedback.message}
                    </div>
                  )}
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
                      disabled={isLoading}
                      className="flex-1 bg-green-600 text-white rounded py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Vänta...' : 'Acceptera'}
                    </button>
                    <button
                      onClick={() => handleConfirmation(task, 'decline')}
                      disabled={isLoading}
                      className="flex-1 bg-red-100 text-red-700 rounded py-2 text-sm font-medium hover:bg-red-200 disabled:opacity-50"
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
            {otherTasks.map((task) => {
              const isLoading = actionLoading === task.id;
              const taskFeedback = feedback?.id === task.id ? feedback : null;

              return (
                <div key={task.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  {taskFeedback && (
                    <div className="mb-2 text-sm font-medium rounded px-3 py-1.5 bg-green-100 text-green-800">
                      {taskFeedback.message}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-600 mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800'
                          : task.priority === 'high' ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {task.priority === 'urgent' ? 'Brådskande' : task.priority === 'high' ? 'Hög' : 'Normal'}
                      </span>
                      <button
                        onClick={() => handleCompleteTask(task)}
                        disabled={isLoading}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 disabled:opacity-50"
                      >
                        {isLoading ? '...' : 'Klar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
