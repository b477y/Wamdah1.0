import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { fileURLToPath } from "url";
import path from "node:path";
import axios from "axios";

import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";

export const generateVideoWithUserScript = asyncHandler(
  async (req, res, next) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const indexPath = path.resolve(
      __dirname,
      "../../../../../remotion/src/index.jsx"
    );

    const FRAMES_PER_SENTENCE = 150; // will be change based on the frontend request

    console.log(" Received scriptText:", req.body.scriptText);

    if (!req.body.scriptText) {
      return next(
        new Error("scriptText is missing in the request", { cause: 400 })
      );
    }

    const sentences = req.body.scriptText
      .split(/[.?!]\s+/)
      .filter(Boolean)
      .map((s) => s.trim());

    console.log("Sentences to render:", sentences);

    const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

    const fontSize = req.body.fontSize || 80;
    const color = req.body.color || "white";
    const fontFamily = req.body.fontFamily || "Arial";
    const voiceoverUrl = req.body.voiceoverUrl || "";

    try {
      console.log(` Bundling project from: ${indexPath}`);
      const bundled = await bundle(indexPath);

      const compositions = await getCompositions(bundled, {
        inputProps: { sentences, fontSize, color, fontFamily, voiceoverUrl },
      });

      const composition = compositions.find((c) => c.id === "MyVideo");

      if (!composition) {
        throw new Error(" Composition 'MyVideo' not found!");
      }

      console.log(" Composition found. Rendering video...");

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

      return successResponse({
        res,
        status: 201,
        message: "Video created successfully",
        data: outputLocation,
      });
    } catch (error) {
      console.error(" Error rendering video:", error);
      res.status(500).json({ error: "Failed to render video" });
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

    const FRAMES_PER_SENTENCE = 150; // Will be changed based on frontend request

    try {
      console.log("Generating AI script...");

      // 🌟 Call the script generation API
      const API_HOST = process.env.API_HOST || "http://localhost:3000";
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
      const voiceoverUrl = req.body.voiceoverUrl || "";

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

      return successResponse({
        res,
        status: 201,
        message: "Video created successfully",
        data: outputLocation,
      });
    } catch (error) {
      console.error("Error generating video:", error.message);
      return next(
        new Error("Failed to generate video. Please try again later.", {
          cause: 500,
        })
      );
    }
  }
);
