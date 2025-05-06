import mongoose from "mongoose";

const CreditPurchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    credits: { type: Number, required: true },
    egpAmount: { type: String, required: true },
    paymentProvider: { type: String, default: "Vodafone Cash" },
    paymentReference: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Success", "Failed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const CreditPurchaseModel =
  mongoose.models.CreditPurchase ||
  mongoose.model("CreditPurchase", CreditPurchaseSchema);
export default CreditPurchaseModel;
