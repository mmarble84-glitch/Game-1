/** @type {import('tailwindcss').Config} */
// ORBIS visual language: dark slate/near-black panels, thin neon accents, glowing text.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Holographic war-room palette
        orbis: {
          bg: '#05080f', // near-black backdrop
          panel: 'rgba(10, 16, 28, 0.78)', // translucent console panel
          panelSolid: '#0a1018',
          edge: '#1c3a5e', // thin panel border
          neon: '#36e0ff', // primary cyan accent
          neonDim: '#1b8fa8',
          amber: '#ffb347',
          danger: '#ff4d5e',
          good: '#46e8a0',
          text: '#cfe8ff',
          textDim: '#7d97b5',
        },
      },
      boxShadow: {
        neon: '0 0 12px rgba(54, 224, 255, 0.35)',
        'neon-strong': '0 0 22px rgba(54, 224, 255, 0.55)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
