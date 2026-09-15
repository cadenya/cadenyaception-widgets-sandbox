"use client";
// Adapted from shadcn/ui's Base UI Tabs (base-nova), with the sandbox's CSS theme.
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
export function Tabs(props: TabsPrimitive.Root.Props) { return <TabsPrimitive.Root data-slot="tabs" {...props} />; }
export function TabsList(props: TabsPrimitive.List.Props) { return <TabsPrimitive.List data-slot="tabs-list" {...props} />; }
export function TabsTrigger(props: TabsPrimitive.Tab.Props) { return <TabsPrimitive.Tab data-slot="tabs-trigger" {...props} />; }
export function TabsContent(props: TabsPrimitive.Panel.Props) { return <TabsPrimitive.Panel data-slot="tabs-content" {...props} />; }
