import ScriptModel from "../../../db/models/Script.model.js";
import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { scrapeText } from "../helpers/scraper.js";
import { generateScriptWithAi } from "../helpers/scriptGenerator.js";

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
