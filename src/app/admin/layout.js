import DashboardShell from "@/components/DashboardShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getCurrentAdmin } from "@/lib/supabaseServer";

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

export default async function DashboardLayout({ children }) {
  // Resolved on the server so the nav can hide owner-only links. The pages
  // themselves re-check, and RLS is the real gate.
  const admin = await getCurrentAdmin();

  return (
    <>
      <ServiceWorkerRegister />
      <DashboardShell admin={admin}>{children}</DashboardShell>
    </>
  );
}
