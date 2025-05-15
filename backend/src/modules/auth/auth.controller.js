import { Router } from "express";
import * as authService from "./services/auth.service.js";
import passport from "../../utils/passport/passport.js";
import { decodeToken } from "../../utils/security/token.security.js";
import { TokenType } from "../../utils/enum/enums.js";
import UserModel from "../../db/models/User.model.js";

const router = Router();

router.get("/refresh-token", authService.refreshToken);
router.post("/signup", authService.signUp);
router.post("/signin", authService.signIn);
router.get('/google', authService.initiateGoogleOAuth);
router.get('/google/callback', authService.handleGoogleOAuthCallback);

export default router;
