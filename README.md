# Cadenya Widgets Demo

Three examples of AI agents working with an interactive React interface: plan a trip, play chess, or build a diagram.

[Cadenya](https://cadenya.com) runs agents and their tools. This Next.js app uses [`@cadenya/widgets-ui-react`](https://github.com/cadenya/widgets-ui-react) to connect those agents to conversations and browser state. A **bare tool** is a tool whose result your application supplies, such as reading a chessboard or submitting a form. Learn more in the [Cadenya documentation](https://cadenya.com/docs).

## Try the demos

| Example          | Live demo                                                            | What it shows                                                                          | Source guide                                            |
| ---------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Travel concierge | [/travel-agent](https://widgets-demo.cadenya.com/travel-agent)       | Travel cards, editable forms, tool approval, and tools that read and change page state | [Travel guide](src/examples/conversation/README.md)     |
| Chess            | [/chess](https://widgets-demo.cadenya.com/chess)                     | An agent playing Black against a board you control                                     | [Chess guide](src/examples/chessboard/README.md)        |
| Diagram builder  | [/diagram-builder](https://widgets-demo.cadenya.com/diagram-builder) | An agent reading and editing a React Flow canvas                                       | [Diagram guide](src/examples/diagram-builder/README.md) |

Switching examples updates the URL and preserves each demo's state. Reloading resets local boards and diagrams. Travel suggestions are planning inspiration; the demo does not search live availability or make bookings.

## Run locally

### Prerequisites

- Node.js 22.12 or later and npm.
- A [Cadenya account](https://app.cadenya.com/signup), workspace, and API key.
- The `cadenya` CLI installed and configured for that workspace. See the [Cadenya documentation](https://cadenya.com/docs) for API access and tooling.
- An AI provider key configured in Cadenya and an enabled model that supports tool calling. Provider credentials stay in Cadenya. See [AI provider keys](https://cadenya.com/docs/api-reference/aiproviderkeyservice/create-a-new-ai-provider-key) and [models](https://cadenya.com/docs/api-reference/modelservice/list-models).
- Cloudflare Turnstile site and secret keys for a Managed widget that allows `localhost`.

### Install and configure

```sh
npm ci
cp .env.example .env
```

Fill in these values in `.env`:

```dotenv
CADENYA_API_KEY=your-cadenya-api-key
CADENYA_WORKSPACE_ID=your-workspace-id
CADENYA_MODEL_ID=your-enabled-model-id
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

Find available models with the CLI:

```sh
cadenya models list --include-info --display json
```

Use the selected model's canonical ID for `CADENYA_MODEL_ID`. The API key needs permission to create and configure agents, tools, and widgets, and to create widget sessions. `.env.example` describes the optional settings; `.env` is ignored by Git.

### Create the agents and start the app

```sh
npm run setup:all
npm run dev
```

Open [localhost:3000](http://localhost:3000). Setup creates the agents, tool definitions, and widgets in your workspace and writes their IDs into each example's `cadenya/*resources.json`. The checked-in resource files describe the hosted demo; run setup for your own workspace before using the app.

You can run `npm run setup:cadenya`, `npm run setup:chess`, or `npm run setup:diagram` individually. Run the travel setup first because the other examples read its widget origins.

Setup can be rerun: it updates prompts, tool definitions, and the selected model while reusing resources with matching external IDs. Each demo's tool assignments are synchronized to its setup script. An empty `CADENYA_MODEL_ID` preserves an existing variation's model; a new variation requires a model. Start a new conversation, game, or diagram after changing agent configuration.

For macOS file-watcher limits, use `npm run dev:poll`.

### Optional sample data

Travel and diagram agents can use a Faker MCP tool set for fictional sample data. Connect a Faker tool set in your workspace, set `CADENYA_FAKER_TOOL_SET_ID` in `.env` to its ID, and rerun setup. It should expose `GetFakerOptions`, `GenerateFake`, and `GenerateCurseWord`. Without this setting, setup assigns only the examples' bare tools. See the [tool sets guide](https://cadenya.com/docs/guides/the-basics/tool-sets) for connecting MCP servers.

## How it works

1. The server creates a short-lived widget session using the Cadenya API key.
2. The browser receives the session token and widget host, then connects through `CadenyaWidgetProvider`.
3. Agents call tools to display UI or request changes to browser state. The page validates those requests and returns results through the widget library.

The API key stays on the server. A signed visitor cookie scopes conversation history to each browser. See the [widgets guide](https://cadenya.com/docs/guides/the-basics/widgets), [widget session API](https://cadenya.com/docs/api-reference/widgetsessionservice/create-a-widget-session), and [bare tool result API](https://cadenya.com/docs/api-reference/objectiveservice/set-a-bare-tool-calls-content) for the underlying contracts.

## Repository layout

```text
src/
  app/                 Example routes, shared layout, styles, and API routes
  components/          Shared navigation, branding, and widget provider
  lib/                 Visitor identity, request validation, and message helpers
  examples/
    conversation/      Travel cards, forms, approval, and page-state tools
    chessboard/        Chess UI, rules, and agent tools
    diagram-builder/   React Flow canvas and diagram tools
    shared/            Conversation lifecycle and tool-result delivery
    setup-shared.mjs   Shared Cadenya setup helpers
scripts/               UI library packaging utility
vendor/                Packaged UI library and source commit manifest
```

Each example includes React components, tool definitions, an agent prompt, a setup script, and tests. Read the [example architecture guide](src/examples/README.md) to extend an example or add a tool.

The widget library is installed from the archive in `vendor/`; `npm ci` uses it automatically. Its source repository, commits, and version are recorded in [the source manifest](vendor/widgets-ui-react-source.json). To package another source branch:

```sh
npm run update:widgets -- main
```

The utility tests and builds the library, packages it, and updates the dependency and source manifest. Include the resulting archive, manifest, and npm dependency files together when sharing a dependency update.

## Deploy

Deploy as a Next.js app with the environment values from `.env.example`. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` before building; the remaining credentials are server-side settings.

For your domain, configure `CADENYA_ALLOWED_ORIGINS` with the exact HTTPS origin and `TURNSTILE_HOSTNAMES` with the hostname. Allow that hostname in Cloudflare Turnstile, then update the Cadenya widgets:

```sh
CADENYA_ALLOWED_ORIGINS=https://your-demo.example.com npm run setup:all
```

Include the generated resource files when building the deployment. Setup merges origins with existing widget entries. Each preview origin must be added explicitly; widget origin allowlists do not accept wildcards. See the [widgets guide](https://cadenya.com/docs/guides/the-basics/widgets) for origin configuration.

## Development checks

```sh
npm run format
npm run format:check
npm test
npm run typecheck
npm run build
```

Tests live next to the code they cover. Node tests cover domain rules and server helpers; Vitest and jsdom cover React hooks and forms.
