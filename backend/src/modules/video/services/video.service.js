import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { fileURLToPath } from "url";
import path from "node:path";
import axios from "axios";

import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";
import ScriptModel from "../../../db/models/Script.model.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import VideoModel from "../../../db/models/Video.model.js";

export const generateVideoWithUserScript = asyncHandler(
  async (req, res, next) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const indexPath = path.resolve(
      __dirname,
      "../../../../../remotion/src/index.jsx"
    );

    const FRAMES_PER_SENTENCE = 60; // will be change based on the frontend request 30 FPS => 60/30 => 2 sec/screen

    console.log("Received scriptText:", req.body.scriptText);

    if (!req.body.scriptText) {
      return next(
        new Error("scriptText is missing in the request", { cause: 400 })
      );
    }

    // Split the script
    const sentences = req.body.scriptText
      .split(/[.?!]\s+/)
      .filter(Boolean)
      .map((s) => s.trim());

    console.log("Sentences to render:", sentences);

    // Evaluate total frames
    const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

    const fontSize = req.body.fontSize || 80;
    const color = req.body.color || "white";
    const fontFamily = req.body.fontFamily || "Arial";

    // Save script in the database
    const savedScript = await ScriptModel.create({
      createdBy: req.user._id,
      content: req.body.scriptText,
      generatedByAi: false,
    });

    try {
      console.log("Generating Voiceover...");

      const API_HOST = process.env.API_HOST || "http://localhost:3000";
      const voiceResponse = await axios.post(
        `${API_HOST}/api/voices/create-voice-over`,
        {
          title: req.body.title,
          scriptText: req.body.scriptText,
          scriptId: savedScript._id,
        },
        {
          headers: {
            Authorization: `${req.headers.authorization}`,
          },
        }
      );

      if (
        !voiceResponse.data ||
        !voiceResponse.data.data ||
        !voiceResponse.data.data.voiceSource
      ) {
        throw new Error(
          "Failed to generate script. API returned invalid response."
        );
      }

      // Passed from the Generate Voice Over Endpoint
      const voiceoverUrl = voiceResponse.data.data.voiceSource.secure_url || "";

      // Now we proceed with bundling and rendering the video
      try {
        console.log(`Bundling project from: ${indexPath}`);
        const bundled = await bundle(indexPath);

        const compositions = await getCompositions(bundled, {
          inputProps: { sentences, fontSize, color, fontFamily, voiceoverUrl },
        });

        const composition = compositions.find((c) => c.id === "MyVideo");

        if (!composition) {
          throw new Error("Composition 'MyVideo' not found!");
        }

        console.log("Composition found. Rendering video...");

        const outputLocation = `./output/video-${Date.now()}.mp4`;
        await renderMedia({
          composition: {
            ...composition,
            durationInFrames: totalFrames,
          },
          serveUrl: bundled,
          codec: "h264",
          outputLocation,
          inputProps: { sentences, fontSize, color, fontFamily, voiceoverUrl },
        });

        console.log("Video rendering completed!");

        const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
          folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
          resource_type: "auto",
        });

        fs.unlinkSync(outputLocation);

        const video = await VideoModel.create({
          createdBy: req.user._id,
          title: req.body.title,
          videoSource: cloudUploadResult,
          scriptId: savedScript._id,
          voiceId: voiceResponse.data.data._id,
        });

        return successResponse({
          res,
          status: 201,
          message: "Video created successfully",
          data: { video },
        });
      } catch (error) {
        console.error("Error rendering video:", error);
        return next(new Error("Failed to render video", { cause: 500 }));
      }
    } catch (error) {
      console.error("Error generating voiceover:", error);
      return next(new Error("Failed to generate voiceover", { cause: 500 }));
    }
  }
);

export const generateVideoWithAIScript = asyncHandler(
  async (req, res, next) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const indexPath = path.resolve(
      __dirname,
      "../../../../../remotion/src/index.jsx"
    );

    const FRAMES_PER_SENTENCE = 60; // will be change based on the frontend request 30 FPS => 60/30 => 2 sec/screen

    try {
      console.log("Generating AI script...");

      const API_HOST = process.env.API_HOST || "http://localhost:3000";

      // Generate script and add to database
      const scriptResponse = await axios.post(
        `${API_HOST}/api/scripts/generate-script`,
        {
          url: req.body.url,
        },
        {
          headers: {
            Authorization: `${req.headers.authorization}`,
          },
        }
      );

      if (
        !scriptResponse.data ||
        !scriptResponse.data.data ||
        !scriptResponse.data.data.content
      ) {
        throw new Error(
          "Failed to generate script. API returned invalid response."
        );
      }

      const scriptText = scriptResponse.data.data.content;
      console.log("Generated script:", scriptText);

      const sentences = scriptText
        .split(/[.?!]\s+/)
        .filter(Boolean)
        .map((s) => s.trim());

      console.log("Sentences to render:", sentences);

      const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

      const fontSize = req.body.fontSize || 80;
      const color = req.body.color || "white";
      const fontFamily = req.body.fontFamily || "Arial";

      // Generating Voiceover
      try {
        console.log("Generating Voiceover...");

        const voiceResponse = await axios.post(
          `${API_HOST}/api/voices/create-voice-over`,
          {
            title: req.body.title,
            scriptText: scriptResponse.data.data.content,
            scriptId: scriptResponse.data.data._id,
          },
          {
            headers: {
              Authorization: `${req.headers.authorization}`,
            },
          }
        );

        if (
          !voiceResponse.data ||
          !voiceResponse.data.data ||
          !voiceResponse.data.data.voiceSource
        ) {
          throw new Error(
            "Failed to generate voiceover. API returned invalid response."
          );
        }

        // Passed from the Generate Voice Over Endpoint
        const voiceoverUrl =
          voiceResponse.data.data.voiceSource.secure_url || "";

        // Now we proceed with bundling and rendering the video
        try {
          console.log(`Bundling project from: ${indexPath}`);
          const bundled = await bundle(indexPath);

          const compositions = await getCompositions(bundled, {
            inputProps: {
              sentences,
              fontSize,
              color,
              fontFamily,
              voiceoverUrl,
            },
          });

          const composition = compositions.find((c) => c.id === "MyVideo");

          if (!composition) {
            throw new Error("Composition 'MyVideo' not found!");
          }

          console.log("Composition found. Rendering video...");

          const outputLocation = `./output/video-${Date.now()}.mp4`;
          await renderMedia({
            composition: {
              ...composition,
              durationInFrames: totalFrames,
            },
            serveUrl: bundled,
            codec: "h264",
            outputLocation,
            inputProps: {
              sentences,
              fontSize,
              color,
              fontFamily,
              voiceoverUrl,
            },
          });

          console.log("Video rendering completed!");

          const cloudUploadResult = await cloud.uploader.upload(
            outputLocation,
            {
              folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
              resource_type: "auto",
            }
          );

          fs.unlinkSync(outputLocation);

          const video = await VideoModel.create({
            createdBy: req.user._id,
            title: req.body.title,
            videoSource: cloudUploadResult,
            scriptId: scriptResponse.data.data._id,
            voiceId: voiceResponse.data.data._id,
          });

          return successResponse({
            res,
            status: 201,
            message: "Video created successfully",
            data: { video },
          });
        } catch (error) {
          console.error("Error rendering video:", error);
          return next(new Error("Failed to render video", { cause: 500 }));
        }
      } catch (error) {
        console.error("Error generating voiceover:", error);
        return next(new Error("Failed to generate voiceover", { cause: 500 }));
      }
    } catch (error) {
      console.error("Error generating AI script:", error);
      return next(new Error("Failed to generate AI script", { cause: 500 }));
    }
  }
);
