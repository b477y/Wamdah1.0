import mongoose from "mongoose";

const VoiceSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    scriptId: { type: mongoose.Types.ObjectId, ref: "Script", required: true },
    voiceSource: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    deletedAt: Date,
  },
  { timestamps: true }
);

const VoiceModel =
  mongoose.models.Voice || mongoose.model("Voice", VoiceSchema);
export default VoiceModel;
