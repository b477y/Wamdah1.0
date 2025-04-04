import mongoose from "mongoose";

const ScriptSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    generatedByAi: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

const ScriptModel =
  mongoose.models.Script || mongoose.model("Script", ScriptSchema);
export default ScriptModel;
