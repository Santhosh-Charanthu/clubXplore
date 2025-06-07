const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Reusable coordinator schema
const coordinatorSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be a 10-digit number",
    }),
});

// Reusable social media link schema
const socialMediaLinkSchema = Joi.object({
  name: Joi.string().required(),
  link: Joi.string().uri().required(),
});

// Final Club Joi schema
const clubJoiSchema = Joi.object({
  ClubName: Joi.string().required().min(1),
  branchName: Joi.string().required().min(1),
  clubDescription: Joi.string().required(),

  password: Joi.string().required().min(5).label("Password"),

  ClubLogo: Joi.object({
    url: Joi.string().uri().optional(),
    filename: Joi.string().optional(),
  }).optional(),

  facultyCoordinators: Joi.array().items(coordinatorSchema).required(),
  studentCoordinators: Joi.array().items(coordinatorSchema).required(),

  socialMediaLink: Joi.array().items(socialMediaLinkSchema).optional(),

  Achievements: Joi.string().optional(),
  establishedYear: Joi.string()
    .pattern(/^\d{4}$/)
    .optional()
    .messages({
      "string.pattern.base": "Established year must be a 4-digit year",
    }),

  author: Joi.string().pattern(objectIdPattern).optional(),

  events: Joi.array().items(Joi.string().pattern(objectIdPattern)).optional(),
});

module.exports = clubJoiSchema;
