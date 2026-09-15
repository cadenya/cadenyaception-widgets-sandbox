import "server-only";
import Cadenya from "@cadenya/cadenya";
import diagramResources from "@/examples/diagram-builder/cadenya/diagram-resources.json";
import chessResources from "@/examples/chessboard/cadenya/chess-resources.json";
import { cookies } from "next/headers";
import { visitorIdentity } from "@/lib/visitor";
import { allowedRequestOrigin } from "@/lib/request-origin";
import { demoVerificationExpiry, verificationExpiry, VERIFICATION_COOKIE } from "@/lib/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };

export async function POST(request: Request) {
  const diagram = new URL(request.url).searchParams.get("experience") === "diagram";
  const chess = new URL(request.url).searchParams.get("experience") === "chess";
  const apiKey = process.env.CADENYA_API_KEY;
  const workspaceId = process.env.CADENYA_WORKSPACE_ID;
  if (!apiKey || !workspaceId) return Response.json({ error: "The portal is missing its Cadenya server configuration." }, { status: 503, headers });
  if (!allowedRequestOrigin(request)) return Response.json({ error: "This origin is not allowed to create sessions." }, { status: 403, headers });
  const jar = await cookies();
  const visitor = visitorIdentity(jar.get("cadenyaception-visitor")?.value, apiKey);
  const verificationSecret = process.env.TURNSTILE_SECRET_KEY;
  const demoExpiry = demoVerificationExpiry(process.env.TURNSTILE_BYPASS_UNTIL);
  if (!demoExpiry && (!verificationSecret || !verificationExpiry(jar.get(VERIFICATION_COOKIE)?.value, visitor.id, verificationSecret))) {
    return Response.json({ error: "Please complete verification to continue.", code: "verification_required" }, { status: 403, headers });
  }
  try {
    const client = new Cadenya({ apiKey, workspaceId });
    const session = await client.widgetSessions.create({
      spec: {
        widgetId: diagram ? diagramResources.widgetId : chess ? chessResources.widgetId : process.env.CADENYA_WIDGET_ID || "external_id:cadenyaception-portal",
        // Tenant and visitor identity scope conversation history for each demo.
        tenant: chess || diagram
          ? { id: "cadenyaception-sandbox", name: "Cadenyaception sandbox" }
          : { id: "cadenya-travel-demo", name: "Travel concierge demo" },
        subject: { id: visitor.id },
        pinnedParameters: { workspaceId },
      },
    });
    if (!session.spec.token || !session.info?.host) throw new Error("Missing widget credentials");
    jar.set("cadenyaception-visitor", visitor.cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return Response.json({ token: session.spec.token, host: session.info.host }, { headers });
  } catch (error) {
    console.error("Widget session mint failed", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "Could not connect to Cadenya. Check the widget configuration and API key permissions, then retry." }, { status: 502, headers });
  }
}
