'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CustomerVerifyPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [surname, setSurname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/kund/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surname }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verifiering misslyckades');
        return;
      }

      // Store verification in session storage
      sessionStorage.setItem(`kund_verified_${token}`, 'true');
      router.push(`/kund/${token}/portal`);
    } catch {
      setError('Ett fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Intellifoam</h1>
          <p className="text-gray-700 mt-2">Kundportal</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ange ditt efternamn för att logga in
            </label>
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="Efternamn"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !surname.trim()}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifierar...' : 'Logga in'}
          </button>
        </form>

        <p className="text-xs text-gray-700 text-center mt-6">
          Har du frågor? Kontakta oss på 010 703 74 00
        </p>
      </div>
    </div>
  );
}
