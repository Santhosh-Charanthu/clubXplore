// models/Invitation.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const invitationSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  registrationId: {
    type: Schema.Types.ObjectId,
    ref: "Registration",
    required: true,
  }, // ✅ link to registration
  senderId: { type: Schema.Types.ObjectId, ref: "Student", required: true }, // team leader
  receiverId: { type: Schema.Types.ObjectId, ref: "Student" }, // teammate (if exists)
  receiverEmail: { type: String, required: true }, // email entered by leader
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Invitation", invitationSchema);
