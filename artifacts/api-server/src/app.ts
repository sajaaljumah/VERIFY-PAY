import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { rateLimit } from "express-rate-limit";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { Problem } from "./lib/problem";
import type { ErrorRequestHandler } from "express";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: false }));
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));
if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required.");
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
})));
app.use("/api/vp", rateLimit({ windowMs: 60000, limit: 180, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many requests. Please wait a minute." } }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("sec-fetch-site") === "cross-site") {
    res.status(403).json({ error: "Cross-site requests are not allowed." }); return;
  }
  next();
});

app.use("/api", router);
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof Problem) { res.status(err.status).json({ error: err.message }); return; }
  if (err?.name === "ZodError") { res.status(400).json({ error: "Invalid input. Check the required fields and try again.", details: err.issues?.map((i: { path: unknown[]; message: string }) => `${i.path.join(".")}: ${i.message}`) }); return; }
  if (err?.code === "23505") { res.status(409).json({ error: "This record already exists or is already matched." }); return; }
  req.log.error({ errorType: err?.name, code: err?.code }, "Request failed");
  res.status(err?.status === 413 ? 413 : 500).json({ error: err?.status === 413 ? "Uploaded request is too large." : "The request could not be completed. Please try again." });
};
app.use(errorHandler);

export default app;
