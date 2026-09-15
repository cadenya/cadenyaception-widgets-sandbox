"use client";

import { Component, useRef, useState, type ReactNode } from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { ToolItem } from "@cadenya/widgets-ui-react";
import { useMountedRef } from "../shared/use-mounted-ref";
import type { SubmitToolResult } from "../shared/tool-result-queue";
import {
  formToolArgumentsSchema,
  readFormDecision,
  type FormDecision,
  type FormToolArguments,
} from "./form-tool-schema";

type FormBoundaryProps = { children: ReactNode };
class FormBoundary extends Component<FormBoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <p role="alert">
          This form schema could not be displayed. Cancel it and ask the agent for a simpler form.
        </p>
      );
    return this.props.children;
  }
}

type FormFieldsProps = {
  args: FormToolArguments;
  toolCallId: string;
  enabled: boolean;
  sending: boolean;
  onSubmit: (data: unknown) => Promise<void>;
};

function FormFields({ args, toolCallId, enabled, sending, onSubmit }: FormFieldsProps) {
  // Mount only after valid arguments arrive. Later renders preserve the visitor's edits.
  const [data, setData] = useState(args.formData);
  return (
    <Form
      schema={args.schema}
      uiSchema={{ ...args.uiSchema, "ui:submitButtonOptions": { norender: true } }}
      validator={validator}
      formData={data}
      idPrefix={toolCallId}
      disabled={!enabled}
      onChange={(event) => setData(event.formData ?? {})}
      onSubmit={(event) => {
        void onSubmit(event.formData);
      }}
    >
      <button type="submit" disabled={!enabled}>
        {sending ? "Sending…" : args.submitLabel || "Submit to agent"}
      </button>
    </Form>
  );
}

type SchemaFormToolProps = { item: ToolItem; active: boolean; submit: SubmitToolResult };

export function SchemaFormTool({ item, active, submit }: SchemaFormToolProps) {
  const parsed = formToolArgumentsSchema.safeParse(item.args);
  const args = parsed.success ? parsed.data : null;
  const [decision, setDecision] = useState<FormDecision | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useMountedRef();
  const completedDecision = decision ?? readFormDecision(item.content);
  const completed = item.status === "done" || completedDecision !== null;
  const enabled = active && item.status === "running" && !completed && !sending;

  async function respond(status: FormDecision, formData?: unknown) {
    if (locked.current || !enabled) return;
    locked.current = true;
    setSending(true);
    setError(null);
    try {
      const response = status === "submitted" ? { status, data: formData } : { status };
      await submit(item.toolCallId, JSON.stringify(response));
      if (mounted.current) setDecision(status);
    } catch {
      locked.current = false;
      if (mounted.current) setError("Your response could not be sent. Please try again.");
    } finally {
      if (mounted.current) setSending(false);
    }
  }

  return (
    <article className="schema-form-card" aria-label={args?.title || "Form"}>
      <span className="emoji-eyebrow">{completed ? "FORM RESPONSE SENT" : "YOUR INPUT"}</span>
      <h2>{args?.title || "Complete this form"}</h2>
      {args?.description && <p>{args.description}</p>}
      {completed ? (
        <p role="status">
          {completedDecision === "cancelled"
            ? "Cancelled. No form data was submitted."
            : "Response sent to the agent. See the conversation for the outcome."}
        </p>
      ) : (
        <>
          <FormBoundary>
            {args ? (
              <FormFields
                args={args}
                toolCallId={item.toolCallId}
                enabled={enabled}
                sending={sending}
                onSubmit={(data) => respond("submitted", data)}
              />
            ) : (
              <p role="alert">
                The tool did not provide a valid object schema. Cancel and ask it to try again.
              </p>
            )}
          </FormBoundary>
          <button
            className="form-cancel"
            type="button"
            disabled={!enabled}
            onClick={() => {
              void respond("cancelled");
            }}
          >
            Cancel
          </button>
          {!active && <p>This form is no longer waiting for input.</p>}
        </>
      )}
      {sending && <p role="status">Sending your response…</p>}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
