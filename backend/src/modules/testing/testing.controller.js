import { Router } from "express";
import * as testingService from "./services/testing.service.js";
import authentication from "../../middlewares/authentication.middleware.js";

const router = Router();

router.get("/collect-images", testingService.collectImages);
router.get("/script", testingService.generateScriptWithAi);

export default router;
