import { Router } from "express";
import authentication from "../../middlewares/authentication.middleware.js";
import * as videoService from "./services/video.service.js";

const router = Router();

router.post(
  "/generate-vid-with-user-script",
  authentication(),
  videoService.generateVideoWithUserScript
);
router.post(
  "/generate-vid-with-ai-script",
  authentication(),
  videoService.generateVideoWithAIScript
);
router.post(
  "/generate-vid-with-ai-avatar",
  authentication(),
  videoService.generateVideoWithAiAvatarAndScript
);
router.post(
  "/upload-to-youtube",
  authentication(),
  videoService.uploadToYoutube
);

export default router;