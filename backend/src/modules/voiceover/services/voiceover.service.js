import asyncHandler from "../../../utils/response/error.response.js";
import axios from "axios";
import fs from "fs";
import msgpack5 from "msgpack5";
import successResponse from "../../../utils/response/success.response.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";

const API_URL = process.env.VOICE_API_URL;
const API_KEY = process.env.VOICE_API_KEY;

export const createVoiceOver = asyncHandler(async (req, res, next) => {
  const msgpack = msgpack5();
  const {
    title,
    text,
    referenceId = "eef8fc04ed1e4b7eb21323ef58be6008",
    format = "mp3",
  } = req.body;

  if (!text) {
    return next(new Error("Text is required", { cause: 400 }));
  }

  const requestData = {
    text,
    reference_id: referenceId,
    format,
  };

  const encodedData = msgpack.encode(requestData);

  try {
    const response = await axios.post(API_URL, encodedData, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/msgpack",
      },
      responseType: "arraybuffer",
    });

    // Save the audio file locally
    const outputFilePath = `../../../../output/voices/${Date.now()}.${format}`;
    fs.writeFileSync(outputFilePath, response.data);

    try {
      if (req.files?.images?.length) {
        const uploadPromises = req.files.images.map((file) =>
          cloud.uploader.upload(file.path, {
            folder: `${process.env.APP_NAME}/${req.user._id}/${title}/voice`,
          })
        );

        const uploadedImages = await Promise.all(uploadPromises);
        images = uploadedImages.map(({ secure_url, public_id }) => ({
          secure_url,
          public_id,
        }));
      }
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error uploading files", stack: error.message });
    }

    return successResponse({
      res,
      status: 201,
      message: "Voiceover created successfully",
      data: outputFilePath,
    });
  } catch (error) {
    console.error("Voiceover Error:", error);
    return next(new Error("Failed to generate voiceover", { cause: 500 }));
  }
});
