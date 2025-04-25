import { Router } from "express";
import * as userService from "./services/user.service.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import UserModel from "../../db/models/User.model.js";

const router = Router();

router.post(
  "/publish",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      const { googleTokens } = await UserModel.findById(user._id);

      if (!googleTokens || !googleTokens.access_token) {
        return res.status(400).send("No access token available");
      }

      const accessToken = googleTokens.access_token;

      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      // Create the YouTube API client
      const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
      });

      // Example: Upload a video to YouTube
      const response = await youtube.videos.insert({
        part: "snippet,status",
        requestBody: {
          snippet: {
            title: "My New Video",
            description: "This is a description of my new video",
            tags: ["tag1", "tag2"],
          },
          status: {
            privacyStatus: "public",
          },
        },
        media: {
          body: fs.createReadStream("./video-1743793391026.mp4"), // Replace with actual video path
        },
      });

      // Send a response back to the client
      res.status(200).send({
        message: "Video published successfully",
        videoId: response.data.id,
      });
    } catch (error) {
      console.error("Error publishing video:", error);
      res.status(500).send("Error publishing video");
    }
  }
);

export default router;
