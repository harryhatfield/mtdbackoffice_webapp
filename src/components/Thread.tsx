"use client";
import { Form } from "./Form";
import type { FormState } from "@/lib/form";

export type Msg = { id: string; fromStaff: boolean; body: string; createdAt: string };
export function Thread({ messages, reply, staff }: { messages: Msg[]; reply: (s: FormState, fd: FormData) => Promise<FormState>; staff?: boolean }) {
  return (
    <div>
      {messages.map((m) => (
        <div key={m.id} className={`msg ${m.fromStaff ? "staff" : ""}`}>
          <div className="small muted">{m.fromStaff ? "MTD Back Office" : "You"} · {new Date(m.createdAt).toLocaleString("en-GB")}</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
        </div>
      ))}
      <Form action={reply} submit="Send reply" reset>
        <div className="field"><label htmlFor="body">Your reply</label><textarea id="body" name="body" required /></div>
        {staff && <label className="check" style={{ marginBottom: 16 }}><input type="checkbox" name="close" /> Mark as resolved</label>}
      </Form>
    </div>
  );
}
