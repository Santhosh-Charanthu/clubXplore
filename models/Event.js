const { required } = require("joi");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  eventName: {
    type: String,
    required: true,
  },
  eventDetails: {
    type: String,
    required: true,
  },
  image: {
    url: String,
    filename: String,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "club",
  },
});

module.exports = mongoose.model("Event", eventSchema);
