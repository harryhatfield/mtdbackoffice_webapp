"use client";
import { useState } from "react";
import { revealSensitive } from "@/app/actions/admin";
export function RevealSensitive({ userId, utr, ni }: { userId: string; utr: string; ni: string }) {
  const [v, setV] = useState<{ utr: string; ni: string } | null>(null);
  return (
    <p>UTR <strong>{v ? v.utr || "—" : utr || "—"}</strong> · NI <strong>{v ? v.ni || "—" : ni || "—"}</strong>{" "}
      {!v && (utr || ni) && <button className="link-btn" onClick={async () => setV(await revealSensitive(userId))}>Reveal (logged)</button>}</p>
  );
}
