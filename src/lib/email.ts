import "server-only";

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n── EMAIL (no RESEND_API_KEY, not sent) ──\nTo: ${to}\nSubject: ${subject}\n\n${text}\n──────────────────────────────────────────\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "MTD Back Office <info@mtdbackoffice.co.uk>", to, subject, text }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
}

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
