import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import restaurantRouter from "./restaurant";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(restaurantRouter);
router.use(authRouter);

export default router;
