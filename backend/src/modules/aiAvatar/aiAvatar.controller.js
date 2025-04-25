import { Router } from "express";
import authentication from "../../middlewares/authentication.middleware.js";
import * as aiAvatarService from "./services/aiAvatar.service.js";

const router = Router();

router.post(
  "/generate-ai-avatar",
  authentication(),
  aiAvatarService.generateVideo
);

export default router;
