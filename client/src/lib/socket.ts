// ---------------------------------------------------------------
// اتصال Socket.io واحد للتطبيق كله (singleton)
// بيتعمل أول ما حد يطلبه، وبيتقفل عند الـ logout
// ---------------------------------------------------------------
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      // نفس الـ origin — الـ Vite proxy بيوصله للسيرفر في التطوير
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
