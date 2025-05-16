import { Router } from "express";
import * as testingService from "./services/testing.service.js";
import authentication from "../../middlewares/authentication.middleware.js";

const router = Router();

// router.post(
//   "/generate-ad-testing",
//   authentication(),
//   testingService.generateScript4Product
// );
// router.post("/generate", authentication(), testingService.generateScriptUsingGimini);

// router.post('/generate-video', async (req, res) => {
//   try {
//     const { words, images, audioUrl } = req.body;

//     // ✅ Save metadata to Revideo project
//     const metadataPath = path.join(__dirname, '../../revideo/metadata.json');
//     fs.writeFileSync(metadataPath, JSON.stringify({ words, images, audioUrl }, null, 2));

//     // ✅ Run Revideo project (this generates the video)
//     const command = `cd ${path.join(__dirname, '../../revideo')} && npx revideo build --out ../backend/output`;
//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error: ${stderr}`);
//         return res.status(500).send("Failed to generate video");
//       }

//       // ✅ Return or stream video
//       const videoPath = path.join(__dirname, '../output/scene.mp4');
//       res.download(videoPath);
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

export default router;
