import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { fileURLToPath } from "url";
import path from "node:path";
import fs from "node:fs";
import axios from "axios";
import { google } from "googleapis";
import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";
import ScriptModel from "../../../db/models/Script.model.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import VideoModel from "../../../db/models/Video.model.js";

// Arabic Fonts
import { loadFont as loadAmiri } from "@remotion/google-fonts/Amiri";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadTajawal } from "@remotion/google-fonts/Tajawal";
import { loadFont as loadLateef } from "@remotion/google-fonts/Lateef";
import { loadFont as loadReemKufi } from "@remotion/google-fonts/ReemKufi";
import { loadFont as loadSofia } from "@remotion/google-fonts/Sofia";
import { loadFont as loadScheherazadeNew } from "@remotion/google-fonts/ScheherazadeNew";

// English Fonts
import { loadFont as loadOpenSans } from "@remotion/google-fonts/OpenSans";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { loadFont as loadLato } from "@remotion/google-fonts/Lato";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadMerriweather } from "@remotion/google-fonts/Merriweather";
import { loadFont as loadSlabo27px } from "@remotion/google-fonts/Slabo27px";
import { loadFont as loadABeeZee } from "@remotion/google-fonts/ABeeZee";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadAdventPro } from "@remotion/google-fonts/AdventPro";
import UserModel from "../../../db/models/User.model.js";
import { AccentsAndDialects, Languages } from "../../../utils/enum/enums.js";
import { generateScriptUsingGimini } from "../helpers/generateScriptUsingGimini.js";
import { createVoiceOver } from "../helpers/voiceover.js";
import splitText from "../helpers/splitText.js";
import { generateAiAvatarWithCroma } from "../../aiAvatar/services/aiAvatar.service.js";
import generateScript4Product from "../helpers/generateScript4Product.js";

// Instant video
export const generateVideo = asyncHandler(async (req, res, next) => {
  const { userPrompt, type, language, accentOrDialect } = req.body;
  let reference_id; // voice over actor id
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const indexPath = path.resolve(
    __dirname,
    "../../../../../remotion/src/index.jsx"
  );

  const FRAMES_PER_SENTENCE = 60; // will be change based on the frontend request 30 FPS => 60/30 => 2 sec/screen

  // Arabic video
  if (language.toLowerCase() === Languages.arabic.en) {
    try {
      console.log("Generating Script...");

      const scriptResponse = await generateScriptUsingGimini({
        req,
        type,
        userPrompt,
        language,
      });
      console.log(scriptResponse);

      if (
        !scriptResponse.script ||
        !scriptResponse.formattedScript ||
        !scriptResponse.title
      ) {
        throw new Error("Failed to generate script correctly.");
      }

      const script = scriptResponse.formattedScript || "";
      const scriptId = scriptResponse.script._id || "";
      const title = scriptResponse.title || "";

      console.log("Formatted script:", script);

      try {
        switch (accentOrDialect.toLowerCase()) {
          case AccentsAndDialects.egyptian.en:
            reference_id = "e82e453034a84376a14bb8438fafe9a3";
            break;

          case AccentsAndDialects.syrian.en:
            reference_id = "27c3d5e27b664b1cb692699a661ed91a";
            break;

          default:
            break;
        }

        console.log("Generating Voiceover...");

        const voiceResponse = await createVoiceOver({
          req,
          title,
          scriptText: script,
          reference_id,
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

        const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

        const fontSize = req.body.fontSize || 80;
        const color = req.body.color || "white";
        const fontFamily = req.body.fontFamily || "Cairo";

        function getFontLoader(fontFamily) {
          const fontMap = {
            // Arabic Fonts
            Amiri: loadAmiri,
            Cairo: loadCairo,
            Tajawal: loadTajawal,
            Lateef: loadLateef,
            "Reem Kufi": loadReemKufi, // Correctly spaced
            Sofia: loadSofia,
            Scheherazade: loadScheherazadeNew, // Corrected to match your import

            // English Fonts
            "Open Sans": loadOpenSans, // Corrected to match the name with space
            Roboto: loadRoboto,
            Lato: loadLato,
            Poppins: loadPoppins,
            Montserrat: loadMontserrat,
            Merriweather: loadMerriweather,
            "Slabo 27px": loadSlabo27px, // Corrected with space
            ABeeZee: loadABeeZee,
            Lora: loadLora,
            "Advent Pro": loadAdventPro,
          };

          return fontMap[fontFamily];
        }
        console.log(fontFamily);

        const fontLoader = getFontLoader(fontFamily);
        const { fontFamily: selectedFont } = await fontLoader(); // Load selected font
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
            videoDuration: totalFrames,
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
            videoDuration: totalFrames,
          },
        });

        console.log("Video rendering completed!");

        const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
          folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
          resource_type: "auto",
        });

        if (!cloudUploadResult) {
          next(
            new Error(
              "An error occured while uploading the video into the cloud provider"
            )
          );
        }

        console.log("Video uploading completed!");

        const durationInSeconds = Math.round(cloudUploadResult.duration);

        fs.unlinkSync(outputLocation);

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
  }

  // English video
  if (language.toLowerCase() === Languages.english.en) {
    try {
      console.log("Generating Script...");

      const scriptResponse = await generateScriptUsingGimini({
        req,
        type,
        userPrompt,
        language,
      });
      if (
        !scriptResponse.script ||
        !scriptResponse.foramttedScript ||
        !scriptResponse.title
      ) {
        throw new Error("Failed to generate script correctly.");
      }

      const script = scriptResponse.formattedScript || "";
      const scriptId = scriptResponse.script._id || "";
      const title = scriptResponse.title || "";

      console.log("Formatted script:", script);

      try {
        switch (accentOrDialect.toLowerCase()) {
          case AccentsAndDialects.american.en:
            reference_id = "802e3bc2b27e49c2995d23ef70e6ac89";
            break;

          case AccentsAndDialects.british.en:
            reference_id = "728f6ff2240d49308e8137ffe66008e2";
            break;

          default:
            break;
        }

        console.log("Generating Voiceover...");

        const voiceResponse = await createVoiceOver({
          req,
          title,
          scriptText: script,
          reference_id,
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

        const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

        const fontSize = req.body.fontSize || 80;
        const color = req.body.color || "white";
        const fontFamily = req.body.fontFamily || "Cairo";

        function getFontLoader(fontFamily) {
          const fontMap = {
            // Arabic Fonts
            Amiri: loadAmiri,
            Cairo: loadCairo,
            Tajawal: loadTajawal,
            Lateef: loadLateef,
            "Reem Kufi": loadReemKufi,
            Sofia: loadSofia,
            Scheherazade: loadScheherazadeNew,

            // English Fonts
            "Open Sans": loadOpenSans,
            Roboto: loadRoboto,
            Lato: loadLato,
            Poppins: loadPoppins,
            Montserrat: loadMontserrat,
            Merriweather: loadMerriweather,
            "Slabo 27px": loadSlabo27px,
            ABeeZee: loadABeeZee,
            Lora: loadLora,
            "Advent Pro": loadAdventPro,
          };

          return fontMap[fontFamily];
        }
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
          },
        });

        console.log("Video rendering completed!");

        const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
          folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
          resource_type: "auto",
        });

        if (!cloudUploadResult) {
          next(
            new Error(
              "An error occured while uploading the video into the cloud provider"
            )
          );
        }

        console.log("Video uploading completed!");

        const durationInSeconds = Math.round(cloudUploadResult.duration);

        fs.unlinkSync(outputLocation);

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
  }

  res.status(500).json({ error: "Video generation failed." });
});

// AI Spoke person
export const generateAiAvatarVideo = asyncHandler(async (req, res, next) => {
  const { userPrompt, type, language, accentOrDialect, speaker } = req.body;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const indexPath = path.resolve(
    __dirname,
    "../../../../../remotion/src/index.jsx"
  );

  const FRAMES_PER_SENTENCE = 90; // will be change based on the frontend request 30 FPS => 60/30 => 2 sec/screen

  // Arabic video
  if (language.toLowerCase() === Languages.arabic.en) {
    try {
      console.log("Generating Script...");

      const scriptResponse = await generateScriptUsingGimini({
        req,
        type,
        userPrompt,
        language,
      });
      if (
        !scriptResponse.script ||
        !scriptResponse.formattedScript ||
        !scriptResponse.title
      ) {
        throw new Error(
          "Failed to generate script. API returned invalid response."
        );
      }

      const script = scriptResponse.formattedScript || "";
      const scriptId = scriptResponse.script._id || "";
      const title = scriptResponse.title || "";

      console.log("Formatted script:", script);

      try {
        const aiAvatarResponse = await generateAiAvatarWithCroma({ req, speaker, script })

        console.log(aiAvatarResponse.videoSource.secure_url);
        console.log(aiAvatarResponse.videoSource.fileName);

        // Replace your existing sentence splitting with the new function
        const sentences = splitText(script);

        console.log("Sentences to render:", sentences);

        const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

        const fontSize = req.body.fontSize || 80;
        const color = req.body.color || "white";
        const fontFamily = req.body.fontFamily || "Cairo";

        function getFontLoader(fontFamily) {
          const fontMap = {
            // Arabic Fonts
            Amiri: loadAmiri,
            Cairo: loadCairo,
            Tajawal: loadTajawal,
            Lateef: loadLateef,
            "Reem Kufi": loadReemKufi, // Correctly spaced
            Sofia: loadSofia,
            Scheherazade: loadScheherazadeNew, // Corrected to match your import

            // English Fonts
            "Open Sans": loadOpenSans, // Corrected to match the name with space
            Roboto: loadRoboto,
            Lato: loadLato,
            Poppins: loadPoppins,
            Montserrat: loadMontserrat,
            Merriweather: loadMerriweather,
            "Slabo 27px": loadSlabo27px, // Corrected with space
            ABeeZee: loadABeeZee,
            Lora: loadLora,
            "Advent Pro": loadAdventPro,
          };

          return fontMap[fontFamily];
        }
        console.log(fontFamily);

        const fontLoader = getFontLoader(fontFamily);
        const { fontFamily: selectedFont } = await fontLoader(); // Load selected font
        console.log(selectedFont);

        console.log(`Bundling project from: ${indexPath}`);
        const bundled = await bundle(indexPath);

        const compositions = await getCompositions(bundled, {
          inputProps: {
            sentences,
            fontSize,
            color,
            fontFamily,
            fileName: aiAvatarResponse.videoSource.fileName,
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
            fileName: aiAvatarResponse.videoSource.fileName,
          },
        });

        console.log("Video rendering completed!");

        const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
          folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
          resource_type: "auto",
        });

        const durationInSeconds = Math.round(cloudUploadResult.duration);

        console.log("Video uploading completed!");

        fs.unlinkSync(outputLocation);

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
          voiceId: voiceResponse.voice._id,
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
  }

  // English video
  if (language.toLowerCase() === Languages.english.en) {
    try {
      console.log("Generating Script...");

      const scriptResponse = await generateScriptUsingGimini({
        req,
        type,
        userPrompt,
        language,
      });
      if (
        !scriptResponse.script ||
        !scriptResponse.foramttedScript ||
        !scriptResponse.title
      ) {
        throw new Error(
          "Failed to generate script. API returned invalid response."
        );
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

        const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

        const fontSize = req.body.fontSize || 80;
        const color = req.body.color || "white";
        const fontFamily = req.body.fontFamily || "Cairo";

        function getFontLoader(fontFamily) {
          const fontMap = {
            // Arabic Fonts
            Amiri: loadAmiri,
            Cairo: loadCairo,
            Tajawal: loadTajawal,
            Lateef: loadLateef,
            "Reem Kufi": loadReemKufi,
            Sofia: loadSofia,
            Scheherazade: loadScheherazadeNew,

            // English Fonts
            "Open Sans": loadOpenSans,
            Roboto: loadRoboto,
            Lato: loadLato,
            Poppins: loadPoppins,
            Montserrat: loadMontserrat,
            Merriweather: loadMerriweather,
            "Slabo 27px": loadSlabo27px,
            ABeeZee: loadABeeZee,
            Lora: loadLora,
            "Advent Pro": loadAdventPro,
          };

          return fontMap[fontFamily];
        }
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
            fileName: aiAvatarResponse.videoSource.fileName,
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
            fileName: aiAvatarResponse.videoSource.fileName,
          },
        });

        console.log("Video rendering completed!");

        const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
          folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
          resource_type: "auto",
        });

        const durationInSeconds = Math.round(cloudUploadResult.duration);

        console.log("Video uploading completed!");

        fs.unlinkSync(outputLocation);

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
          voiceId: voiceResponse.voice._id,
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
  }

  res.status(500).json({ error: "Video generation failed." });
});

// Ad video
export const generateAdVideo = asyncHandler(async (req, res, next) => {
  const { url, language, accentOrDialect } = req.body;
  let reference_id; // voice over actor id
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const indexPath = path.resolve(
    __dirname,
    "../../../../../remotion/src/index.jsx"
  );

  const FRAMES_PER_SENTENCE = 90; // will be change based on the frontend request 30 FPS => 60/30 => 2 sec/screen

  // Arabic video
  if (language.toLowerCase() === Languages.arabic.en) {
    try {
      console.log("Generating Script...");

      const scriptResponse = generateScript4Product({
        req,
        url,
        language,
      });
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
          reference_id,
          scriptId,
          language,
          accentOrDialect,
        });

        if (!voiceResponse.voiceSource) {
          next(new Error("Failed to generate voiceover correctly"));
        }

        const voiceoverUrl = voiceResponse.voiceSource.secure_url || null;

        const sentences = splitText(script);

        console.log("Sentences to render:", sentences);

        const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

        const fontSize = req.body.fontSize || 80;
        const color = req.body.color || "white";
        const fontFamily = req.body.fontFamily || "Cairo";

        function getFontLoader(fontFamily) {
          const fontMap = {
            // Arabic Fonts
            Amiri: loadAmiri,
            Cairo: loadCairo,
            Tajawal: loadTajawal,
            Lateef: loadLateef,
            "Reem Kufi": loadReemKufi, // Correctly spaced
            Sofia: loadSofia,
            Scheherazade: loadScheherazadeNew, // Corrected to match your import

            // English Fonts
            "Open Sans": loadOpenSans, // Corrected to match the name with space
            Roboto: loadRoboto,
            Lato: loadLato,
            Poppins: loadPoppins,
            Montserrat: loadMontserrat,
            Merriweather: loadMerriweather,
            "Slabo 27px": loadSlabo27px, // Corrected with space
            ABeeZee: loadABeeZee,
            Lora: loadLora,
            "Advent Pro": loadAdventPro,
          };

          return fontMap[fontFamily];
        }
        console.log(fontFamily);

        const fontLoader = getFontLoader(fontFamily);
        const { fontFamily: selectedFont } = await fontLoader(); // Load selected font
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
          },
        });

        console.log("Video rendering completed!");

        const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
          folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
          resource_type: "auto",
        });

        const durationInSeconds = Math.round(cloudUploadResult.duration);

        console.log("Video uploading completed!");

        fs.unlinkSync(outputLocation);

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
  }

  // English video
  if (language.toLowerCase() === Languages.english.en) {
    try {
      console.log("Generating Script...");

      const scriptResponse = await generateScriptUsingGimini({
        req,
        type,
        userPrompt,
        language,
      });
      if (
        !scriptResponse.script ||
        !scriptResponse.foramttedScript ||
        !scriptResponse.title
      ) {
        throw new Error("Failed to generate script correctly.");
      }

      const script = scriptResponse.formattedScript || "";
      const scriptId = scriptResponse.script._id || "";
      const title = scriptResponse.title || "";

      console.log("Formatted script:", script);

      try {
        switch (accentOrDialect.toLowerCase()) {
          case AccentsAndDialects.american.en:
            reference_id = "802e3bc2b27e49c2995d23ef70e6ac89";
            break;

          case AccentsAndDialects.british.en:
            reference_id = "728f6ff2240d49308e8137ffe66008e2";
            break;

          default:
            break;
        }

        console.log("Generating Voiceover...");

        const voiceResponse = await createVoiceOver({
          req,
          title,
          scriptText: script,
          reference_id,
          scriptId,
          language,
          accentOrDialect,
        });

        if (!voiceResponse.voiceSource) {
          next(new Error("Failed to generate voiceover correctly"));
        }

        const voiceoverUrl = voiceResponse.voiceSource.secure_url || null;

        console.log("Voiceover URL:", voiceoverUrl);

        const sentences = splitText(script);

        console.log("Sentences to render:", sentences);

        const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

        const fontSize = req.body.fontSize || 80;
        const color = req.body.color || "white";
        const fontFamily = req.body.fontFamily || "Cairo";

        function getFontLoader(fontFamily) {
          const fontMap = {
            // Arabic Fonts
            Amiri: loadAmiri,
            Cairo: loadCairo,
            Tajawal: loadTajawal,
            Lateef: loadLateef,
            "Reem Kufi": loadReemKufi,
            Sofia: loadSofia,
            Scheherazade: loadScheherazadeNew,

            // English Fonts
            "Open Sans": loadOpenSans,
            Roboto: loadRoboto,
            Lato: loadLato,
            Poppins: loadPoppins,
            Montserrat: loadMontserrat,
            Merriweather: loadMerriweather,
            "Slabo 27px": loadSlabo27px,
            ABeeZee: loadABeeZee,
            Lora: loadLora,
            "Advent Pro": loadAdventPro,
          };

          return fontMap[fontFamily];
        }
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
          },
        });

        console.log("Video rendering completed!");

        const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
          folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
          resource_type: "auto",
        });

        const durationInSeconds = Math.round(cloudUploadResult.duration);

        console.log("Video uploading completed!");

        fs.unlinkSync(outputLocation);

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
  }

  res.status(500).json({ error: "Video generation failed." });
});
