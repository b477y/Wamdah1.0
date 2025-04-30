import searchImages from "../../../utils/imagesCollector/imagesCollector.js";
import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import axios from "axios";

export const collectImages = asyncHandler(async (req, res, next) => {
  try {

    const { query } = req.body;
    const images = await searchImages(query);

    successResponse({
      res,
      status: 200,
      message: "Images retrieved successfully",
      data: { images },
    });
  } catch (error) {
    next(error);
  }
});

export const generateScriptWithAi = async (req, res, next) => {
  const API_KEY = process.env.GROQ_API_KEY;
  const { type, userContent } = req.body;

  const typePrompts = {
    motivational:
      "Create an uplifting and motivating script to inspire the audience.",
    advertisement:
      "Create a persuasive advertisement script highlighting the benefits of a product or service.",
    script:
      "Write a general-purpose, engaging script that can work for various video types.",
  };

  const typePrompt = typePrompts[type];

  if (!typePrompt) {
    return next(new Error("Invalid video type"));
  }

  try {
    const fullPrompt = `
          ${typePrompt} 
          The content for this video is: ${userContent}
          Please structure the script as follows:
          - Break the content into short, easy-to-read sentences that fit within 3 seconds when spoken.
          - Use natural, engaging language, as if speaking directly to the audience.
          - Avoid long sentences, complex phrases, or unnecessary punctuation.
          - Ensure the script flows naturally and smoothly, without line breaks or section titles.
          - Output should be plain text with sentences separated by a ".".
          - End with a clear and actionable sentence that encourages engagement.
        `;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: fullPrompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    const generatedScript = response.data.choices[0].message.content;

    const keywordResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `
                The following is a script for a video:
                "${generatedScript}"
                Please extract a meaningful one-word title or keyword that represents the content of this script for a Google image search.
              `,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    let title = keywordResponse.data.choices[0].message.content.trim();
    console.log("Extracted Title (One-word Keyword):", title);

    const images = await searchImages(title);

    successResponse({
      res,
      status: 200,
      message: "Script generated and images fetched successfully",
      data: { formattedScript: generatedScript, title, images },
    });
  } catch (error) {
    console.error("Error generating script:", error);
    next(error);
  }
};
