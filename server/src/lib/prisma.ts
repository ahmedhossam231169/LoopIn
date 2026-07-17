import { PrismaClient } from "@prisma/client";
import { config } from "./config.js";

// singleton — instance واحدة بس في المشروع كله
// عشان في الـ dev مع الـ hot reload ما يتفتحش connections كتير
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!config.isProd) {
  globalForPrisma.prisma = prisma;
}
