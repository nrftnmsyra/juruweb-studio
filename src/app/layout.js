import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

// Variable font, so one file covers 200 to 900 and every weight the dashboard
// uses costs nothing extra.
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata = {
  title: "Juruweb Studio",
  description: "Affordable websites for Malaysian SMEs.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={sourceSans.variable}>
      <body>
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
