import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sprutisolering som sänker dina energikostnader | IntelliFoam",
  description:
    "Professionell sprutisolering med slutencellsskum för villor, krypgrunder, vindar och kommersiella byggnader. Vi utgår från Gävle och kommer till dig. Räkna ut ditt pris direkt.",
  icons: { icon: "/intellifoam-logo_bookmark.png", apple: "/intellifoam-logo_bookmark.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col min-h-screen`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
