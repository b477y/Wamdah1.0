import mongoose from "mongoose";
import { AccentsAndDialects } from "../../utils/enum/enums.js";

const VoiceSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    scriptId: { type: mongoose.Types.ObjectId, ref: "Script", required: true },
    voiceSource: {
      secure_url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    accentOrDialect: {
      type: String,
      enum: Object.keys(AccentsAndDialects),
    },
    deletedAt: Date,
  },
  { timestamps: true }
);

const VoiceModel =
  mongoose.models.Voice || mongoose.model("Voice", VoiceSchema);
export default VoiceModel;
