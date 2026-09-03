import Link from 'next/link';
import { getCompanyInfo } from '@/lib/queries';

export default async function Footer() {
  const company = await getCompanyInfo();
  const year = new Date().getFullYear();
  const phone = company?.phone || '010 703 74 00';
  const email = company?.email || 'foam@gronteknik.nu';

  return (
    <footer className="bg-green-900 text-green-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="flex flex-col gap-3">
          <div className="text-lg font-bold text-white">IntelliFoam</div>
          <p className="text-sm leading-relaxed">
            Professionell sprutisolering med slutencellsskum. Vi utgår från Gävle och kommer till dig.
          </p>
          <div className="text-sm flex flex-col gap-1 mt-1">
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-white">{phone}</a>
            <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-white mb-4">Snabblänkar</div>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link href="/tjanster" className="hover:text-white">Tjänster</Link></li>
            <li><Link href="/galleri" className="hover:text-white">Galleri</Link></li>
            <li><Link href="/om-oss" className="hover:text-white">Om oss</Link></li>
            <li><Link href="/faq" className="hover:text-white">Vanliga frågor</Link></li>
            <li><Link href="/kalkylator" className="hover:text-white">Priskalkylator</Link></li>
            <li><Link href="/kontakt" className="hover:text-white">Kontakt</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-white mb-4">Kvalitet &amp; standard</div>
          <ul className="flex flex-col gap-2 text-sm">
            <li>ROT-avdrag 30 % på arbetskostnaden</li>
            <li>Godkänd för F-skatt</li>
            <li>Följer Boverkets byggregler (BBR)</li>
            <li>Vattenblåst skum utan ozonnedbrytande ämnen</li>
            <li>50+ års livslängd</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-green-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-green-200">
          <span>© {year} {company?.company_name || 'Intelliray AB'}. Alla rättigheter förbehållna.</span>
          <span>Drivs av <a href="https://gronteknik.nu" className="hover:text-white underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">Grönteknik</a></span>
        </div>
      </div>
    </footer>
  );
}
