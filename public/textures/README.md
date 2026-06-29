# /public/textures — optional globe imagery

ORBIS renders with **zero binary assets by default**: the globe surface and the
starfield background are generated procedurally in the browser
(`src/globe/proceduralTexture.ts`), so the app works fully offline.

To use real image textures instead, drop files here and point the config at them
in `src/config/globe.ts`:

- `earth` → e.g. `earth-dark.jpg` (a dark "holographic" earth surface)
- `bump`  → e.g. `earth-bump.jpg` (topography relief)
- `background.image` → e.g. `starfield.png`

An empty string in the config means "use the procedural surface".
