"use client";

import { createContext, useActionState, useCallback, useContext, useTransition } from "react";

/**
 * Forms that keep what the person typed.
 *
 * React clears a form after every server-action submission, including ones that
 * fail validation, which wipes a half-filled form on a single typo. These helpers
 * submit the same server action from an onSubmit handler instead, so nothing is
 * cleared unless a form chooses to reset itself after success.
 */
const PendingContext = createContext<boolean | null>(null);

export type FormHandle = {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
};

export function useFormAction<State>(
  action: (state: Awaited<State>, payload: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
): [Awaited<State>, FormHandle] {
  const [state, dispatch, pending] = useActionState(action, initialState);
  const [, startTransition] = useTransition();
  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const submitter = (event.nativeEvent as SubmitEvent).submitter;
      const data = new FormData(event.currentTarget, submitter);
      startTransition(() => dispatch(data));
    },
    [dispatch],
  );
  return [state, { onSubmit, pending }];
}

export function Form({ form, children, ...props }: Omit<React.ComponentProps<"form">, "onSubmit" | "action"> & { form: FormHandle }) {
  return (
    <PendingContext value={form.pending}>
      <form onSubmit={form.onSubmit} {...props}>
        {children}
      </form>
    </PendingContext>
  );
}

/** Whether the enclosing <Form> is submitting (null outside one). */
export function useFormPending(): boolean | null {
  return useContext(PendingContext);
}
