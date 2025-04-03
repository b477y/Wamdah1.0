import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { fileURLToPath } from "url";
import path from "node:path";

import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";

export const createVideo = asyncHandler(async (req, res, next) => {
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
});
