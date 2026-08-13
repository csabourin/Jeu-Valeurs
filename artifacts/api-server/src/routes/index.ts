import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogueRouter from "./catalogue";
import sessionsRouter from "./sessions";
import cartesSessionRouter from "./cartes-session";
import reponsesRouter from "./reponses";
import constellationRouter from "./constellation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogueRouter);
router.use(sessionsRouter);
router.use(cartesSessionRouter);
router.use(reponsesRouter);
router.use(constellationRouter);

export default router;
