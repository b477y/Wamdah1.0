import { Router } from "express";
import * as scriptService from "./services/script.service.js";

const router = Router();

router.post("/generate-script", scriptService.generateScript);

export default router;
