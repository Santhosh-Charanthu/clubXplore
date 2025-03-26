const Joi = require("joi");

const clubJoiSchema = Joi.object({
  ClubName: Joi.string().required().min(1), // You might want to adjust min length based on your needs

  branchName: Joi.string().required().min(1),

  ClubLogo: Joi.object({
    url: Joi.string().uri().optional(), // Validates that it's a valid URL
    filename: Joi.string().optional(),
  }).optional(),

  author: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/) // Validates MongoDB ObjectId format
    .optional(),

  events: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)) // Array of MongoDB ObjectIds
    .optional(),
});

module.exports = clubJoiSchema;
