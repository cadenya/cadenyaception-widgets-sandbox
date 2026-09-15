# Travel concierge example

A conversational travel planner with destination and itinerary cards, editable trip forms, tool approval, and the browser emoji demo. It uses five [bare tools](https://cadenya.com/docs/guides/the-basics/tool-sets): the page renders their arguments or supplies their results. An optional Faker MCP tool set generates fictional sample data. Travel suggestions use general knowledge; the demo does not search live availability or book travel.

| File                                          | Responsibility                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `travel-concierge.tsx`                        | Compose the conversation list, thread, composer, and tool renderers.                       |
| `use-emoji-tools.ts`, `emoji-panel.tsx`       | Own the browser emoji and its tool bindings; render the emoji controls.                    |
| `travel-tools.ts`                             | Match canonical tool IDs and external IDs in one place.                                    |
| `travel-card.tsx`, `travel-card-schema.ts`    | Validate and display destination, stay, activity, and itinerary cards.                     |
| `schema-form-tool.tsx`, `form-tool-schema.ts` | Validate form arguments and handle editable fields, submission, cancellation, and history. |
| `cadenya/system-prompt.txt`, `cadenya/*.json` | Agent instructions and bare tool contracts; `resources.json` records provisioned IDs.      |
| `setup.mjs`                                   | Provision the example through `../setup-shared.mjs`.                                       |

Conversation creation and tool-result delivery use the [shared example helpers](../README.md). The travel component chooses how each tool is presented; it does not implement transport retries or mutate emoji state itself.

## Setup

Follow the [local setup instructions](../../../README.md#run-locally), then open [/travel-agent](https://widgets-demo.cadenya.com/travel-agent) on the hosted demo or `/travel-agent` on your local server.

To update just this example:

```sh
npm run setup:cadenya
```

Setup synchronizes the five tool definitions, agent prompt, selected model, and optional Faker tool set. It records resource IDs in `cadenya/resources.json`. Start a new conversation to use updated configuration; each [objective](https://cadenya.com/docs/guides/the-basics/objectives) captures its agent configuration when created.

## Travel cards

Try **Show me three relaxing weekend destinations**. `display_travel_card` takes `title`, `kind` (`destination`, `activity`, `stay`, or `itinerary`), `location`, `description`, up to 30 `highlights`, `timing`, and `budget`. Unknown timing and budget can be empty strings. Budgets are rough estimates with currency and a clear basis, never live quotes.

The bare tool uses `alwaysSetResult` to acknowledge presentation immediately. Its argument exposure overlay lets the widget render cards from timeline `args`. Cards persist after the assistant finishes and on history reload. Matching accepts either the tool external ID or canonical ID. Cards label their content as planning inspiration; no reservation is made.

## Trip forms

Choose **Plan my trip using a form**. `display_form` supplies a JSON Schema for destination, days, travelers, budget style, and interests. Edit the values before submitting. The callback sends a result through [`setToolCallContent`](https://cadenya.com/docs/api-reference/objectiveservice/set-a-bare-tool-calls-content), then the agent builds tailored suggestions. For example:

```json
{
  "status": "submitted",
  "data": { "destination": "Lisbon", "days": 3 }
}
```

Cancel returns `{"status": "cancelled"}` and stops the plan. Forms collect preferences only.

The renderer supports object schemas, nested fields, enums, and arrays. Invalid schemas stay contained in the form card and can be cancelled. Completed forms cannot be resubmitted. Failed submissions preserve edited values and allow retry. Arguments that arrive after the initial tool event initialize the form when they become valid. The immediate confirmation distinguishes submission from cancellation. Reloaded forms show a generic completion message unless widget history exposes the result content; the current setup exposes arguments only. Reloading an unsubmitted form restores suggested values, not unsaved edits.

## Tool approval demo

Ask **Run the approval demo**. The `approval_demo` tool uses `requiresApproval: true` and the library's `ToolActivity` UI. Approve returns a fixed acknowledgment; deny is acknowledged without retrying. This is a harmless UI demonstration, not a purchase or reservation.

## Frontend emoji tools

The emoji stays in browser state. **Shuffle Emoji** changes it locally; **Ask about this emoji** calls `read_frontend_emoji`, and **Ask the agent to shuffle** calls `shuffle_frontend_emoji`. The page supplies the captured result through `setToolCallContent`. Both shuffle paths choose a different emoji. Result-delivery retries reuse the captured value without shuffling again. History is ignored by the active-call handler, and calls are tracked by ID to avoid duplicate submissions.

Try **Suggest a trip inspired by my page emoji** to combine live browser state with travel cards. The agent reads the emoji before suggesting a destination. Reloading resets local emoji state while completed conversations retain their responses.

## Fictional demo data

With the [optional Faker integration](../../../README.md#optional-sample-data) configured, try **Generate three fake traveler profiles and show a weekend itinerary card for each**. The agent discovers relevant Faker options, generates at most six records, and clearly labels the data as fictional. Faker does not provide live travel availability or bookings.
