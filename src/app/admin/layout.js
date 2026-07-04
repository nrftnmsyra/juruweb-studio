import DashboardShell from "@/components/DashboardShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

// PWA is scoped to the admin dashboard only (the public landing page is not a PWA).
export const metadata = {
  title: "Juruweb Studio - Admin Dashboard",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Juruweb",
  },
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function DashboardLayout({ children }) {
  return (
    <>
      <ServiceWorkerRegister />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
