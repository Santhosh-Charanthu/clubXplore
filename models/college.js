const { required } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const collegeSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("College", collegeSchema);
