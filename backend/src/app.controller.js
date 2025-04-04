import connect2db from "./db/connection.js";
import errorHandlingMiddleware from "./middlewares/errorHandling.middleware.js";
import cors from "cors";
import videoController from "./modules/video/video.controller.js";
import voiceController from "./modules/voiceover/voiceover.controller.js";
import scriptController from "./modules/script/script.controller.js";

const bootstrap = (app, express) => {
  app.use(express.json());
  app.use(cors({ origin: "*" }));

  app.use("/api/videos", videoController);
  app.use("/api/voices", voiceController);
  app.use("/api/scripts", scriptController);

  app.get("", (req, res, next) => {
    return res.status(200).json({ message: `${process.env.APP_NAME}` });
  });

  app.all("*", (req, res) => {
    return res.status(404).json({ message: "Invalid routing" });
  });

  app.use(errorHandlingMiddleware);

  connect2db();
};

export default bootstrap;
