const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const registrationSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  formData: { type: Map, of: String },
  teamName: { type: String },
  teamMembers: [
    {
      name: { type: String },
      mobile: { type: String },
      registrationNumber: { type: String },
      branch: { type: String },
    },
  ],
  submittedAt: { type: Date, default: Date.now },
});

registrationSchema.path("teamMembers").validate(function (teamMembers) {
  if (!teamMembers || teamMembers.length === 0) return true;
  return teamMembers.every(
    (member) =>
      member.name && member.mobile && member.registrationNumber && member.branch
  );
}, "All team member fields are required if teamMembers is provided.");

module.exports = mongoose.model("Registration", registrationSchema);
