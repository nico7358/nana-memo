import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {VitePWA} from "vite-plugin-pwa";
import path from "path";
import {fileURLToPath} from "url";

// FIX: __dirname is not available in ES modules. This defines it for the current module.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [react(), VitePWA({registerType: "autoUpdate"})],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
