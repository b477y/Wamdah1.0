import { Router } from "express";
import * as voiceService from "./services/voiceover.service.js";
import authentication from "../../middlewares/authentication.middleware.js";

const router = Router();

router.post(
  "/create-voice-over",
  authentication(),
  voiceService.createVoiceOver
);

export default router;
