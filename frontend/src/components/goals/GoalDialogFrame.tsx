"use client";

import {
  type FormEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { FOCUS_RING } from "@/lib/focusRing";

const SAVING_LABEL = "Zapisywanie…";

const SECONDARY_BUTTON = `min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-ink hover:bg-slate-100 ${FOCUS_RING}`;

type FrameForm = {
  readonly isSubmitting: boolean;
  readonly submitError: string | null;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type GoalDialogFrameProps = {
  title: string;
  description: string;
  submitLabel: string;
  form: FrameForm;
  onClose: () => void;
  initialFocusRef: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

export function GoalDialogFrame({
  title,
  description,
  submitLabel,
  form,
  onClose,
  initialFocusRef,
  returnFocusRef,
  children,
}: GoalDialogFrameProps) {
  const formId = useId();
  const alertRef = useRef<HTMLDivElement>(null);
  const { submitError } = form;

  // After a failed request the focus moves to the message: it scrolls into view on a low screen
  // and the focus does not stay on the button that was just disabled.
  useEffect(() => {
    if (submitError !== null) {
      alertRef.current?.focus();
    }
  }, [submitError]);

  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
        Anuluj
      </button>
      <button
        type="submit"
        form={formId}
        disabled={form.isSubmitting}
        className={`min-h-11 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:underline disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
      >
        {form.isSubmitting ? SAVING_LABEL : submitLabel}
      </button>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      initialFocusRef={initialFocusRef}
      returnFocusRef={returnFocusRef}
      footer={footer}
    >
      {submitError !== null && (
        <div className="mb-3">
          <Alert variant="error" ref={alertRef}>
            {submitError}
          </Alert>
        </div>
      )}
      <form id={formId} noValidate onSubmit={form.handleSubmit}>
        {children}
      </form>
    </Modal>
  );
}
