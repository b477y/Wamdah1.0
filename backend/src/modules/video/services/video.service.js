import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { fileURLToPath } from "url";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import VideoModel from "../../../db/models/Video.model.js";
import { generateScriptUsingGimini } from "../helpers/generateScriptUsingGimini.js";
import { createVoiceOver } from "../helpers/voiceover.js";
import splitText from "../helpers/splitText.js";
import { generateAiAvatarWithCroma } from "../../aiAvatar/services/aiAvatar.service.js";
import generateScript4Product from "../helpers/generateScript4Product.js";
import VoiceActorModel from "../../../db/models/VoiceActor.model.js";
import { getFontLoader } from "../helpers/getfontLoader.js";
import calculateFrames from "../helpers/calculateFrames.js";
import uploadToCloud from "../helpers/uploadToCloud.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.resolve(
  __dirname,
  "../../../../../remotion/src/index.jsx"
);

// Instant video
export const generateVideo = asyncHandler(async (req, res, next) => {
  const { userPrompt, type, language, accentOrDialect } = req.body;
  const framesPerSentence = calculateFrames(accentOrDialect);
  const { referenceId } = await VoiceActorModel.findOne({ language, accentOrDialect })
  if (!referenceId) { next(new Error("Failed to find voiceover actor with selected options")); }

  try {
    console.log("Generating Script...");

    const scriptResponse = await generateScriptUsingGimini({ req, type, userPrompt, language });

    console.log(scriptResponse);

    if (!scriptResponse.script || !scriptResponse.formattedScript || !scriptResponse.title) {
      throw new Error("Failed to generate script correctly.");
    }

    const script = scriptResponse.formattedScript || "";
    const scriptId = scriptResponse.script._id || "";
    const title = scriptResponse.title || "";

    console.log("Formatted script:", script);

    try {
      console.log("Generating Voiceover...");
      const voiceResponse = await createVoiceOver({
        req,
        title,
        scriptText: script,
        reference_id: referenceId,
        scriptId,
        language,
        accentOrDialect,
      });

      if (!voiceResponse.voice.voiceSource.secure_url) {
        next(new Error("Failed to generate voiceover correctly and upload it correctly"));
      }

      const voiceoverUrl = voiceResponse.voice.voiceSource.secure_url || null;

      console.log("Voiceover URL:", voiceoverUrl);

      const sentences = splitText(script);

      console.log("Sentences to render:", sentences);

      const totalFrames = sentences.length * framesPerSentence;
      const fontSize = req.body.fontSize || 80;
      const color = req.body.color || "white";
      const fontFamily = req.body.fontFamily || "Cairo";
      const fontLoader = getFontLoader(fontFamily);
      const { fontFamily: selectedFont } = await fontLoader();

      const bundled = await bundle(indexPath);
      const compositions = await getCompositions(bundled, {
        inputProps: { sentences, fontSize, color, fontFamily, voiceoverUrl, videoDuration: totalFrames, framesPerSentence }
      });

      const composition = compositions.find((c) => c.id === "MyVideo");
      if (!composition) { next(new Error("Composition 'MyVideo' not found!")) }

      console.log("Composition found. Rendering video...");

      const outputLocation = `./output/video-${Date.now()}.mp4`;

      await renderMedia({
        concurrency: 1,
        timeoutInMilliseconds: 60000,
        composition: { ...composition, durationInFrames: totalFrames },
        serveUrl: bundled,
        codec: "h264",
        outputLocation,
        inputProps: { sentences, fontSize, color, fontFamily, voiceoverUrl, videoDuration: totalFrames, framesPerSentence }
      });

      console.log("Video rendering completed!");

      const cloudUploadResult = await uploadToCloud({ req, title, outputLocation })
      const durationInSeconds = Math.round(cloudUploadResult.duration);

      const thumbnailUrl = cloud.url(`${cloudUploadResult.public_id}.jpg`, {
        resource_type: "video",
        transformation: [
          { width: 500, height: 281, crop: "fill" },
          { start_offset: "15" },
        ],
      });

      if (!thumbnailUrl) {
        next(new Error("An error occured while getting the thumbnail url"));
      }

      const video = await VideoModel.create({
        createdBy: req.user._id,
        title,
        videoSource: cloudUploadResult,
        scriptId,
        duration: durationInSeconds,
        thumbnailUrl,
        language,
        accentOrDialect,
        voiceId: voiceResponse.voice._id,
      });

      if (!video) {
        return next(
          new Error("An error saving the video into the database", {
            cause: 409,
          })
        );
      }

      console.log("Video data saved in the database!");

      return successResponse({
        res,
        status: 201,
        message: "Video created successfully",
        data: { video },
      });
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ error: "Video generation failed." });
    }
  } catch (error) {
    console.error("Error generating voiceover:", error);
    res.status(500).json({ error: "Voiceover generation failed." });
  }
  res.status(500).json({ error: "Video generation failed." });
});

// AI Spoke person
export const generateAiAvatarVideo = asyncHandler(async (req, res, next) => {
  const { userPrompt, type, language, accentOrDialect, speaker } = req.body;
  const framesPerSentence = calculateFrames(accentOrDialect);

  try {
    console.log("Generating Script...");

    const scriptResponse = await generateScriptUsingGimini({ req, type, userPrompt, language });

    console.log(scriptResponse);

    if (!scriptResponse.script || !scriptResponse.formattedScript || !scriptResponse.title) {
      throw new Error("Failed to generate script correctly.");
    }

    const script = scriptResponse.formattedScript || "";
    const scriptId = scriptResponse.script._id || "";
    const title = scriptResponse.title || "";

    console.log("Formatted script:", script);

    try {
      const aiAvatarResponse = await generateAiAvatarWithCroma({ req, speaker, script })

      console.log(aiAvatarResponse.videoSource.secure_url);
      console.log(aiAvatarResponse.videoSource.fileName);

      const sentences = splitText(script);

      console.log("Sentences to render:", sentences);

      const totalFrames = sentences.length * framesPerSentence;

      const fontSize = req.body.fontSize || 80;
      const color = req.body.color || "white";
      const fontFamily = req.body.fontFamily || "Cairo";

      const fontLoader = getFontLoader(fontFamily);
      const { fontFamily: selectedFont } = await fontLoader();

      console.log(`Bundling project from: ${indexPath}`);
      const bundled = await bundle(indexPath);

      const compositions = await getCompositions(bundled, {
        inputProps: {
          // sentences,
          fontSize,
          color,
          fontFamily,
          fileName: aiAvatarResponse.videoSource.fileName,
          framesPerSentence
        },
      });

      const composition = compositions.find((c) => c.id === "MyVideo");

      if (!composition) {
        throw new Error("Composition 'MyVideo' not found!");
      }

      console.log("Composition found. Rendering video...");

      const outputLocation = `./output/video-${Date.now()}.mp4`;

      await renderMedia({
        concurrency: 1,
        timeoutInMilliseconds: 60000,
        composition: {
          ...composition,
          durationInFrames: totalFrames,
        },
        serveUrl: bundled,
        codec: "h264",
        outputLocation,
        inputProps: {
          // sentences,
          fontSize,
          color,
          fontFamily,
          fileName: aiAvatarResponse.videoSource.fileName,
          framesPerSentence
        },
      });

      console.log("Video rendering completed!");
      const cloudUploadResult = await uploadToCloud({ req, title, outputLocation })
      const durationInSeconds = Math.round(cloudUploadResult.duration);

      console.log("Video uploading completed!");

      const thumbnailUrl = cloud.url(`${cloudUploadResult.public_id}.jpg`, {
        resource_type: "video",
        transformation: [
          { width: 500, height: 281, crop: "fill" },
          { start_offset: "15" },
        ],
      });

      const video = await VideoModel.create({
        createdBy: req.user._id,
        title,
        videoSource: cloudUploadResult,
        thumbnailUrl,
        scriptId,
        language,
        accentOrDialect,
        duration: durationInSeconds,
      });

      console.log("Video data saved in the database!");

      return successResponse({
        res,
        status: 201,
        message: "Video created successfully",
        data: { video },
      });
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ error: "Video generation failed." });
    }
  } catch (error) {
    console.error("Error generating voiceover:", error);
    res.status(500).json({ error: "Voiceover generation failed." });
  }
  res.status(500).json({ error: "Video generation failed." });
});

// Ad video
export const generateAdVideo = asyncHandler(async (req, res, next) => {
  const { url, language, accentOrDialect } = req.body;
  const framesPerSentence = calculateFrames(accentOrDialect);
  const { referenceId } = await VoiceActorModel.findOne({ language, accentOrDialect })
  if (!referenceId) { next(new Error("Failed to find voiceover actor with selected options")); }

  try {
    console.log("Generating Script...");

    const scriptResponse = await generateScript4Product({ req, url, language });
    if (
      !scriptResponse.script ||
      !scriptResponse.scriptId ||
      !scriptResponse.title
    ) {
      throw new Error(
        "Failed to generate script. API returned invalid response."
      );
    }

    const script = scriptResponse.script || "";
    const scriptId = scriptResponse.scriptId || "";
    const title = scriptResponse.title || "";

    console.log("Formatted script:", script);

    try {
      console.log("Generating Voiceover...");

      const voiceResponse = await createVoiceOver({
        req,
        title,
        scriptText: script,
        scriptId,
        language,
        accentOrDialect,
        reference_id: referenceId
      });

      if (!voiceResponse.voice.voiceSource.secure_url) {
        next(new Error("Failed to generate voiceover correctly and upload it correctly"));
      }

      const voiceoverUrl = voiceResponse.voice.voiceSource.secure_url || null;

      const sentences = splitText(script);

      console.log("Sentences to render:", sentences);

      const totalFrames = sentences.length * framesPerSentence;

      const fontSize = req.body.fontSize || 80;
      const color = req.body.color || "white";
      const fontFamily = req.body.fontFamily || "Cairo";

      console.log(fontFamily);

      const fontLoader = getFontLoader(fontFamily);
      const { fontFamily: selectedFont } = await fontLoader();
      console.log(selectedFont);

      console.log(`Bundling project from: ${indexPath}`);
      const bundled = await bundle(indexPath);

      const compositions = await getCompositions(bundled, {
        inputProps: {
          sentences,
          fontSize,
          color,
          fontFamily,
          voiceoverUrl,
          framesPerSentence
        },
      });

      const composition = compositions.find((c) => c.id === "MyVideo");

      if (!composition) {
        next(new Error("Composition 'MyVideo' not found!"));
      }

      console.log("Composition found. Rendering video...");

      const outputLocation = `./output/video-${Date.now()}.mp4`;

      await renderMedia({
        concurrency: 1,
        timeoutInMilliseconds: 60000, // set to 1 minute
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
          framesPerSentence
        },
      });

      console.log("Video rendering completed!");

      const cloudUploadResult = await uploadToCloud({ req, title, outputLocation })
      const durationInSeconds = Math.round(cloudUploadResult.duration);

      console.log("Video uploading completed!");

      const thumbnailUrl = cloud.url(`${cloudUploadResult.public_id}.jpg`, {
        resource_type: "video",
        transformation: [
          { width: 500, height: 281, crop: "fill" },
          { start_offset: "15" },
        ],
      });

      const video = await VideoModel.create({
        createdBy: req.user._id,
        title,
        videoSource: cloudUploadResult,
        scriptId,
        duration: durationInSeconds,
        thumbnailUrl,
        language,
        accentOrDialect,
        voiceId: voiceResponse.voice._id,
      });

      console.log("Video data saved in the database!");

      return successResponse({
        res,
        status: 201,
        message: "Video created successfully",
        data: { video },
      });
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ error: "Video generation failed." });
    }
  } catch (error) {
    console.error("Error generating voiceover:", error);
    res.status(500).json({ error: "Voiceover generation failed." });
  }
  res.status(500).json({ error: "Video generation failed." });
});