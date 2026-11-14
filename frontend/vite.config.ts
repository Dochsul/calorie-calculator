import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Превью Base44: добавляем sandbox-хост к разрешённым только в режиме превью
const allowedHosts: string[] = [];
if (process.env.BASE44_PREVIEW_MODE === "1" && process.env.BASE44_SANDBOX_HOST_DOMAIN) {
  allowedHosts.push(`.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`);
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
    proxy: {
      "/api": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});
