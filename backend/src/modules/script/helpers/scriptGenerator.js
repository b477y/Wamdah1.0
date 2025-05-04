import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateScriptWithAi = async (
  scrapedText,
  language = "English"
) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a creative ad copywriter. Create a short, engaging video voice-over script in ${language} to promote a product using the details below.

Rules:
- Write short, clear sentences that can be spoken in 3 seconds.
- Use only **one punctuation mark at the end** of each sentence — prefer a period (.) or exclamation mark (!) — but not both.
- Avoid repeating punctuation (e.g., . . or ! .).
- Use a natural, friendly tone as if speaking directly to the audience.
- Avoid headings, bullet points, or line breaks.
- Focus strictly on product-related info — ignore unrelated text like login/signup.
- End with a strong call to action like “Get yours now!” or “Try it today!”.
- All content should be written in ${language}.
- Ensure the script contains at least 12-24 short sentences for a ~30s - ~60s video.

Product Info:
${scrapedText}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // 🧼 Optional cleanup: remove repeated punctuation (". .", "! .", etc.)
    text = text.replace(/(\.|\!)[\s]*\.(?=\s|$)/g, "$1"); // replaces ". ." and "! ." with "."
    text = text.replace(/\.{2,}/g, "."); // replaces any ".." with "."
    text = text.replace(/!{2,}/g, "!"); // replaces "!!" with "!"
    text = text.replace(/\s{2,}/g, " "); // collapse multiple spaces

    return text;
  } catch (error) {
    console.error("Error generating script with Gemini:", error);
    throw new Error("Failed to generate script");
  }
};
