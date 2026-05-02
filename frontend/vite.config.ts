import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    allowedHosts: [
      "ai-interviewer.centralindia.cloudapp.azure.com",
      "fulsome-unmonopolising-mariela.ngrok-free.dev",
      "localhost",
    ],
  },
  preview: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "ai-interviewer.centralindia.cloudapp.azure.com",
      "localhost",
      "fulsome-unmonopolising-mariela.ngrok-free.dev",

    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
