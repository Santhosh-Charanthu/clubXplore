const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const registrationSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  teamName: { type: String },
  teamMembers: [
    {
      type: Map,
      of: String,
    },
  ],
  submittedAt: { type: Date, default: Date.now },
});

// Ensure unique registrations per student and event
registrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
