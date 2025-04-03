import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";
import { fileURLToPath } from "url";
import express from "express";
import bootstrap from "./src/app.controller.js";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve("./src/config/.env") });

const app = express();
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

bootstrap(app, express);

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const indexPath = path.resolve(__dirname, "../../remotion/src/index.jsx");

// const FRAMES_PER_SENTENCE = 150;

// app.post("/generate-video", async (req, res) => {
//   console.log(" Received scriptText:", req.body.scriptText);

//   if (!req.body.scriptText) {
//     return res
//       .status(400)
//       .json({ error: "scriptText is missing in the request" });
//   }

//   const sentences = req.body.scriptText
//     .split(/[.?!]\s+/)
//     .filter(Boolean)
//     .map((s) => s.trim());

//   console.log("Sentences to render:", sentences);

//   const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

//   const fontSize = req.body.fontSize || 80;
//   const color = req.body.color || "white";
//   const fontFamily = req.body.fontFamily || "Arial";
//   const voiceoverUrl = req.body.voiceoverUrl || "";

//   try {
//     console.log(` Bundling project from: ${indexPath}`);
//     const bundled = await bundle(indexPath);

//     const compositions = await getCompositions(bundled, {
//       inputProps: { sentences, fontSize, color, fontFamily, voiceoverUrl },
//     });

//     const composition = compositions.find((c) => c.id === "MyVideo");

//     if (!composition) {
//       throw new Error(" Composition 'MyVideo' not found!");
//     }

//     console.log(" Composition found. Rendering video...");

//     const outputLocation = `./output/video-${Date.now()}.mp4`;
//     await renderMedia({
//       composition: {
//         ...composition,
//         durationInFrames: totalFrames,
//       },
//       serveUrl: bundled,
//       codec: "h264",
//       outputLocation,
//       inputProps: { sentences, fontSize, color, fontFamily, voiceoverUrl },
//     });

//     console.log("Video rendering completed!");

//     res.json({ message: "Video generated!", videoUrl: outputLocation });
//   } catch (error) {
//     console.error(" Error rendering video:", error);
//     res.status(500).json({ error: "Failed to render video" });
//   }
// });