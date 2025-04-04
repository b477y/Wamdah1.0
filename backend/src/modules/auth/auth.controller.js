import { Router } from "express";
import * as authService from "./services/auth.service.js";
const router = Router();

router.get("/refresh-token", authService.refreshToken);

router.post("/signup", authService.signUp);
router.post("/signin", authService.signIn);

export default router;
