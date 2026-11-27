import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { indexable, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy notice · MTD Back Office",
  alternates: { canonical: `${SITE_URL}/privacy` },
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <SiteHeader />
      <main id="main" tabIndex={-1}><div className="container page"><h1>Privacy notice</h1><div className="placeholder"><p><strong>[privacy notice]</strong></p><p>The full UK GDPR privacy notice will be supplied by the owner and added here before launch.</p></div></div></main>
      <SiteFooter />
    </>
  );
}
