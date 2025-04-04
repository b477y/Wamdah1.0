import mongoose from "mongoose";

const VideoSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    videoSource: { secure_url: String, public_id: String, required: true },
    scriptId: { type: mongoose.Types.ObjectId, ref: "Script", required: true },
    voiceId: { type: mongoose.Types.ObjectId, ref: "Voice", required: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

const VideoModel =
  mongoose.models.Video || mongoose.model("Video", VideoSchema);
export default VideoModel;
