import { Router } from "express";
import authentication from "../../middlewares/authentication.middleware.js";
import * as videoService from "./services/video.service.js";

const router = Router();

router.post("/generate-video", authentication(), videoService.generateVideo);

export default router;
