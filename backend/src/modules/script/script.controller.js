import { Router } from "express";
import * as scriptService from "./services/script.service.js";
import authentication from "../../middlewares/authentication.middleware.js";

const router = Router();

router.post("/generate-script", authentication(), scriptService.generateScript);

export default router;
