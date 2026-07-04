import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // أي طلب يبدأ بـ /api بيتحول تلقائي للـ backend
    proxy: {
      "/api": "http://localhost:4000",
      // Socket.io محتاج ws:true عشان الـ WebSocket upgrade يعدي من نفس البورت
      "/socket.io": { target: "http://localhost:4000", ws: true },
    },
  },
});
