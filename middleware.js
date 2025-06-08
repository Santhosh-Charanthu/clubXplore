const mongoose = require("mongoose");
const clubJoiSchema = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");

module.exports.isLoggedIn = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "Login to continue!");
    return res.redirect("/studentRegistration/login");
  }
  next();
};

module.exports.savedRedirectUrl = async (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
    delete req.session.redirectUrl;
  }
  next();
};

module.exports.validateClub = async (req, res, next) => {
  const { error } = clubJoiSchema.validate(req.body);
  if (error) {
    const errMsg = error.details.map((el) => el.message).join(", ");
    req.flash("error", errMsg);
    return res.redirect("/clubRegistration"); // redirect back to the form
  }
  next();
};

module.exports.isUserLoggedIn = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "Login to continue!");
    return res.redirect("/collegeRegistration/login");
  }
  next();
};
