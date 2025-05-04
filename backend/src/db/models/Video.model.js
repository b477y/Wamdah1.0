import mongoose from "mongoose";
import {
  AccentsAndDialects,
  Genders,
  Languages,
} from "../../utils/enum/enums.js";
import UserModel from "./User.model.js";

const VideoSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    videoSource: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    scriptId: { type: mongoose.Types.ObjectId, ref: "Script", required: true },
    duration: { type: Number },
    thumbnailUrl: { type: String },
    language: { type: String, enum: Object.keys(Languages) },
    accentOrDialect: { type: String, enum: Object.keys(AccentsAndDialects) },
    voiceId: { type: mongoose.Types.ObjectId, ref: "Voice", required: false },
    deletedAt: Date,
  },
  { timestamps: true }
);
// voiceId: { type: mongoose.Types.ObjectId, ref: "Voice", required: true },

VideoSchema.post("save", async function (doc, next) {
  try {
    await UserModel.findByIdAndUpdate(doc.createdBy, {
      $inc: { aiCredits: -5 },
    });

    next();
  } catch (err) {
    next(err);
  }
});

const VideoModel =
  mongoose.models.Video || mongoose.model("Video", VideoSchema);
export default VideoModel;
