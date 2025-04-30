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
import searchImages from "../../../utils/imagesCollector/imagesCollector.js";

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

    // Enhanced sentence splitting with proper Arabic text direction handling
    const splitText = (text) => {
      // First, identify if the text is predominantly Arabic
      const isArabic =
        /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
          text
        );

      // Use appropriate regex based on text language
      let sentences;

      if (isArabic) {
        // Split at Arabic sentence ending punctuation (question mark, period, exclamation)
        sentences = text
          .split(/([.؟!\u06D4]+)/)
          .reduce((result, current, index, array) => {
            // Skip empty parts
            if (!current.trim()) return result;

            // If this is punctuation, append to previous sentence
            if (/^[.؟!\u06D4]+$/.test(current)) {
              if (result.length > 0) {
                result[result.length - 1] += current;
              } else {
                result.push(current);
              }
            }
            // If not punctuation and not followed by punctuation, it's a complete sentence
            else if (
              index + 1 >= array.length ||
              !/^[.؟!\u06D4]+$/.test(array[index + 1])
            ) {
              result.push(current);
            }
            // Otherwise, this part will be joined with punctuation in next iteration
            else {
              result.push(current);
            }
            return result;
          }, []);
      } else {
        // English and other LTR languages
        sentences = text
          .split(/([.?!]+\s*)/)
          .reduce((result, current, index, array) => {
            if (!current.trim()) return result;

            // If this part contains ending punctuation
            if (/[.?!]+\s*$/.test(current)) {
              result.push(current);
            }
            // If next part is punctuation, wait for it
            else if (
              index + 1 < array.length &&
              /^[.?!]+\s*$/.test(array[index + 1])
            ) {
              result.push(current);
            }
            // Otherwise it's a sentence without punctuation
            else {
              result.push(current);
            }
            return result;
          }, []);
      }

      // Clean up: trim spaces and filter empty strings
      return sentences
        .filter((sentence) => sentence.trim().length > 0)
        .map((sentence) => sentence.trim());
    };

    // Replace your existing sentence splitting with the new function
    const sentences = splitText(req.body.scriptText);

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

      // Generating Voiceover
      // try {
      // console.log("Generating Voiceover...");

      // const voiceResponse = await axios.post(
      //   `${API_HOST}/api/voices/create-voice-over`,
      //   {
      //     title: req.body.title,
      //     scriptText: scriptResponse.data.data.content,
      //     scriptId: scriptResponse.data.data._id,
      //   },
      //   {
      //     headers: {
      //       Authorization: `${req.headers.authorization}`,
      //     },
      //   }
      // );

      // if (
      //   !voiceResponse.data ||
      //   !voiceResponse.data.data ||
      //   !voiceResponse.data.data.voiceSource
      // ) {
      //   throw new Error(
      //     "Failed to generate voiceover. API returned invalid response."
      //   );
      // }

      // Passed from the Generate Voice Over Endpoint
      // const voiceoverUrl =
      //   voiceResponse.data.data.voiceSource.secure_url || "";

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
            // voiceoverUrl,
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
            // voiceoverUrl,
          },
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
          scriptId: scriptResponse.data.data._id,
        });

        // voiceId: "67f05a84e84ee0bfa7262a9f",
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
      // } catch (error) {
      //   console.error("Error generating voiceover:", error);
      //   return next(new Error("Failed to generate voiceover", { cause: 500 }));
      // }
    } catch (error) {
      console.error("Error generating AI script:", error);
      return next(new Error("Failed to generate AI script", { cause: 500 }));
    }
  }
);

// export const generateVideoWithAiAvatarAndScript = asyncHandler(
//   async (req, res, next) => {
//     const __filename = fileURLToPath(import.meta.url);
//     const __dirname = path.dirname(__filename);

//     const indexPath = path.resolve(
//       __dirname,
//       "../../../../../remotion/src/index.jsx"
//     );

//     const FRAMES_PER_SENTENCE = 60; // will be change based on the frontend request 30 FPS => 60/30 => 2 sec/screen

//     try {
//       console.log("Generating AI script...");

//       const API_HOST = process.env.API_HOST || "http://localhost:3000";

//       // Generate script and add to database
//       const scriptResponse = await axios.post(
//         `${API_HOST}/api/scripts/generate-script`,
//         {
//           url: req.body.url,
//         },
//         {
//           headers: {
//             Authorization: `${req.headers.authorization}`,
//           },
//         }
//       );

//       if (
//         !scriptResponse.data ||
//         !scriptResponse.data.data ||
//         !scriptResponse.data.data.content
//       ) {
//         throw new Error(
//           "Failed to generate script. API returned invalid response."
//         );
//       }

//       const scriptText = scriptResponse.data.data.content;
//       console.log("Generated script:", scriptText);

//       const sentences = scriptText
//         .split(/[.?!]\s+/)
//         .filter(Boolean)
//         .map((s) => s.trim());

//       console.log("Sentences to render:", sentences);

//       const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

//       const fontSize = req.body.fontSize || 80;
//       const color = req.body.color || "white";
//       const fontFamily = req.body.fontFamily || "Arial";

//       function getFontLoader(fontFamily) {
//         const fontMap = {
//           // Arabic Fonts
//           Amiri: loadAmiri,
//           Cairo: loadCairo,
//           Tajawal: loadTajawal,
//           Lateef: loadLateef,
//           "Reem Kufi": loadReemKufi, // Correctly spaced
//           Sofia: loadSofia,
//           Scheherazade: loadScheherazadeNew, // Corrected to match your import

//           // English Fonts
//           "Open Sans": loadOpenSans, // Corrected to match the name with space
//           Roboto: loadRoboto,
//           Lato: loadLato,
//           Poppins: loadPoppins,
//           Montserrat: loadMontserrat,
//           Merriweather: loadMerriweather,
//           "Slabo 27px": loadSlabo27px, // Corrected with space
//           ABeeZee: loadABeeZee,
//           Lora: loadLora,
//           "Advent Pro": loadAdventPro,
//         };

//         return fontMap[fontFamily];
//       }
//       console.log(fontFamily);

//       const fontLoader = getFontLoader(fontFamily);
//       const { fontFamily: selectedFont } = await fontLoader(); // Load selected font
//       console.log(selectedFont);

//       // Generating Voiceover
//       // try {
//       // console.log("Generating Voiceover...");

//       // const voiceResponse = await axios.post(
//       //   `${API_HOST}/api/voices/create-voice-over`,
//       //   {
//       //     title: req.body.title,
//       //     scriptText: scriptResponse.data.data.content,
//       //     scriptId: scriptResponse.data.data._id,
//       //   },
//       //   {
//       //     headers: {
//       //       Authorization: `${req.headers.authorization}`,
//       //     },
//       //   }
//       // );

//       // if (
//       //   !voiceResponse.data ||
//       //   !voiceResponse.data.data ||
//       //   !voiceResponse.data.data.voiceSource
//       // ) {
//       //   throw new Error(
//       //     "Failed to generate voiceover. API returned invalid response."
//       //   );
//       // }

//       // Passed from the Generate Voice Over Endpoint
//       // const voiceoverUrl =
//       //   voiceResponse.data.data.voiceSource.secure_url || "";

//       // Now we proceed with bundling and rendering the video
//       try {
//         console.log(`Bundling project from: ${indexPath}`);
//         const bundled = await bundle(indexPath);

//         const compositions = await getCompositions(bundled, {
//           inputProps: {
//             sentences,
//             fontSize,
//             color,
//             fontFamily,
//             // voiceoverUrl,
//           },
//         });

//         const composition = compositions.find((c) => c.id === "MyVideo");

//         if (!composition) {
//           throw new Error("Composition 'MyVideo' not found!");
//         }

//         console.log("Composition found. Rendering video...");

//         const outputLocation = `./output/video-${Date.now()}.mp4`;
//         await renderMedia({
//           composition: {
//             ...composition,
//             durationInFrames: totalFrames,
//           },
//           serveUrl: bundled,
//           codec: "h264",
//           outputLocation,
//           inputProps: {
//             sentences,
//             fontSize,
//             color,
//             fontFamily,
//             // voiceoverUrl,
//           },
//         });

//         console.log("Video rendering completed!");

//         const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
//           folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
//           resource_type: "auto",
//         });

//         fs.unlinkSync(outputLocation);

//         const video = await VideoModel.create({
//           createdBy: req.user._id,
//           title: req.body.title,
//           videoSource: cloudUploadResult,
//           scriptId: scriptResponse.data.data._id,
//         });

//         // voiceId: "67f05a84e84ee0bfa7262a9f",
//         return successResponse({
//           res,
//           status: 201,
//           message: "Video created successfully",
//           data: { video },
//         });
//       } catch (error) {
//         console.error("Error rendering video:", error);
//         return next(new Error("Failed to render video", { cause: 500 }));
//       }
//       // } catch (error) {
//       //   console.error("Error generating voiceover:", error);
//       //   return next(new Error("Failed to generate voiceover", { cause: 500 }));
//       // }
//     } catch (error) {
//       console.error("Error generating AI script:", error);
//       return next(new Error("Failed to generate AI script", { cause: 500 }));
//     }
//   }
// );

export const generateVideoWithAiAvatarAndScript = asyncHandler(
  async (req, res, next) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const indexPath = path.resolve(
      __dirname,
      "../../../../../remotion/src/index.jsx"
    );

    const FRAMES_PER_SENTENCE = 120; // will be change based on the frontend request 30 FPS => 60/30 => 2 sec/screen

    try {
      const API_HOST = process.env.API_HOST || "http://localhost:3000";
      console.log("Generating AI script...");
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

      const aiAvatarResponse = await axios.post(
        `${API_HOST}/api/aiAvatar/generate-ai-avatar`,
        {
          title: req.body.title,
          speaker: req.body.speaker,
          script: scriptText,
        },
        {
          headers: {
            Authorization: `${req.headers.authorization}`,
          },
        }
      );

      console.log(aiAvatarResponse.data.data.videoSource.secure_url);
      console.log(aiAvatarResponse.data.data.videoSource.outputPath);

      const sentences = scriptText
        .split(/[.?!]\s+/)
        .filter(Boolean)
        .map((s) => s.trim());

      console.log("Sentences to render:", sentences);

      const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

      const fontSize = req.body.fontSize || 80;
      const color = req.body.color || "white";
      const fontFamily = req.body.fontFamily || "Arial";

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

      // Generating Voiceover
      // try {
      // console.log("Generating Voiceover...");

      // const voiceResponse = await axios.post(
      //   `${API_HOST}/api/voices/create-voice-over`,
      //   {
      //     title: req.body.title,
      //     scriptText: scriptResponse.data.data.content,
      //     scriptId: scriptResponse.data.data._id,
      //   },
      //   {
      //     headers: {
      //       Authorization: `${req.headers.authorization}`,
      //     },
      //   }
      // );

      // if (
      //   !voiceResponse.data ||
      //   !voiceResponse.data.data ||
      //   !voiceResponse.data.data.voiceSource
      // ) {
      //   throw new Error(
      //     "Failed to generate voiceover. API returned invalid response."
      //   );
      // }

      // Passed from the Generate Voice Over Endpoint
      // const voiceoverUrl =
      //   voiceResponse.data.data.voiceSource.secure_url || "";

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
            fileName: aiAvatarResponse.data.data.videoSource.fileName,
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
            fileName: aiAvatarResponse.data.data.videoSource.fileName,
          },
        });

        console.log("Video rendering completed!");

        const cloudUploadResult = await cloud.uploader.upload(outputLocation, {
          folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}`,
          resource_type: "auto",
        });

        console.log("Video uploading completed!");

        fs.unlinkSync(outputLocation);

        const video = await VideoModel.create({
          createdBy: req.user._id,
          title: req.body.title,
          videoSource: cloudUploadResult,
          scriptId: scriptResponse.data.data._id,
        });

        console.log("Video data saved in the database!");

        // voiceId: "67f05a84e84ee0bfa7262a9f",
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
      // } catch (error) {
      //   console.error("Error generating voiceover:", error);
      //   return next(new Error("Failed to generate voiceover", { cause: 500 }));
      // }
    } catch (error) {
      console.error("Error generating AI script:", error);
      return next(new Error("Failed to generate AI script", { cause: 500 }));
    }
  }
);

export const generateVideoWithAiAvatarAndScriptSecondPart = asyncHandler(
  async (req, res, next) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const indexPath = path.resolve(
      __dirname,
      "../../../../../remotion/src/index.jsx"
    );

    const FRAMES_PER_SENTENCE = 120; // will be change based on the frontend request 30 FPS => 60/30 => 2 sec/screen

    try {
      const API_HOST = process.env.API_HOST || "http://localhost:3000";
      console.log("Generating AI script...");
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

      await searchImages(req.body.query);

      const aiAvatarResponse = await axios.post(
        `${API_HOST}/api/aiAvatar/generate-ai-avatar`,
        {
          title: req.body.title,
          speaker: req.body.speaker,
          script: scriptText,
        },
        {
          headers: {
            Authorization: `${req.headers.authorization}`,
          },
        }
      );

      console.log(aiAvatarResponse.data.data.videoSource.secure_url);
      console.log(aiAvatarResponse.data.data.videoSource.outputPath);
      console.log(aiAvatarResponse.data.data.videoSource.fileName);

      const sentences = scriptText
        .split(/[.?!]\s+/)
        .filter(Boolean)
        .map((s) => s.trim());

      console.log("Sentences to render:", sentences);

      const totalFrames = sentences.length * FRAMES_PER_SENTENCE;

      const fontSize = req.body.fontSize || 80;
      const color = req.body.color || "white";
      const fontFamily = req.body.fontFamily || "Arial";

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

      // Generating Voiceover
      // try {
      // console.log("Generating Voiceover...");

      // const voiceResponse = await axios.post(
      //   `${API_HOST}/api/voices/create-voice-over`,
      //   {
      //     title: req.body.title,
      //     scriptText: scriptResponse.data.data.content,
      //     scriptId: scriptResponse.data.data._id,
      //   },
      //   {
      //     headers: {
      //       Authorization: `${req.headers.authorization}`,
      //     },
      //   }
      // );

      // if (
      //   !voiceResponse.data ||
      //   !voiceResponse.data.data ||
      //   !voiceResponse.data.data.voiceSource
      // ) {
      //   throw new Error(
      //     "Failed to generate voiceover. API returned invalid response."
      //   );
      // }

      // Passed from the Generate Voice Over Endpoint
      // const voiceoverUrl =
      //   voiceResponse.data.data.voiceSource.secure_url || "";

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
            fileName: aiAvatarResponse.data.data.videoSource.fileName,
            // images,
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
            fileName: aiAvatarResponse.data.data.videoSource.fileName,
            // images,
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
            { start_offset: "5" },
          ],
        });

        const video = await VideoModel.create({
          createdBy: req.user._id,
          title: req.body.title,
          videoSource: cloudUploadResult,
          scriptId: scriptResponse.data.data._id,
          duration: durationInSeconds,
          thumbnailUrl: thumbnailUrl,
        });

        console.log("Video data saved in the database!");

        // voiceId: "67f05a84e84ee0bfa7262a9f",
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
      // } catch (error) {
      //   console.error("Error generating voiceover:", error);
      //   return next(new Error("Failed to generate voiceover", { cause: 500 }));
      // }
    } catch (error) {
      console.error("Error generating AI script:", error);
      return next(new Error("Failed to generate AI script", { cause: 500 }));
    }
  }
);

export const generateMotivationalVideo = asyncHandler(
  async (req, res, next) => {}
);

export const generateGenericlVideo = asyncHandler(async (req, res, next) => {
  const { language, accentOrDialect, type, userContent, gender } = req.body;
  
});

export const uploadToYoutube = asyncHandler(async (req, res, next) => {
  try {
    // Retrieve the access token for the user from the database
    const user = await UserModel.findById(req.user._id); // assuming `req.user` contains the user's info
    const accessToken = user.googleTokens.access_token;

    if (!accessToken) {
      return res.status(400).json({ message: "Access token not found" });
    }

    // Set up the YouTube API client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // YouTube API client
    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    // Prepare the video file and metadata
    const videoMetadata = {
      snippet: {
        title: "Sample Video",
        description: "This is a sample video upload",
        tags: ["sample", "video"],
      },
      status: {
        privacyStatus: "public", // 'private', 'unlisted', or 'public'
      },
    };

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const videoPath = path.resolve(__dirname, "./video-1743793391026.mp4");

    // Upload the video
    // const videoPath = "./video-1743793391026.mp4"; // Path to the video file
    const resUpload = await youtube.videos.insert({
      part: "snippet,status",
      media: {
        body: fs.createReadStream(videoPath), // Use fs to stream the file
      },
      resource: videoMetadata,
    });

    // Handle the response
    if (resUpload.status === 200) {
      return res.status(200).json({
        message: "Video uploaded successfully",
        videoId: resUpload.data.id,
      });
    } else {
      return res.status(500).json({ message: "Failed to upload video" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
