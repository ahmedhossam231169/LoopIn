// ---------------------------------------------------------------
// بيرجع قايمة الـ origins المسموح لهم — نفس المنطق بيتستخدم في
// الـ Express CORS وفي Socket.io عشان الاتنين يتفقوا مع بعض
// ---------------------------------------------------------------
// CLIENT_URL ممكن يكون رابط واحد أو أكتر مفصولين بفاصلة، مثال:
// CLIENT_URL="https://devconnect.vercel.app,https://www.devconnect.app"
export function getAllowedOrigins(): string[] {
  const raw = process.env.CLIENT_URL || "http://localhost:5173";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
