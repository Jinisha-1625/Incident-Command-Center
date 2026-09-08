import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    incident: { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true, index: true },
    type: {
      type: String,
      enum: [
        "created",
        "assigned",
        "reassigned",
        "reassignment_requested",
        "comment",
        "handoff",
        "status",
        "resolved",
      ],
      required: true,
    },
    message: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hidden: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

eventSchema.index({ incident: 1, createdAt: 1 });

eventSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const IncidentEvent = mongoose.model("IncidentEvent", eventSchema);
