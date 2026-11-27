import type { Metadata, Viewport } from "next";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./site.css";
import { SiteScripts } from "@/components/site/SiteScripts";

export const metadata: Metadata = {
  metadataBase: new URL("https://mtdbackoffice.co.uk"),
  icons: {
    icon: [{ url: "/brand/icon-app.svg", type: "image/svg+xml" }, { url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};
export const viewport: Viewport = { themeColor: "#2E2A8C" };

const ld = JSON.stringify({
  "@context": "https://schema.org", "@type": "ProfessionalService", name: "MTD Back Office",
  url: "https://mtdbackoffice.co.uk", email: "info@mtdbackoffice.co.uk", areaServed: "GB", priceRange: "££",
});

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js');" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      </head>
      <body>
        {children}
        <SiteScripts />
      </body>
    </html>
  );
}
