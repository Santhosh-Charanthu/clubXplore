const { required } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const collegeSchema = new Schema({
  college: {
    type: String,
    required: true,
    unique: true,
  },
  collegeId: {
    type: String,
    required: true,
    unique: true,
  },
  collegeLogo: {
    url: String,
    filename: String,
  },
  principalName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
  },
  establishedYear: {
    type: Number,
    required: true,
    min: 1800,
  },
  address: {
    type: String,
    required: true,
  },
  collegeType: {
    type: String,
    required: true,
  },
  affiliatedUniversity: {
    type: String,
  },
  clubs: [
    {
      type: Schema.Types.ObjectId,
      ref: "Club", // Ensure the reference matches the actual model name
    },
  ],
  role: {
    type: String,
    required: true,
  },
});

collegeSchema.plugin(passportLocalMongoose, { usernameField: "college" });

module.exports = mongoose.model("College", collegeSchema);
