// Event.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  eventName: { type: String, required: true },
  eventDetails: { type: String, required: true },
  image: { url: String, filename: String },
  visibility: {
    type: String,
    required: true,
    enum: ["collegeExclusive", "openToAll"], // Restrict to valid values
    default: "collegeExclusive", // Set a default value
  },
  branchVisibility: {
    type: String,
    required: true,
    enum: ["branchExclusive", "openToAllBranches"],
    default: "openToAll",
  },
  branchName: {
    type: String,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationDeadline: { type: Date, required: true },
  mode: {
    type: String,
    required: true,
    enum: ["online", "offline", "hybrid"],
  },
  venue: { type: String }, // For offline/hybrid
  meetingLink: { type: String }, // For online/hybrid

  // 👥 Organizer Details
  coordinators: [
    {
      name: String,
      contact: String,
    },
  ],

  // 🎫 Registration Rules
  registrationRequired: { type: Boolean, default: true },
  participantLimit: { type: Number },
  eligibility: { type: String }, // Optional note
  teamSize: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 1 },
  },

  // 🏆 Extras
  rewards: { type: String }, // Description of rewards
  sponsors: [{ name: String, logoUrl: String }],
  agenda: { type: String }, // Optional detailed schedule

  // 🔒 Admin Controls
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  createdAt: { type: Date, default: Date.now },
  author: { type: Schema.Types.ObjectId, ref: "Club" },
  registeredStudents: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  formFields: [
    {
      label: { type: String, required: true },
      type: {
        type: String,
        required: true,
        enum: ["text", "email", "number", "checkbox"], // Restrict types
      },
      isRequired: { type: Boolean, default: false },
    },
  ],
});

module.exports = mongoose.model("Event", eventSchema);
