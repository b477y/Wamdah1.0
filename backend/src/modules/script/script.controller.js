import { Router } from "express";
import * as scriptService from "./services/script.service.js";
import authentication from "../../middlewares/authentication.middleware.js";

const router = Router();

router.post(
  "/generate-ad-script",
  authentication(),
  scriptService.generateScript4Product
);
router.post("/generate", authentication(), scriptService.generateScriptUsingGimini);

export default router;
