import asyncHandler from "../../../utils/response/error.response.js";
import successResponse from "../../../utils/response/success.response.js";
import { scrapeText } from "../helpers/scraper.js";
import { generateScriptWithAi } from "../helpers/scriptGenerator.js";

export const generateScript = asyncHandler(async (req, res, next) => {
  const { url } = req.body;

  // Scrape the content from the URL
  const scrapedText = await scrapeText(url);

  // Generate the script from the scraped text
  const script = await generateScriptWithAi(scrapedText);

  // Send the generated script back as a response

  return successResponse({
    res,
    status: 201,
    message: "Script generated successfully",
    data: script,
  });
});
