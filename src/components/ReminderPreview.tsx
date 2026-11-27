"use client";
import { useState } from "react";

const tones = {
  friendly: (n: string, d: number) => `Hi Sam,\n\nJust a quick nudge: invoice INV-0042 for £480.00 was due ${d} days ago. If it's already on its way, thank you!`,
  neutral: (n: string, d: number) => `Hello Sam,\n\nInvoice INV-0042 for £480.00 is now ${d} days overdue. Please arrange payment using the details below.`,
  firm: (n: string, d: number) => `Dear Sam,\n\nInvoice INV-0042 for £480.00 is ${d} days overdue. Please pay today, or contact us if there's a problem.`,
} as const;

export function ReminderPreview() {
  // Reads live values from the surrounding form
  const [, force] = useState(0);
  const get = (n: string) => (document.querySelector<HTMLInputElement>(`[name=${n}]`)?.value ?? "");
  const tone = (get("reminderTone") || "friendly") as keyof typeof tones;
  const name = get("displayName") || "Your business";
  const days = Number(get("remind1")) || 3;
  const pay = get("paymentLink") ? `\n\nPay online: ${get("paymentLink")}` : get("sortCode") ? `\n\nBank transfer: ${get("accountName") || name}, sort code ${get("sortCode")}, account ${get("accountNumber")}` : "";
  const text = `From: ${name}${get("replyToEmail") ? ` <${get("replyToEmail")}>` : ""}\nSubject: Friendly reminder: invoice INV-0042\n\n${tones[tone](name, days)}${pay}\n\n${get("signature") || name}`;
  return (
    <div onChange={() => force((n) => n + 1)} onInput={() => force((n) => n + 1)}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => force((n) => n + 1)}>Refresh preview</button>
      <div className="preview" style={{ marginTop: 12 }} aria-live="polite">{text}</div>
    </div>
  );
}
