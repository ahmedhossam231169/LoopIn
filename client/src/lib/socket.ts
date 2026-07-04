// ---------------------------------------------------------------
// اتصال Socket.io واحد للتطبيق كله (singleton)
// بيتعمل أول ما حد يطلبه، وبيتقفل عند الـ logout
// ---------------------------------------------------------------
import { io, type Socket } from "socket.io-client";

// في التطوير: فاضي، فـ socket.io بيتصل بنفس الـ origin والـ Vite proxy بيوصله للسيرفر المحلي
// في الإنتاج: بنحط رابط الـ backend الحقيقي (نفس VITE_API_URL بتاع lib/api.ts)
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      auth: { token: localStorage.getItem("devconnect_token") },
      transports: ["websocket"],
    });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
