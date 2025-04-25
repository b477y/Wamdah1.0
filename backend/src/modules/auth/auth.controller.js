import { Router } from "express";
import * as authService from "./services/auth.service.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import UserModel from "../../db/models/User.model.js";

const router = Router();

router.get("/refresh-token", authService.refreshToken);
router.post("/signup", authService.signUp);
router.post("/signin", authService.signIn);

// Middleware to extract platform user from `token` query param
function authFromQuery(req, res, next) {
  const token = req.query.token;
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SK);
    req.userPlatform = decoded; // ✅ Fix: save in `req.userPlatform`, not `req.user`
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

// Route to start Google OAuth — token is passed in query
router.get(
  "/google",
  authFromQuery,
  (req, res, next) => {
    // Store token in session or temporary cookie so it's available in callback
    // Better approach: store decoded user in session temporarily
    req.session.userPlatform = req.userPlatform;
    next();
  },
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/youtube.upload",
    ],
    session: false,
  })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  async (req, res) => {
    const googleProfile = req.user;
    const platformUser = req.session.userPlatform; // Use from session

    if (!platformUser?._id) {
      return res.status(400).json({ message: "Missing platform user ID" });
    }

    // Save tokens in the user's document in the database
    await UserModel.updateOne(
      { _id: platformUser._id },
      {
        $set: {
          googleTokens: {
            id: googleProfile.id,
            email: googleProfile.emails[0].value,
            access_token: googleProfile.accessToken, // Save the access token
            refresh_token: googleProfile.refreshToken, // Save the refresh token
          },
        },
      }
    );

    res.redirect("http://localhost:4200/dashboard?connected=google");
  }
);

export default router;
