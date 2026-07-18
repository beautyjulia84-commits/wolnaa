import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";
import VeranstalterPortalLayout from "@/components/veranstalter/PortalLayout";

export const metadata: Metadata = {
  title: "WOLNAA Veranstalter",
  description: "Events, Ticketverkäufe und Check-in für WOLNAA Veranstalter.",
  applicationName: "WOLNAA Veranstalter",
  manifest: "/veranstalter-manifest.webmanifest",
  icons: {
    icon: "/pwa/veranstalter-192.png",
    apple: "/pwa/veranstalter-192.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function VeranstalterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaRegister worker="/veranstalter-sw.js" scope="/veranstalter/" />
      <VeranstalterPortalLayout>{children}</VeranstalterPortalLayout>
    </>
  );
}
