import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import CookieBanner from "./cookie-banner";
import MaintenanceBanner from "./maintenance-banner";

export const metadata: Metadata = {
  title: "Eurosnap",
  description: "Get notified when Eurostar Snap deals become available for your dates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head></head>
      <body className="antialiased min-h-screen">
        <Providers>
          <MaintenanceBanner />
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
