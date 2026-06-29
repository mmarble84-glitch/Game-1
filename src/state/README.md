# /src/state — Zustand stores

Holds all live game state. State mutates ONLY in response to an explicit user
action (a click): Advance Turn, Draw Event, a confirmed attack order, a manual
Save, or a sandbox/god-tool edit.

No store may mutate itself on a timer, interval, or animation frame.

Planned stores (added in later phases): world (nations, units, alliances, wars,
relations, turn), selection, log, settings.
