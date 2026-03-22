import { Router, type IRouter } from "express";
import healthRouter    from "./health";
import authRouter      from "./auth";
import activitiesRouter from "./activities";
import settingsRouter  from "./settings";
import uploadsRouter   from "./uploads";
import syncRouter      from "./sync";
import locationsRouter from "./locations";
import screensRouter   from "./screens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(activitiesRouter);
router.use(settingsRouter);
router.use(uploadsRouter);
router.use(syncRouter);
router.use(locationsRouter);
router.use(screensRouter);

export default router;
