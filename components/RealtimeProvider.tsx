/*
  REALTIME PROVIDER
  ─────────────────
  Client Component that hydrates the Zustand store on mount.

  Phase 1 (now):  Seeds the store with mock data from mockData.ts.
  Phase 2 (Iter 5): Subscribes to Supabase Realtime channels and
                     pipes live INSERTs/UPDATEs into the store.

  Wrap this around your page content so every downstream component
  can read live grid state via useGridStore().

  CONCEPTS:
  - The Provider Pattern: a component that manages data lifecycle
    (connect, subscribe, cleanup) so children don't have to.
  - useEffect with empty deps [] = "run once on mount".
  - useRef flag prevents double-hydration in React Strict Mode.
*/

"use client";

import { useEffect, useRef } from "react";
import { useGridStore } from "@/lib/store";
import { MOCK_NODES, MOCK_SNAPSHOT, MOCK_ALERTS } from "@/lib/mockData";

export default function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useRef(false);

  useEffect(() => {
    // Guard against double-hydration in React 18 Strict Mode
    if (hydrated.current) return;
    hydrated.current = true;

    const { setNodes, setSnapshot, setAlerts } = useGridStore.getState();

    // ── Phase 1: Seed store with mock data ──
    setNodes(MOCK_NODES);
    setSnapshot(MOCK_SNAPSHOT);
    setAlerts(MOCK_ALERTS);

    // ── Phase 2 (Iteration 5): Supabase Realtime subscriptions ──
    // const channel = supabaseBrowser
    //   .channel('grid-realtime')
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'grid_snapshots' },
    //     (payload) => setSnapshot(payload.new))
    //   .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'generation_nodes' },
    //     (payload) => updateNode(payload.new.id, payload.new))
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' },
    //     (payload) => addAlert(payload.new))
    //   .subscribe();
    //
    // return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  return <>{children}</>;
}
