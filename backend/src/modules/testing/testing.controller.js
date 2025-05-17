import { Router } from "express";
import * as testingService from "./services/testing.service.js";
import authentication from "../../middlewares/authentication.middleware.js";

const router = Router();

router.post(
  "/revideo",
  authentication(),
  testingService.generateVideoWithRevideo
);

export default router;
