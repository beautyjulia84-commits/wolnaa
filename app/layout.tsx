import type { Metadata, Viewport } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import "./globals.css";

// ─── Fonts ────────────────────────────────────────────────────────────────────

/** Display-Font für Headlines */
const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

/** Body-Font für Fließtext & UI */
const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "WOLNAA – Exclusive Events",
    template: "%s · WOLNAA",
  },
  description:
    "Exclusive Events, Russische Vibes & unvergessliche Nächte. Entdecke Premium-Events von WOLNAA.",
  keywords: ["WOLNAA", "Events", "Party", "VIP", "Nightlife", "Exclusive"],
  authors: [{ name: "WOLNAA" }],
  creator: "WOLNAA",

  // Open Graph (Social Sharing)
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "WOLNAA",
    title: "WOLNAA – Exclusive Events",
    description:
      "Exclusive Events, Russische Vibes & unvergessliche Nächte.",
    images: [
      {
        url: "/og-image.png",  // 1200×630 px Bild hinterlegen
        width: 1200,
        height: 630,
        alt: "WOLNAA – Exclusive Events",
      },
    ],
  },

  // Twitter / X Card
  twitter: {
    card: "summary_large_image",
    title: "WOLNAA – Exclusive Events",
    description: "Exclusive Events, Russische Vibes & unvergessliche Nächte.",
    images: ["/og-image.png"],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
  },

  // Favicon / Icons
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// ─── Viewport (getrennt von metadata – Next.js 14+ Best Practice) ─────────────

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${bebasNeue.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}
