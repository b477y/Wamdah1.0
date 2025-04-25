import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import axios from "axios";
import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";

const apiKey = process.env.HEYGIN_API_KEY;
const generateVideoUrl = "https://api.heygen.com/v2/video/generate";
const getVideoStatusUrl = "https://api.heygen.com/v1/video_status.get";

const avatarMap = {
  brandon: {
    avatar_id: "Brandon_expressive_public",
    voice_id: "3787b4ab93174952a3ad649209f1029a",
  },
  lina: {
    avatar_id: "Lina_Casual_Front_2_public",
    voice_id: "119caed25533477ba63822d5d1552d25",
  },
};

export const generateVideo = asyncHandler(async (req, res) => {
  const { speaker, script } = req.body;

  if (!speaker || !script) {
    return res.status(400).json({
      message: "Missing required fields: speaker and script",
    });
  }

  const avatarData = avatarMap[speaker.toLowerCase()];
  if (!avatarData) {
    return res.status(400).json({
      message: "Invalid speaker selected. Choose 'brandon' or 'lina'",
    });
  }

  const requestBody = {
    video_inputs: [
      {
        character: {
          type: "avatar",
          avatar_id: avatarData.avatar_id,
          avatar_style: "normal",
        },
        voice: {
          type: "text",
          input_text: script,
          voice_id: avatarData.voice_id,
        },
        background: {
          type: "color",
          value: "#FFFFFF",
        },
      },
    ],
    dimension: {
      width: 720,
      height: 1280,
    },
  };

  // Step 1: Generate video
  const response = await fetch(generateVideoUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();
  if (data.error) {
    return res.status(500).json({ message: data.error.message });
  }

  const videoId = data.data.video_id;

  // Step 2: Poll until video is ready
  let statusData;
  do {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const statusRes = await fetch(`${getVideoStatusUrl}?video_id=${videoId}`, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    const statusJson = await statusRes.json();
    if (statusJson.code !== 100) {
      return res.status(500).json({ message: statusJson.message });
    }

    statusData = statusJson.data;
    if (statusData.status !== "completed") {
      console.log(`Status: ${statusData.status}...`);
    }
  } while (statusData.status !== "completed");

  // Step 3: Download the video
  const videoUrl = statusData.video_url;
  const fileName = `${speaker}_${Date.now()}.mp4`;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const videosDir = path.resolve(__dirname, "../../../../../remotion/public/videos");
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const outputPath = path.join(videosDir, fileName);
  const outputAbsolutePath = path.resolve(outputPath);
  console.log(outputAbsolutePath);

  const videoStream = await axios({
    url: videoUrl,
    method: "GET",
    responseType: "stream",
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(outputPath);
    videoStream.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(`Video saved locally at ${outputPath}`);

  // Step 4: Upload to Cloudinary
  const cloudUploadResult = await cloud.uploader.upload(outputPath, {
    folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}/ai-avatar-video`,
    resource_type: "auto",
  });

  // Optional: Remove local file after upload

  return successResponse({
    res,
    status: 200,
    message: "Video generated successfully",
    data: {
      videoSource: {
        public_id: cloudUploadResult.public_id,
        secure_url: cloudUploadResult.secure_url,
        fileName,
      },
    },
  });
});
