import axios from "axios";
import ScriptModel from "../../../db/models/Script.model.js";
import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { scrapeText } from "../helpers/scraper.js";
import { generateScriptWithAi } from "../helpers/scriptGenerator.js";
import searchImages from "../../../utils/imagesCollector/imagesCollector.js";

export const generateScript = asyncHandler(async (req, res, next) => {
  const { url } = req.body;

  // Scrape the content from the URL
  const scrapedText = await scrapeText(url);

  // Generate the script from the scraped text
  const generatedScript = await generateScriptWithAi(scrapedText);

  // Send the generated script back as a response

  const script = await ScriptModel.create({
    content: generatedScript,
    createdBy: req.user._id,
    generatedByAi: true,
  });

  return successResponse({
    res,
    status: 201,
    message: "Script generated successfully",
    data: script,
  });
});

export const generateScriptUsingAi = async (req, res, next) => {
  const API_KEY = process.env.GROQ_API_KEY;
  const { type, userPrompt, language, accentOrDialect } = req.body;

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
          The content for this video is: ${userPrompt}
          Please structure the script as follows:
          - Break the content into short, easy-to-read sentences that fit within 3 seconds when spoken.
          - Use natural, engaging language, as if speaking directly to the audience.
          - Avoid long sentences, complex phrases, or unnecessary punctuation.
          - Ensure the script flows naturally and smoothly, without line breaks or section titles.
          - Output should be plain text with sentences separated by a ".".
          - End with a clear and actionable sentence that encourages engagement.
          - All the script should be in ${language}.
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
        timeout: 120000,
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
            The following is a video script:
            
            "${generatedScript}"
            
            Task:
            1. If the script is in Arabic, translate it to English.
            2. Identify one single keyword (or at most 2 words) that best represents the central topic of the script.
            3. Return ONLY that keyword, without any explanation or punctuation.
            `,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
        timeout: 120000,
      }
    );

    let title = keywordResponse.data.choices[0].message.content.trim();
    console.log("Extracted Title (One-word Keyword):", title);

    const script = await ScriptModel.create({
      content: generatedScript,
      createdBy: req.user._id,
      generatedByAi: true,
    });

    await searchImages(title);

    successResponse({
      res,
      status: 200,
      message: "Script generated and images fetched successfully",
      data: { script, formattedScript: generatedScript, title },
    });
  } catch (error) {
    console.error("Error generating script:", error);
    next(error);
  }
};
