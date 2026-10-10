import type { Metadata } from "next";
import { Barlow_Condensed, Public_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
});
const body = Public_Sans({ subsets: ["latin"], variable: "--font-public" });

export const metadata: Metadata = {
  title: "DigOnce: one road, dug once",
  description: "Public works transparency and coordination platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}