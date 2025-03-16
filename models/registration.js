// models/registration.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const registrationSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  formData: { type: Map, of: String }, // Stores key-value pairs of field labels and student inputs
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Registration", registrationSchema);
