import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import axios from "axios";
import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import { exec } from "node:child_process";

// Load API key from environment variables
const apiKey = process.env.HEYGEN_API_KEY;
const generateVideoUrl = "https://api.heygen.com/v2/video/generate";
const getVideoStatusUrl = "https://api.heygen.com/v1/video_status.get";

// brandon
// diran
// justo
// violante
// imelda

const avatarMap = {
  brandon: {
    name: "Brandon",
    avatar_id: "Brandon_expressive_public",
    voice_id: "3787b4ab93174952a3ad649209f1029a",
    avatar_image:
      "https://res.cloudinary.com/dlt1zyqli/image/upload/v1746192366/brandon_xhlyat.png",
  },
  diran: {
    name: "Diran",
    avatar_id: "Diran_Macbook_Casual_Front_public",
    voice_id: "1bd8ba4005004e6abfa46fad9ace1091",
    avatar_image:
      "https://res.cloudinary.com/dlt1zyqli/image/upload/v1746192360/diran_omhr8x.png",
  },
  justo: {
    name: "Justo",
    avatar_id: "Justo_EmployeeTraining_Front_public",
    voice_id: "49d1050d0a764f1394587a6d2409ea80",
    avatar_image:
      "https://res.cloudinary.com/dlt1zyqli/image/upload/v1746192366/justo_kvanft.png",
  },
  violante: {
    name: "Violante",
    avatar_id: "Violante_Brown_Suit_Front_public",
    voice_id: "1edc5e7338eb4e37b26dc8eb3f9b7e9c",
    avatar_image:
      "https://res.cloudinary.com/dlt1zyqli/image/upload/v1746192362/violante_drbaio.png",
  },
  imelda: {
    name: "Imelda",
    avatar_id: "Imelda_Casual_Front_public",
    voice_id: "3193b827155a485c9ba08adc05a4a509",
    avatar_image:
      "https://res.cloudinary.com/dlt1zyqli/image/upload/v1746192362/imelda_tvlgma.png",
  },
};

export const retrieveAiAvatars = asyncHandler(async (req, res, next) => {
  const avatars = Object.values(avatarMap).map((avatar) => {
    return {
      name: avatar.name,
      avatar_id: avatar.avatar_id,
      avatar_image: avatar.avatar_image,
    };
  });

  return successResponse({
    res,
    status: 200,
    message: "AI Avatars retrieved successfully",
    data: avatars,
  });
});

export const generateVideo = asyncHandler(async (req, res, next) => {
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
          value: "#00FF00",
        },
      },
    ],
    dimension: {
      width: 720,
      height: 1280,
    },
  };

  try {
    // Step 1: Generate video
    const response = await axios.post(generateVideoUrl, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
    });

    if (response.data.error) {
      return res.status(500).json({ message: response.data.error.message });
    }

    const videoId = response.data.data.video_id;

    // Step 2: Poll until video is ready
    let statusData;
    let attempts = 0;
    const maxAttempts = 240; // Max retries (e.g., 20 mins)
    do {
      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Video processing timeout" });
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const statusRes = await axios.get(
        `${getVideoStatusUrl}?video_id=${videoId}`,
        {
          headers: {
            "X-Api-Key": apiKey,
          },
        }
      );

      if (statusRes.data.code !== 100) {
        return res.status(500).json({ message: statusRes.data.message });
      }

      statusData = statusRes.data.data;
      if (statusData.status !== "completed") {
        console.log(`Status: ${statusData.status}...`);
      }

      attempts++;
    } while (statusData.status !== "completed");

    // Step 3: Download the video
    const videoUrl = statusData.video_url;
    const timestamp = Date.now(); // generate once
    const fileName = `${speaker}_${timestamp}.mp4`;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const videosDir = path.resolve(
      __dirname,
      "../../../../../remotion/public/videos"
    );
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    const outputPath = path.join(videosDir, fileName);
    const outputAbsolutePath = path.resolve(outputPath);
    console.log(outputAbsolutePath);

    const videoStream = await axios.get(videoUrl, {
      responseType: "stream",
      timeout: 3600000,
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputPath);
      videoStream.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(`Video saved locally at ${outputPath}`);

    // Step 4: Remove green background and convert to webm format with transparency
    const outputWebm = path.join(videosDir, `${speaker}_${timestamp}.webm`);

    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i "${outputPath}" -vf "chromakey=0x00FF00:0.3:0.0" -c:v libvpx -pix_fmt yuva420p -auto-alt-ref 0 "${outputWebm}" -y`,
        (error, stdout, stderr) => {
          if (error) {
            console.error("Error removing background:", stderr);
            return reject(error);
          }
          console.log(
            "Background removed and converted to .webm successfully."
          );
          resolve();
        }
      );
    });

    // Step 5: Upload to Cloudinary
    const cloudUploadResult = await cloud.uploader.upload(outputWebm, {
      folder: `${process.env.APP_NAME}/${req.user._id}/${req.body.title}/ai-avatar-video`,
      resource_type: "video",
    });

    return successResponse({
      res,
      status: 200,
      message: "Video generated and uploaded successfully",
      data: {
        videoSource: {
          public_id: cloudUploadResult.public_id,
          secure_url: cloudUploadResult.secure_url,
          fileName: `${speaker}_${timestamp}.webm`,
        },
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while generating the video." });
  }
});
