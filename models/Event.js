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