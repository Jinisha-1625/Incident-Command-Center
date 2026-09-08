import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    severity: { type: String, enum: ["SEV-1", "SEV-2", "SEV-3", "SEV-4"], required: true },
    severityRank: { type: Number, required: true, index: true },
    status: {
      type: String,
      enum: ["open", "acknowledged", "mitigated", "resolved"],
      default: "open",
      index: true,
    },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolutionSummary: { type: String, default: "" },
    searchText: { type: String, default: "" },
    lockVersion: { type: Number, default: 0 },
    reassignmentRequested: { type: Boolean, default: false },
  },
  { timestamps: true }
);

incidentSchema.index({ searchText: "text" });
incidentSchema.index({ status: 1, severityRank: 1, updatedAt: -1 });

incidentSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Incident = mongoose.model("Incident", incidentSchema);
