"use client";
import { useActionState, useRef, useTransition, type FormEvent, type ReactNode } from "react";
import type { FormState } from "@/lib/form";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

export function Form({ action, children, submit = "Save", className, reset, buttonClass = "btn btn-primary" }: {
  action: Action; children: ReactNode; submit?: string; className?: string; reset?: boolean; buttonClass?: string;
}) {
  // We call the action from onSubmit (not the form `action` prop) so React 19 does not
  // wipe the user's input after a validation error. "Add" forms clear themselves on success.
  const ref = useRef<HTMLFormElement>(null);
  const [state, run] = useActionState((prev: FormState, fd: FormData) => action(prev, fd), undefined);
  const [pending, start] = useTransition();
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await run(fd);
      if (reset) queueMicrotask(() => ref.current?.reset());
    });
  }
  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      {state?.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {state?.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      {children}
      <button className={buttonClass} disabled={pending}>{pending ? "Working…" : submit}</button>
    </form>
  );
}

export function Field({ label, name, hint, children, ...rest }: {
  label: string; name: string; hint?: string; children?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {hint && <span className="hint" id={`${name}-h`}>{hint}</span>}
      {children ?? <input id={name} name={name} aria-describedby={hint ? `${name}-h` : undefined} {...rest} />}
    </div>
  );
}
