process.env.JWT_SECRET = "test-secret-0123456789";
import { registerSchema } from "../schemas/auth.js";

async function main() {
  const { signToken, verifyToken } = await import("../lib/jwt.js");

  const ok = registerSchema.safeParse({ email: "felix@devconnect.io", username: "felix_dev", password: "supersecret1", displayName: "Felix" });
  console.log("valid register →", ok.success, "| default role:", ok.success ? ok.data.role : "-");

  const bad = registerSchema.safeParse({ email: "not-an-email", username: "a b!", password: "123", displayName: "F" });
  console.log("invalid register →", bad.success ? "PASSED?!" : bad.error.issues.map(i => i.path.join(".") + ": " + i.message).join(" | "));

  const t = signToken({ userId: "u_123", role: "DEVELOPER" });
  const p = verifyToken(t);
  console.log("jwt roundtrip →", p.userId === "u_123" && p.role === "DEVELOPER" ? "OK" : "FAIL");

  try { verifyToken(t.slice(0, -2) + "xx"); console.log("tampered → PASSED?!"); }
  catch (e) { console.log("tampered token → rejected:", (e as Error).message); }
}
main();
