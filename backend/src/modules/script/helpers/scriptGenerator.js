import axios from "axios";

export const generateScriptWithAi = async (scrapedText) => {
  const API_KEY = process.env.GROQ_API_KEY; // Replace with your actual Groq API key

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions", // Adjust URL if needed
      {
        model: "llama-3.3-70b-versatile", // High-quality AI model
        messages: [
          {
            role: "user",
            content: `
            You are a creative ad copywriter. Create a short, engaging video voice-over script to promote a product using the details below.
            
            Rules:
            - Write short sentences that can each be spoken aloud in 3 seconds.
            - Use a natural, friendly tone — like a person casually talking to the viewer.
            - Separate each sentence with a period (.) so they can be split later.
            - Focus only on the product — ignore any unrelated content (login, signup, footer, etc.).
            - Don't use headings or bullet points — just one flowing script.
            - End with a clear call to action like “Get yours now!” or “Try it today!”
            
            Product info:
            ${scrapedText}
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

    return response.data.choices[0].message.content; // Returning the generated script
  } catch (error) {
    console.error("Error generating script:", error);
    throw new Error("Failed to generate script");
  }
};
