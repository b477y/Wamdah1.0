import { GoogleGenerativeAI } from "@google/generative-ai";
import ScriptModel from "../../../db/models/Script.model.js";
import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { scrapeText } from "../../video/helpers/scraper.js";
import { generateScriptWithAi } from "../../video/helpers/scriptGenerator.js";
import searchImages from "../../../utils/imagesCollector/imagesCollector.js";
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
import { generateAndUploadThumbnail } from "../helpers/generateAndUploadThumbnail.js.js";
import axios from "axios";
import { renderVideo } from '@revideo/renderer';
import { REVIDEO_CONFIG } from '../../../config/revideo.config.js';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const indexPath = path.resolve(
  __dirname,
  "../../../../../remotion/src/index.jsx"
);
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// controllers/videoController.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateVideoWithRevideo = asyncHandler(async (req, res, next) => {
  const { userPrompt, type, language, accentOrDialect } = req.body;

  // 1. Generate script
  const scriptResponse = await generateScriptUsingGimini({ 
    req, 
    type, 
    userPrompt, 
    language 
  });
  const script = scriptResponse.formattedScript;
  const title = scriptResponse.title;

  // 2. Generate voiceover
  const voiceResponse = await createVoiceOver({ 
    req, 
    title, 
    scriptText: script, 
    language, 
    accentOrDialect 
  });
  const voiceoverUrl = voiceResponse.voice.voiceSource.secure_url;

  // 3. Create temporary directory
  const tempDir = path.join(__dirname, 'temp', uuidv4());
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // 4. Generate word timings (simplified - implement proper timing analysis)
    const words = script.split(' ').map((word, i) => ({
      punctuated_word: word,
      start: i * 0.5,
      end: (i + 1) * 0.5
    }));

    // 5. Prepare metadata matching your project.tsx structure
    const metadata = {
      images: await fetchRelevantImages(script), // Implement this
      audioUrl: voiceoverUrl,
      words,
      // Add any other variables your scene uses
    };

    // 6. Write metadata file
    await fs.writeFile(
      path.join(tempDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // 7. Render video using local Revideo
    const outputFile = await renderVideo({
      projectFile: path.resolve(__dirname, '../../revideo/src/project.tsx'),
      settings: {
        logProgress: true,
        output: path.join(tempDir, 'output.mp4'),
        variables: metadata,
      },
    });

    // 8. Upload to cloud storage
    const uploadResult = await cloud.uploader.upload(outputFile, {
      resource_type: 'video',
      folder: 'videos',
    });

    // 9. Save to database
    const video = await VideoModel.create({
      createdBy: req.user._id,
      title,
      videoSource: uploadResult,
      scriptId: scriptResponse.script._id,
      language,
      accentOrDialect,
      voiceId: voiceResponse.voice._id,
      metadata, // Store the full metadata for reference
    });

    // 10. Cleanup
    await fs.rm(tempDir, { recursive: true });

    return successResponse({
      res,
      status: 201,
      message: "Video created successfully",
      data: { video },
    });

  } catch (error) {
    // Cleanup on error
    await fs.rm(tempDir, { recursive: true }).catch(() => {});
    console.error('Revideo generation failed:', error);
    next(new Error('Video generation failed: ' + error.message));
  }
});

// Helper function to fetch images (implement your logic)
async function fetchRelevantImages(script) {
  // This should return an array of image URLs
  return [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ];
}







// import { GoogleGenerativeAI } from "@google/generative-ai";
// import ScriptModel from "../../../db/models/Script.model.js";
// import asyncHandler from "../../../utils/response/error.response.js";
// import successResponse from "../../../utils/response/success.response.js";
// // import { scrapeText } from "../../video/helpers/scraper.js"; // Uncomment if needed
// // import { generateScriptWithAi } from "../../video/helpers/scriptGenerator.js"; // Uncomment if needed
// import searchImages from "../../../utils/imagesCollector/imagesCollector.js"; // Make sure this is implemented
// import { fileURLToPath } from "url";
// import path from "node:path";
// // import { bundle } from "@remotion/bundler"; // Not needed for Revideo
// // import { renderMedia, getCompositions } from "@remotion/renderer"; // Not needed for Revideo
// import { cloud } from "../../../utils/multer/cloudinary.multer.js";
// import VideoModel from "../../../db/models/Video.model.js";
// import { generateScriptUsingGimini } from "../helpers/generateScriptUsingGimini.js";
// import { createVoiceOver } from "../helpers/voiceover.js"; // Ensure this can return word timings or you have a separate STT step
// // import splitText from "../helpers/splitText.js"; // Uncomment if needed
// // import { generateAiAvatarWithCroma } from "../../aiAvatar/services/aiAvatar.service.js"; // Uncomment if needed
// // import generateScript4Product from "../helpers/generateScript4Product.js"; // Uncomment if needed
// // import VoiceActorModel from "../../../db/models/VoiceActor.model.js"; // Uncomment if needed
// // import { getFontLoader } from "../helpers/getfontLoader.js"; // Not needed for Revideo unless you plan to pass font files
// // import calculateFrames from "../helpers/calculateFrames.js"; // Not needed for Revideo
// // import uploadToCloud from "../helpers/uploadToCloud.js"; // You have cloudinary direct upload
// // import { generateAndUploadThumbnail } from "../helpers/generateAndUploadThumbnail.js.js"; // Uncomment if needed
// // import axios from "axios"; // Uncomment if needed
// import { renderVideo } from '@revideo/renderer';
// // import { REVIDEO_CONFIG } from '../../../config/revideo.config.js'; // Uncomment if needed
// import fs from 'fs/promises';
// import { v4 as uuidv4 } from 'uuid';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Helper function to get word timings (NEEDS PROPER IMPLEMENTATION)
// async function getWordTimestampsForScript(scriptText, audioUrl) {
//     // OPTION 1: If your TTS service (used in createVoiceOver) provides word timestamps, use them.
//     // This is a placeholder. You need to integrate with your TTS output or a separate STT service.
//     console.warn(`Workspaceing word timestamps for script: "${scriptText}". This is a placeholder and needs actual implementation.`);
//     // Example: Use a Speech-to-Text service with the generated audioUrl
//     // const transcriptWithTimestamps = await someSttService.transcribe(audioUrl, { includeWordTimestamps: true });
//     // return transcriptWithTimestamps.words.map(wordInfo => ({
//     //     punctuated_word: wordInfo.word,
//     //     start: wordInfo.startTime,
//     //     end: wordInfo.endTime
//     // }));

//     // FALLBACK / SIMPLIFIED (as in your original code - NOT RECOMMENDED for production)
//     return scriptText.split(' ').map((word, i) => ({
//         punctuated_word: word,
//         start: i * 0.5, // Highly inaccurate
//         end: (i + 1) * 0.5 // Highly inaccurate
//     }));
// }


// // Helper function to fetch images (Implement your actual logic here)
// async function fetchRelevantImages(scriptText, numberOfImages = 3) {
//     // Replace with your actual image fetching logic, e.g., using searchImages
//     console.log(`Workspaceing relevant images for script: "${scriptText.substring(0, 50)}..."`);
//     try {
//         // Assuming searchImages takes the script text and returns an array of image URLs
//         // const images = await searchImages(scriptText, numberOfImages);
//         // return images.map(img => img.url); // Adjust based on searchImages output

//         // Placeholder:
//         return [
//             "https://picsum.photos/seed/image1/1920/1080", // Using picsum for varied placeholders
//             "https://picsum.photos/seed/image2/1920/1080",
//             "https://picsum.photos/seed/image3/1920/1080"
//         ];
//     } catch (error) {
//         console.error("Failed to fetch images:", error);
//         return [ "https://picsum.photos/seed/error/1920/1080" ]; // Fallback image
//     }
// }

// export const generateVideoWithRevideo = asyncHandler(async (req, res, next) => {
//     const { userPrompt, type, language, accentOrDialect, customTextSettings } = req.body;

//     // Validate basic input
//     if (!userPrompt || !type || !language) {
//         return next(new Error('Missing required fields: userPrompt, type, or language.'));
//     }

//     // 1. Generate script
//     let scriptResponse, script, title;
//     try {
//         scriptResponse = await generateScriptUsingGimini({
//             req,
//             type,
//             userPrompt,
//             language
//         });
//         script = scriptResponse.formattedScript;
//         title = scriptResponse.title;
//         if (!script || !title) throw new Error("Script or title generation failed.");
//     } catch (error) {
//         console.error('Script generation failed:', error);
//         return next(new Error(`Script generation failed: ${error.message}`));
//     }

//     // 2. Generate voiceover
//     let voiceResponse, voiceoverUrl;
//     try {
//         voiceResponse = await createVoiceOver({
//             req,
//             title,
//             scriptText: script,
//             language,
//             accentOrDialect
//         });
//         voiceoverUrl = voiceResponse.voice.voiceSource.secure_url;
//         if (!voiceoverUrl) throw new Error("Voiceover URL not found in response.");
//     } catch (error) {
//         console.error('Voiceover generation failed:', error);
//         return next(new Error(`Voiceover generation failed: ${error.message}`));
//     }

//     // Create temporary directory
//     const tempDir = path.join(__dirname, 'temp_revideo', uuidv4());
//     await fs.mkdir(tempDir, { recursive: true });

//     try {
//         // 4. Generate word timings
//         //    THIS IS CRITICAL: Implement proper word timing generation.
//         //    The current method is a placeholder and will result in poor sync.
//         const words = await getWordTimestampsForScript(script, voiceoverUrl);
//         if (!words || words.length === 0) {
//             // Fallback if word generation fails, or handle more gracefully
//             // For now, we'll use the simplified split, but this isn't ideal.
//             console.warn("Word timestamp generation failed or returned empty. Using simplified split.");
//             // words = script.split(' ').map((word, i) => ({
//             //   punctuated_word: word,
//             //   start: i * 0.5,
//             //   end: (i + 1) * 0.5
//             // }));
//             // It's better to throw an error if accurate timings are essential
//              throw new Error("Failed to generate word timings for the script.");
//         }


//         // 5. Fetch relevant images
//         const images = await fetchRelevantImages(script); // Pass the script text

//         // 6. Prepare metadata matching your project.tsx structure
//         const metadata = {
//             images: images,
//             audioUrl: voiceoverUrl,
//             words: words,
//             textSettings: customTextSettings || {} // Pass any custom text settings from request
//         };

//         // (Optional) Write metadata to a local file for debugging or if your renderer needs it
//         // await fs.writeFile(
//         //   path.join(tempDir, 'metadata.json'),
//         //   JSON.stringify(metadata, null, 2)
//         // );

//         // 7. Render video using local Revideo
//         //    Ensure your projectFile path is correct and accessible.
//         const projectFilePath = path.resolve(__dirname, '../../../../../revideo-project/src/project.tsx'); // ADJUST THIS PATH to your actual Revideo project
        
//         // Check if project file exists
//         try {
//             await fs.access(projectFilePath);
//         } catch (e) {
//             console.error(`Revideo project file not found at: ${projectFilePath}`);
//             throw new Error(`Revideo project file not found. Please check the path. Searched at: ${projectFilePath}`);
//         }


//         console.log(`Starting Revideo rendering with metadata:`, JSON.stringify(metadata, null, 2));
//         const outputVideoPath = path.join(tempDir, 'output.mp4');
        
//         const renderResult = await renderVideo({
//             projectFile: projectFilePath,
//             variables: metadata, // Pass variables directly
//             output: outputVideoPath,
//             settings: { // Renderer specific settings
//                 logProgress: true,
//                 // concurrency: os.cpus().length // Example: use all CPU cores
//                 // You can add other @revideo/renderer specific settings here
//             },
//         });

//         console.log('Revideo rendering completed. Output:', renderResult.output);


//         // 8. Upload to cloud storage
//         const uploadResult = await cloud.uploader.upload(outputVideoPath, {
//             resource_type: 'video',
//             folder: 'revideo_videos', // Consider a different folder
//         });

//         // 9. Save to database
//         const video = await VideoModel.create({
//             createdBy: req.user._id,
//             title,
//             videoSource: uploadResult,
//             scriptId: scriptResponse.script._id,
//             language,
//             accentOrDialect,
//             voiceId: voiceResponse.voice._id,
//             metadata: { // Store the Revideo variables used
//                 imagesUsed: images.length,
//                 audioUrl: voiceoverUrl,
//                 wordCount: words.length,
//                 // textSettingsUsed: metadata.textSettings // If you want to store this
//             },
//         });

//         return successResponse({
//             res,
//             status: 201,
//             message: "Video created successfully with Revideo",
//             data: { video },
//         });

//     } catch (error) {
//         console.error('Revideo generation or upload failed:', error);
//         next(new Error('Video generation failed: ' + error.message + (error.stderr ? `\nRenderer Error: ${error.stderr}` : '')));
//     } finally {
//         // 10. Cleanup
//         await fs.rm(tempDir, { recursive: true, force: true }).catch(err => {
//             console.error(`Failed to remove temp directory ${tempDir}:`, err);
//         });
//     }
// });






// __________________________________________

// {
//   "userPrompt": "Tell me a short story about a brave robot exploring Mars.",
//   "type": "story", // Or whatever types your 'generateScriptUsingGimini' supports
//   "language": "en-US", // Or the language code your services support
//   "accentOrDialect": "en-US-Wavenet-D", // Specific voice/accent if your 'createVoiceOver' uses it
//   "customTextSettings": { // This is OPTIONAL, only if you implemented dynamic text settings
//     "fontSize": 70,
//     "currentWordColor": "yellow",
//     "numSimultaneousWords": 3
//     // ... any other settings from your 'captionSettings' interface you want to override
//   }
// }


// const metadata = {
//     images: ["url1.jpg", "url2.jpg", ...], // From fetchRelevantImages
//     audioUrl: "your_voiceover_secure_url.mp3", // From createVoiceOver
//     words: [ { punctuated_word: "Hello", start: 0.1, end: 0.5 }, ... ], // From getWordTimestampsForScript
//     textSettings: { fontSize: 70, ... } // From req.body or {}
// };