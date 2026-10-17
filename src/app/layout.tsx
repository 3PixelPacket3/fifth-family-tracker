import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Fifth Family — Vinciguerra Lupo Cartel Tax & Roster Portal",
  description:
    "Official mobile-first family tax tracker, roster command portal, and treasury ledger for the Vinciguerra Lupo Cartel in The Fifth Family RPG.",
  applicationName: "The Fifth Family",
  manifest: "./manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fifth Family",
  },
  icons: {
    icon: [
      { url: "./icon.svg", type: "image/svg+xml" },
      { url: "./cartel-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "./cartel-logo.png", sizes: "512x512", type: "image/png" }],
  },
  openGraph: {
    title: "The Fifth Family — Vinciguerra Lupo Cartel",
    description:
      "Official Family Tax & Roster Management Portal for The Fifth Family RPG.",
    type: "website",
    images: ["./cartel-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Fifth Family — Vinciguerra Lupo Cartel",
    description:
      "Official Family Tax & Roster Management Portal for The Fifth Family RPG.",
    images: ["./cartel-logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#090a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="./cartel-logo.png" />
      </head>
      <body className="min-h-screen bg-cartel-bg text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
