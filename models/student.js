const { required } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const studentSchema = new Schema({
  studentName: {
    type: String,
    required: true,
  },
  college: {
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
  role: {
    type: String,
    required: true,
  },
});

studentSchema.plugin(passportLocalMongoose, { usernameField: "regNo" });

module.exports = mongoose.model("Student", studentSchema);
