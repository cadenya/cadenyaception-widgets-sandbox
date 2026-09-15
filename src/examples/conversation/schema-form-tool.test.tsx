import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { ToolItem } from "@cadenya/widgets-ui-react";
import { SchemaFormTool } from "./schema-form-tool";

afterEach(cleanup);
const item: ToolItem = {
  kind: "tool",
  id: "form-event",
  toolCallId: "form-call",
  status: "running",
  createdAt: "2026-09-14T12:00:00Z",
};
const args = {
  title: "Trip preferences",
  schema: { type: "object", properties: { destination: { type: "string", title: "Destination" } } },
  formData: { destination: "Lisbon" },
};

test("late form arguments initialize fields; delivery failure preserves edits for retry", async () => {
  const submit = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(undefined);
  const view = render(<SchemaFormTool item={item} active submit={submit} />);
  view.rerender(<SchemaFormTool item={{ ...item, args }} active submit={submit} />);
  const field = view.getByRole("textbox", { name: "Destination" });
  expect((field as HTMLInputElement).value).toBe("Lisbon");
  fireEvent.change(field, { target: { value: "Porto" } });
  fireEvent.click(view.getByRole("button", { name: "Submit to agent" }));
  await waitFor(() => expect(view.getByRole("alert").textContent).toContain("could not be sent"));
  expect((field as HTMLInputElement).value).toBe("Porto");
  fireEvent.click(view.getByRole("button", { name: "Submit to agent" }));
  await waitFor(() => expect(view.getByRole("status").textContent).toContain("Response sent"));
  expect(submit).toHaveBeenCalledTimes(2);
  expect(submit).toHaveBeenLastCalledWith(
    "form-call",
    JSON.stringify({ status: "submitted", data: { destination: "Porto" } }),
  );
});

test("cancelled history is labeled accurately and cannot be submitted again", () => {
  const submit = vi.fn();
  const view = render(
    <SchemaFormTool
      item={{ ...item, args, status: "done", content: '{"status":"cancelled"}' }}
      active={false}
      submit={submit}
    />,
  );
  expect(view.getByRole("status").textContent).toBe("Cancelled. No form data was submitted.");
  expect(view.queryByRole("button")).toBeNull();
  expect(submit).not.toHaveBeenCalled();
});
