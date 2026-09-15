import resources from "./cadenya/resources.json";
import type { ToolIdentity } from "../shared/use-tool-results";

/** Match widget tool events by canonical ID or external ID. */
export const TRAVEL_TOOLS = {
  form: { id: resources.displayFormToolId, externalId: "display_form" },
  card: { id: resources.displayTravelCardToolId, externalId: "display_travel_card" },
  readEmoji: { id: resources.frontendEmojiToolId, externalId: "read_frontend_emoji" },
  shuffleEmoji: { id: resources.shuffleFrontendEmojiToolId, externalId: "shuffle_frontend_emoji" },
} satisfies Record<string, ToolIdentity>;
