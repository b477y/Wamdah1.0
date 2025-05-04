import { Router } from "express";
import authentication from "../../middlewares/authentication.middleware.js";
import * as videoService from "./services/video.service.js";

const router = Router();

// Instant Ai Video
router.post(
  "/generate",
  authentication(),
  videoService.generateVideo
);

// AI Spoke person
router.post(
  "/generate-avatar",
  authentication(),
  videoService.generateAiAvatarVideo
);

// Ad video
router.post(
  "/generate-ad",
  authentication(),
  videoService.generateAdVideo
);

export default router;