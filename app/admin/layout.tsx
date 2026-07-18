import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "WOLNAA Admin",
  description: "Administration, Events, Tickets und Check-in für WOLNAA.",
  applicationName: "WOLNAA Admin",
  manifest: "/admin-manifest.webmanifest",
  icons: {
    icon: "/pwa/admin-192.png",
    apple: "/pwa/admin-192.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#d6b36a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <><PwaRegister worker="/admin-sw.js" scope="/admin/" />{children}</>;
}
