import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { indexable, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service · MTD Back Office",
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <SiteHeader />
      <main id="main" tabIndex={-1}><div className="container page"><h1>Terms of service</h1><div className="placeholder"><p><strong>[terms of service]</strong></p><p>The full terms will be supplied by the owner and added here before launch. Our services cover software and records setup and admin automation. They do not include tax advice or filing; your accountant handles the tax.</p></div></div></main>
      <SiteFooter />
    </>
  );
}
