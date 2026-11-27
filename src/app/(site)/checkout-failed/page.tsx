import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = { title: "Checkout unavailable · MTD Back Office", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <div className="container page">
          <h1>We couldn&#39;t start checkout</h1>
          <p className="lead">Nothing has been charged. Please try again in a moment.</p>
          <p>If it keeps happening, email <a href="mailto:info@mtdbackoffice.co.uk">info@mtdbackoffice.co.uk</a> and we&#39;ll sort it out.</p>
          <div className="actions-row"><a className="btn btn--primary btn--md" href="/#prices">Back to prices</a></div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
