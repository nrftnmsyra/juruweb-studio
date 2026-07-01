import { Google_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const googleSans = Google_Sans({
  subsets: ["latin"],
  variable: "--font-google-sans",
  display: "swap",
});

export const metadata = {
  title: "Juruweb Studio - Admin Dashboard",
  description: "Manage client orders, generate quotations, and track payment invoices.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Juruweb",
  },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={googleSans.variable}>
      <body>
        <ServiceWorkerRegister />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: '16px',
              padding: '0.75rem 1rem',
            },
          }}
        />
      </body>
    </html>
  );
}
