import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentRouter from "./payments";
import bankRouter from "./bank";
import receiptRouter from "./receipts";
import { workspaceMiddleware } from "../middlewares/workspace";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/vp", workspaceMiddleware, paymentRouter, bankRouter, receiptRouter);

export default router;
