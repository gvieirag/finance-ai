import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#10b981', dark: '#059669' },
        surface: '#0f172a',
        card: '#1e293b',
        border: '#334155',
      }
    }
  },
  plugins: []
}
export default config
