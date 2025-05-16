import axios from "axios";
import * as fs from "fs";
import { createClient } from "@deepgram/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const deepgram = createClient(process.env["DEEPGRAM_API_KEY"] || "");
const genAI = new GoogleGenerativeAI(process.env["GEMINI_API_KEY"] || "");

export async function getWordTimestamps(audioFilePath: string) {
	const { result } = await deepgram.listen.prerecorded.transcribeFile(fs.readFileSync(audioFilePath), {
		model: "nova-2",
		smart_format: true,
	});
	if (result) {
		return result.results.channels[0].alternatives[0].words;
	} else {
		throw Error("transcription result is null");
	}
}

export async function generateAudio(text: string, savePath: string) {
	const response = await axios.post(
		process.env.FISHAUDIO_TTS_URL || "https://api.fishaudio.io/tts",
		{ text },
		{ responseType: "arraybuffer" }
	);

	fs.writeFileSync(savePath, response.data);
}

export async function getVideoScript(videoTopic: string) {
	const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

	const prompt = `Create a script for a YouTube Short. The script should be around 60–80 words and start with a catchy hook like “Did you know that?” or “This will blow your mind.” No hashtags or meta info. Just the VOICEOVER for this topic: "${videoTopic}".`;

	const result = await model.generateContent(prompt);
	const text = result.response.text().trim();

	if (text) return text;
	else throw Error("Gemini returned empty script.");
}

export async function getImagePromptFromScript(script: string) {
	const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

	const prompt = `Write a short (1-sentence) creative and visual prompt for generating a video background image based on the following voiceover script:\n\n"${script}"\n\nReturn only the prompt and nothing else.`;

	const result = await model.generateContent(prompt);
	const text = result.response.text().trim();

	if (text) return text;
	else throw Error("Gemini returned empty image prompt.");
}

export async function generateImageWithReplicate(prompt: string, savePath: string) {
	const replicateApiKey = process.env.REPLICATE_API_KEY;
	if (!replicateApiKey) throw new Error("Missing REPLICATE_API_KEY");

	const response = await axios.post(
		"https://api.replicate.com/v1/predictions",
		{
			version: "db21e45c370b43c99b71de78fe7f265e63a056264bfa9114d6d6a39d85b6df0b", // SDXL 1.0
			input: {
				prompt: prompt,
				width: 1024,
				height: 1024,
			}
		},
		{
			headers: {
				Authorization: `Token ${replicateApiKey}`,
				"Content-Type": "application/json",
			}
		}
	);

	const getUrl = response.data.urls.get;
	let status = response.data.status;
	let outputUrl;

	// Poll until image is ready
	while (status !== "succeeded" && status !== "failed") {
		await new Promise(resolve => setTimeout(resolve, 3000));
		const result = await axios.get(getUrl, {
			headers: {
				Authorization: `Token ${replicateApiKey}`,
			}
		});
		status = result.data.status;
		outputUrl = result.data.output?.[0];
	}

	if (!outputUrl) throw new Error("No image URL returned from Replicate");

	const imageRes = await axios.get(outputUrl, { responseType: "arraybuffer" });
	fs.writeFileSync(savePath, imageRes.data);
}
