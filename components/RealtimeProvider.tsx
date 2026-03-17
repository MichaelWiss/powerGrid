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
import { MOCK_NODES, type MockGenerationNode } from "@/lib/mockData";

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

    const { setNodes } = useGridStore.getState();

    const controller = new AbortController();
    const loadNodes = async () => {
      try {
        const res = await fetch("/api/grid-nodes", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as MockGenerationNode[];
        if (Array.isArray(data) && data.length > 0) {
          setNodes(data);
          return;
        }
      } catch {
        // Fall through to compact local fallback.
      }

      setNodes(MOCK_NODES);
    };

    void loadNodes();

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
    return () => controller.abort();
  }, []);

  return <>{children}</>;
}
