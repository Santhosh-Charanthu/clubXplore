const { required } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const studentSchema = new Schema({
  studentName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  regNo: {
    type: String,
    required: true,
    unique: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "College",
  },
  role: {
    type: String,
    required: true,
  },

  registeredEvents: [{ type: Schema.Types.ObjectId, ref: "Event" }],
});

studentSchema.plugin(passportLocalMongoose, { usernameField: "email" });

module.exports = mongoose.model("Student", studentSchema);
