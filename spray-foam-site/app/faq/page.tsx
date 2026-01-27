import { getAllFAQs } from '@/lib/queries';

export const metadata = {
  title: 'Vanliga Frågor om sprutisolering | Intellifoam',
  description: 'Få svar på de vanligaste frågorna om sprutisolering, installation, kostnader och miljöpåverkan.',
};

export default async function FAQPage() {
  const faqs = await getAllFAQs();

  // Group FAQs by category
  const categories = Array.from(new Set(faqs.map(faq => faq.category).filter(Boolean)));

  return (
    <div className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
            Vanliga Frågor
          </h1>
          <p className="text-xl text-center text-gray-900 mb-12">
            Här hittar du svar på de vanligaste frågorna om sprutisolering
          </p>

          {/* All FAQs */}
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-3 text-gray-800">
                  {faq.question}
                </h3>
                <p className="text-gray-900 leading-relaxed">
                  {faq.answer}
                </p>
                {faq.category && (
                  <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                    {faq.category}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 bg-green-700 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">
              Hittade du inte svaret på din fråga?
            </h2>
            <p className="text-green-100 mb-6">
              Kontakta oss så hjälper vi dig gärna!
            </p>
            <a
              href="/kontakt"
              className="inline-block bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition"
            >
              Kontakta Oss
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
