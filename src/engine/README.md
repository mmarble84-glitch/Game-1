# /src/engine — PURE game logic

Deterministic, side-effect-free functions only. No React, no rendering, no
timers, no I/O. Everything here is unit-testable in isolation.

Planned modules (added in later phases):

- `economy.ts` — turn resolution (runs ONLY on an "Advance Turn" click).
- `combat.ts` — the chance-based combat resolver (`resolveCombat`).
- `events.ts` — weighted event deck (drawn ONLY on a "Draw Event" click).
- `diplomacy.ts` — relations / alliances / wars.
- `pathing.ts` — unit movement & adjacency.
- `sandbox.ts` — nation forming, splitting, merging, god-tools.

All tunable numbers come from `/src/config`, never hard-coded here.
