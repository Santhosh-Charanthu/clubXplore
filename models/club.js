const { required, string } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const clubSchema = new Schema({
  ClubName: {
    type: String,
    required: true,
    unique: true,
  },
  ClubLogo: {
    url: String,
    filename: String,
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
});

clubSchema.plugin(passportLocalMongoose, { usernameField: "ClubName" });
module.exports = mongoose.model("club", clubSchema);
