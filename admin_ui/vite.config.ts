import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "fulsome-unmonopolising-mariela.ngrok-free.dev",
    ],
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "fulsome-unmonopolising-mariela.ngrok-free.dev",
    ],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
