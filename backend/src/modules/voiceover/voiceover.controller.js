import { Router } from "express";
import * as voiceService from "./services/voiceover.service.js";
import {
  fileValidations,
  uploadCloudFile,
} from "../../utils/multer/cloud.multer.js";

const router = Router();

router.post(
  "/create-voice-over",
  uploadCloudFile(fileValidations.audio).fields([
    { name: "audio", maxCount: 1 },
  ]),
  voiceService.createVoiceOver
);

export default router;
