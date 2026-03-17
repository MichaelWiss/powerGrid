/*
  GRID STORE — Zustand State Management
  ──────────────────────────────────────
  Central store for live grid state. Components subscribe to slices
  and re-render only when their slice changes.

  The store is populated in two ways:
    1. Initial load: server-fetched data passed into RealtimeProvider
    2. Live updates: Supabase Realtime pushes changes via WebSocket

  CONCEPTS:
  - Zustand stores are plain functions — no providers, no context boilerplate.
  - `set()` merges state shallowly. For nested updates (e.g. a single node
    in an array), we map over the array and replace the matching item.
  - Components select only what they need:
      const freq = useGridStore(s => s.latestSnapshot?.frequency_hz);
    This component only re-renders when frequency_hz changes.

  Usage:
    import { useGridStore } from '@/lib/store';

    // In a component:
    const nodes = useGridStore(s => s.nodes);
    const addAlert = useGridStore(s => s.addAlert);
*/

import { create } from "zustand";
import { MOCK_ALERTS, MOCK_SNAPSHOT } from "./mockData";
import type { MockGenerationNode, MockGridSnapshot, MockAlert } from "./mockData";

// ── Store Shape ──────────────────────────────────────────────────

interface GridState {
  // ── Data ──
  nodes: MockGenerationNode[];
  latestSnapshot: MockGridSnapshot | null;
  alerts: MockAlert[];

  // ── Actions ──

  /** Replace the full node list (used on initial load). */
  setNodes: (nodes: MockGenerationNode[]) => void;

  /** Update a single node by id (used for Realtime UPDATE events). */
  updateNode: (id: string, patch: Partial<MockGenerationNode>) => void;

  /** Set the latest grid snapshot (used for Realtime INSERT events). */
  setSnapshot: (snapshot: MockGridSnapshot) => void;

  /** Add a new alert to the top of the list. */
  addAlert: (alert: MockAlert) => void;

  /** Mark an alert as acknowledged. */
  acknowledgeAlert: (id: string) => void;

  /** Replace the full alerts list (used on initial load). */
  setAlerts: (alerts: MockAlert[]) => void;
}

// ── Store ────────────────────────────────────────────────────────

export const useGridStore = create<GridState>((set) => ({
  // ── Initial state ──
  nodes: [],
  latestSnapshot: MOCK_SNAPSHOT,
  alerts: MOCK_ALERTS,

  // ── Actions ──

  setNodes: (nodes) => set({ nodes }),

  updateNode: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  setSnapshot: (snapshot) => set({ latestSnapshot: snapshot }),

  addAlert: (alert) =>
    set((state) => ({
      // Newest first, cap at 50 to prevent unbounded growth
      alerts: [alert, ...state.alerts].slice(0, 50),
    })),

  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id
          ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
          : a
      ),
    })),

  setAlerts: (alerts) => set({ alerts }),
}));
