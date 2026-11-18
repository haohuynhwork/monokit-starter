import { type FormEvent, startTransition } from "react";

// `<form action={...}>` resets uncontrolled inputs after every submit, so a
// failed save would wipe what was typed next to its field errors. Use
// `onSubmit={submitKeepingValues(action)}` instead: same action, no reset.
export function submitKeepingValues(action: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => action(data));
  };
}
