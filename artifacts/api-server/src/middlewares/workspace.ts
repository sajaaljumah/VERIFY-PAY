import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { randomUUID } from "node:crypto";
import { db, businesses } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { seedDemo } from "../lib/demo";

declare global {
  namespace Express {
    interface Request { businessId: string; isDemo: boolean; }
  }
}
export async function workspaceMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = getAuth(req).userId;
  req.isDemo = !userId;
  let demoId = req.signedCookies?.vp_demo;
  if (!userId && (typeof demoId !== "string" || !/^[a-f0-9-]{36}$/.test(demoId))) {
    demoId = randomUUID();
    res.cookie("vp_demo", demoId, { signed: true, httpOnly: true, sameSite: "lax", secure: req.secure, maxAge: 7 * 86400000 });
  }
  req.businessId = userId ? `user:${userId}` : `demo:${demoId}`;
  res.setHeader("Cache-Control", "private, no-store");
  // Advisory lock prevents concurrent first requests from partially seeding a workspace.
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${req.businessId}))`);
    const [business] = await tx.select().from(businesses).where(eq(businesses.id, req.businessId));
    if (!business) {
      await tx.insert(businesses).values({
        id: req.businessId, isDemo: req.isDemo,
        businessName: req.isDemo ? "Bayt Studio" : "My Business",
        ownerName: req.isDemo ? "Bayt Studio Owner" : "Business owner",
        email: "",
      });
      if (req.isDemo) await seedDemo(tx, req.businessId);
    }
  });
  next();
}
