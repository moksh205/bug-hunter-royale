import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // react()       -> lets Vite understand JSX and gives fast refresh
  // tailwindcss() -> scans our files and generates only the CSS classes we use
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173, // the frontend runs on http://localhost:5173
  },
})
