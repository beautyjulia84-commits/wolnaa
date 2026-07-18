import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passwort festlegen · WOLNAA Admin",
  manifest: "/admin-manifest.webmanifest",
  icons: { icon: "/pwa/admin-192.png", apple: "/pwa/admin-192.png" },
  robots: { index: false, follow: false },
};

export default function AdminPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
