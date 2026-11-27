import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = { title: "Thank you · MTD Back Office", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <div className="container page">
          <h1>Thank you. Your payment went through.</h1>
          <p className="lead">We&#39;ve emailed you a link to create your account and choose a password. It usually arrives within a minute.</p>
          <ol>
            <li>Open the email from MTD Back Office (check your spam folder if it&#39;s not there).</li>
            <li>Click the link and choose a password.</li>
            <li>Fill in your business details in your dashboard and we&#39;ll get started.</li>
          </ol>
          <div className="actions-row">
            <a className="btn btn--primary btn--md" href="/activate">Didn&#39;t get the email? Send it again</a>
            <a className="text-link" href="/login">Already set a password? Log in</a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
