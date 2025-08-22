const { required, string } = require("joi");
const mongoose = require("mongoose");
const { type } = require("os");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const clubSchema = new Schema({
  ClubName: {
    type: String,
    required: true,
    unique: true,
  },
  branchName: {
    type: String,
    required: true,
  },
  clubDescription: {
    type: String,
    required: true,
  },
  ClubLogo: {
    url: String,
    filename: String,
  },
  facultyCoordinators: [
    {
      name: String,
      email: String,
      phoneNumber: String,
    },
  ],

  studentCoordinators: [
    {
      name: String,
      email: String,
      phoneNumber: String,
    },
  ],

  socialMediaLink: [
    {
      name: String,
      link: String,
    },
  ],

  Achievements: {
    type: String,
  },

  establishedYear: {
    type: String,
  },

  author: {
    type: Schema.Types.ObjectId,
    ref: "College",
  },
  events: [
    {
      type: Schema.Types.ObjectId,
      ref: "Event",
    },
  ],
  role: {
    type: String,
    required: true,
  },
});

clubSchema.plugin(passportLocalMongoose, { usernameField: "ClubName" });
module.exports = mongoose.model("Club", clubSchema);
