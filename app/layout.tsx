import type { Metadata, Viewport } from "next";
import Script from "next/script";
import AnalyticsTracker from "@/components/AnalyticsTracker";
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
    icon: "/favicon.png",
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
      <head>
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
              ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
              ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
              for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
              ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
              ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";
              ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
              ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;
              n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('D8EUGFJC77UDG683JFB0');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col text-white">
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
