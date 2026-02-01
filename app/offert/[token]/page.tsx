'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Quote {
  id: number;
  customer_name: string;
  customer_address: string;
  quote_number: string;
  quote_valid_until: string;
  total_excl_vat: number;
  total_incl_vat: number;
  adjusted_total_excl_vat: number | null;
  adjusted_total_incl_vat: number | null;
  rot_deduction: number;
  apply_rot_deduction: boolean;
  status: string;
  accepted_at: string | null;
  rejected_at: string | null;
  signed_name: string | null;
}

export default function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    loadQuote();
  }, [token]);

  const loadQuote = async () => {
    try {
      const res = await fetch(`/api/offer/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Offerten kunde inte hittas eller har gått ut.');
        } else {
          setError('Ett fel uppstod vid hämtning av offerten.');
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setQuote(data.quote);
      setLoading(false);
    } catch (err) {
      setError('Ett fel uppstod vid hämtning av offerten.');
      setLoading(false);
    }
  };

  const acceptOffer = async () => {
    if (!signatureName.trim()) {
      alert('Vänligen skriv ditt namn för att godkänna offerten.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/offer/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_name: signatureName.trim() }),
      });

      if (res.ok) {
        setSuccess('accepted');
      } else {
        alert('Ett fel uppstod. Försök igen.');
      }
    } catch (err) {
      alert('Ett fel uppstod. Försök igen.');
    }
    setSubmitting(false);
  };

  const rejectOffer = async () => {
    if (!confirm('Är du säker på att du vill avböja offerten?')) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/offer/${token}/reject`, {
        method: 'POST',
      });

      if (res.ok) {
        setSuccess('rejected');
      } else {
        alert('Ett fel uppstod. Försök igen.');
      }
    } catch (err) {
      alert('Ett fel uppstod. Försök igen.');
    }
    setSubmitting(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Laddar offert...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Offert ej tillgänglig</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="text-green-600 hover:text-green-700">
            Gå till startsidan →
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          {success === 'accepted' ? (
            <>
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">Tack för din beställning!</h1>
              <p className="text-gray-600 mb-6">
                Vi har tagit emot ditt godkännande och kommer att kontakta dig inom kort
                för att boka installation.
              </p>
            </>
          ) : (
            <>
              <div className="text-gray-400 text-5xl mb-4">✕</div>
              <h1 className="text-xl font-bold text-gray-800 mb-2">Offert avböjd</h1>
              <p className="text-gray-600 mb-6">
                Vi har noterat att du avböjt offerten. Hör gärna av dig om du har frågor
                eller vill ha en ny offert i framtiden.
              </p>
            </>
          )}
          <Link href="/" className="text-green-600 hover:text-green-700">
            Gå till startsidan →
          </Link>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const isExpired = quote.quote_valid_until && new Date(quote.quote_valid_until) < new Date();
  const isAlreadyResponded = quote.status === 'accepted' || quote.status === 'rejected';
  const totalExclVat = quote.adjusted_total_excl_vat || quote.total_excl_vat || 0;
  const totalInclVat = quote.adjusted_total_incl_vat || quote.total_incl_vat || 0;
  const rotDeduction = quote.apply_rot_deduction ? (quote.rot_deduction || 0) : 0;
  const finalAmount = totalInclVat - rotDeduction;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img
              src="/intellifoam-logo.png"
              alt="Intellifoam"
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-800">
              Offert {quote.quote_number}
            </h1>
          </div>

          {/* Status Banner */}
          {isExpired && !isAlreadyResponded && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded">
              <div className="font-medium text-yellow-800">Offerten har gått ut</div>
              <div className="text-sm text-yellow-700">
                Kontakta oss för en uppdaterad offert.
              </div>
            </div>
          )}

          {isAlreadyResponded && (
            <div className={`${
              quote.status === 'accepted' ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-400'
            } border-l-4 p-4 mb-6 rounded`}>
              <div className={`font-medium ${
                quote.status === 'accepted' ? 'text-green-800' : 'text-gray-700'
              }`}>
                {quote.status === 'accepted' ? 'Offert godkänd' : 'Offert avböjd'}
              </div>
              {quote.signed_name && (
                <div className="text-sm text-gray-600">
                  Signerad av: {quote.signed_name}
                </div>
              )}
            </div>
          )}

          {/* Quote Details */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="mb-6">
              <div className="text-sm text-gray-500">Kund</div>
              <div className="font-medium text-gray-800">{quote.customer_name}</div>
              <div className="text-gray-600">{quote.customer_address}</div>
            </div>

            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between text-gray-600 mb-2">
                <span>Summa exkl. moms</span>
                <span>{formatCurrency(totalExclVat)}</span>
              </div>
              <div className="flex justify-between text-gray-600 mb-2">
                <span>Moms (25%)</span>
                <span>{formatCurrency(totalInclVat - totalExclVat)}</span>
              </div>
              <div className="flex justify-between font-medium text-gray-800 mb-2">
                <span>Summa inkl. moms</span>
                <span>{formatCurrency(totalInclVat)}</span>
              </div>
              {rotDeduction > 0 && (
                <div className="flex justify-between text-green-600 mb-2">
                  <span>ROT-avdrag</span>
                  <span>-{formatCurrency(rotDeduction)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-xl font-bold text-gray-800">
                <span>Att betala</span>
                <span>{formatCurrency(finalAmount)}</span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              Giltig till: {new Date(quote.quote_valid_until).toLocaleDateString('sv-SE')}
            </div>
          </div>

          {/* Accept/Reject Section */}
          {!isExpired && !isAlreadyResponded && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Godkänn offert</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skriv ditt namn för att godkänna
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Ditt fullständiga namn"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 text-lg"
                />
              </div>

              <p className="text-sm text-gray-500 mb-6">
                Genom att godkänna bekräftar du att du accepterar offerten och villkoren.
                Du kommer att kontaktas för att boka installation.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={acceptOffer}
                  disabled={submitting || !signatureName.trim()}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Skickar...' : 'Godkänn offert'}
                </button>
                <button
                  onClick={rejectOffer}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Avböj
                </button>
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>Har du frågor? Kontakta oss:</p>
            <p>
              <a href="tel:010-703-74-00" className="text-green-600 hover:text-green-700">
                010 703 74 00
              </a>
              {' • '}
              <a href="mailto:info@intellifoam.se" className="text-green-600 hover:text-green-700">
                info@intellifoam.se
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
