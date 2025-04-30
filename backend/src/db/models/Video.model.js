import mongoose from "mongoose";
import { AccentsAndDialects, Genders, Languages } from "../../utils/enum/enums.js";

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
    voiceGender: { type: String, enum: Object.keys(Genders), required: false },
    deletedAt: Date,
  },
  { timestamps: true }
);
// voiceId: { type: mongoose.Types.ObjectId, ref: "Voice", required: true },

const VideoModel =
  mongoose.models.Video || mongoose.model("Video", VideoSchema);
export default VideoModel;
