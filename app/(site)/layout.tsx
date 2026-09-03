import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

// Public marketing site: header + footer. Admin, installer, customer-portal
// and token pages live outside this group and render their own chrome.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  );
}
