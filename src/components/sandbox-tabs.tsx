"use client";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ConversationPortal } from "./conversation-portal";
import { ArrowIcon } from "./brand";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
const ChessGame = dynamic(() => import("@/examples/chessboard/chess-game").then(module => module.ChessGame), { ssr: false, loading: () => <p>Loading chessboard…</p> });
const DiagramBuilder = dynamic(() => import("@/examples/diagram-builder/diagram-builder").then(module => module.DiagramBuilder), { ssr: false, loading: () => <p>Loading diagram canvas…</p> });

type DemoId = "conversation" | "chess" | "diagram";
const REPO = "https://github.com/cadenya/cadenyaception-widgets-sandbox/tree/main/src/examples/";
const ROUTES: Record<DemoId, string> = { conversation: "/travel-agent", chess: "/chess", diagram: "/diagram-builder" };
const SOURCE: Record<DemoId, string> = { conversation: "conversation", chess: "chessboard", diagram: "diagram-builder" };

export function SandboxTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const demo: DemoId = pathname === ROUTES.chess ? "chess" : pathname === ROUTES.diagram ? "diagram" : "conversation";
  const [opened, setOpened] = useState<DemoId[]>([demo]);
  // Record route visits, including direct links and browser back/forward navigation.
  if (!opened.includes(demo)) setOpened([...opened, demo]);

  return <Tabs value={demo} onValueChange={value => router.push(ROUTES[value as DemoId], { scroll: false })}>
    <div className="tabs-row">
      <TabsList aria-label="Sandbox demos"><TabsTrigger value="conversation">Travel Concierge</TabsTrigger><TabsTrigger value="chess">Chessboard</TabsTrigger><TabsTrigger value="diagram">Diagram Builder</TabsTrigger></TabsList>
      <a className="source-link type-nav" aria-label="View example code" href={REPO + SOURCE[demo]} target="_blank" rel="noreferrer"><span className="nav-hide-mobile">View example code</span><ArrowIcon /></a>
    </div>
    <TabsContent value="conversation" keepMounted><ConversationPortal /></TabsContent>
    <TabsContent value="chess" keepMounted>{opened.includes("chess") && <ConversationPortal experience="chess"><ChessGame /></ConversationPortal>}</TabsContent>
    <TabsContent value="diagram" keepMounted>{opened.includes("diagram") && <ConversationPortal experience="diagram"><DiagramBuilder /></ConversationPortal>}</TabsContent>
  </Tabs>;
}
