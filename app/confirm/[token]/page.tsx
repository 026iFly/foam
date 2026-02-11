'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

interface ConfirmationData {
  status: string;
  installer_name: string;
  booking: {
    customer_name: string;
    customer_address: string;
    scheduled_date: string;
    slot_type: string;
  };
}

export default function ConfirmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const preAction = searchParams.get('action');

  const [data, setData] = useState<ConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/confirm/${token}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        if (d.status !== 'pending') {
          setResponded(true);
          setResponseMessage(
            d.status === 'accepted' ? 'Du har redan accepterat denna bokning.' : 'Denna bokning har redan besvarats.'
          );
        }
      })
      .catch(() => setError('Kunde inte hämta information'))
      .finally(() => setLoading(false));
  }, [token]);

  // Auto-submit if action is in URL
  useEffect(() => {
    if (data && !responded && preAction && ['accept', 'decline'].includes(preAction)) {
      handleResponse(preAction as 'accept' | 'decline');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, preAction]);

  const handleResponse = async (action: 'accept' | 'decline') => {
    setResponding(true);
    try {
      const res = await fetch(`/api/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error);
        return;
      }
      setResponded(true);
      setResponseMessage(
        action === 'accept'
          ? 'Tack! Du har accepterat bokningen.'
          : 'Du har avböjt bokningen. En annan installatör kommer att tillfrågas.'
      );
    } catch {
      setError('Ett fel uppstod');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-700">Laddar...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Intellifoam</h1>
          <p className="text-gray-700 mt-1">Bekräfta bokning</p>
        </div>

        {responded ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">
              {responseMessage.includes('accepterat') ? '✓' : '✗'}
            </div>
            <p className="text-gray-700">{responseMessage}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-4">
              Hej {data.installer_name}! Du har blivit tilldelad en ny installation.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Kund</span>
                <span className="text-sm font-medium">{data.booking.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Adress</span>
                <span className="text-sm font-medium">{data.booking.customer_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Datum</span>
                <span className="text-sm font-medium">
                  {new Date(data.booking.scheduled_date).toLocaleDateString('sv-SE', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tid</span>
                <span className="text-sm font-medium">{data.booking.slot_type}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => handleResponse('accept')}
                disabled={responding}
                className="flex-1 bg-green-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {responding ? '...' : 'Acceptera'}
              </button>
              <button
                onClick={() => handleResponse('decline')}
                disabled={responding}
                className="flex-1 bg-red-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {responding ? '...' : 'Avböj'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
