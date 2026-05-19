import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

/* Disable Express ETags globally — avoids stale 304 responses on API routes */
app.set("etag", false);

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

// Clerk proxy must come before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Configure Clerk with authorised parties to fix the missing `azp` claim warning.
   List every domain that the frontend is served from. */
const authorizedParties = [
  "https://restaurant.safi-bridge.ma",
  "https://safi-bridge.ma",
];
if (process.env.NODE_ENV !== "production") {
  authorizedParties.push("http://localhost:5173", "http://localhost:3000");
}
app.use(clerkMiddleware({ authorizedParties }));

/* Force no-cache on all API GET responses so new orders appear immediately */
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

app.use("/api", router);

export default app;
