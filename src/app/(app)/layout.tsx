import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MTD Back Office · Your account", template: "%s · MTD Back Office" },
  description: "Your MTD Back Office portal: tell us about your business and track your setup.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/icon-app.svg" },
};
export const viewport: Viewport = { themeColor: "#2E2A8C" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip" href="#main">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
