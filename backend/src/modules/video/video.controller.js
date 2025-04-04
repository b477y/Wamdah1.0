import { Router } from "express";
import authentication from "../../middlewares/authentication.middleware.js";
import * as videoService from "./services/video.service.js";

const router = Router();

router.post(
  "/generate-with-user-script",
  authentication(),
  videoService.generateVideoWithUserScript
);
router.post(
  "/generate-with-ai-script",
  authentication(),
  videoService.generateVideoWithAIScript
);

export default router;
