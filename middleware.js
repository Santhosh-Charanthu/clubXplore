const mongoose = require("mongoose");
const clubJoiSchema = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");

module.exports.isLoggedIn = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "Login to continue!");
    return res.redirect("/login");
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
    return res.redirect("/login");
  }
  next();
};

module.exports.isCorrectClub = (req, res, next) => {
  if (req.user && req.user.role == "student") {
    return next();
  }
  if (!req.session.club) {
    req.flash("error", "Please log in as a club first.");
    return res.redirect("/clubRegistration/login");
  }

  // check if the club in URL matches the one in session
  const clubInUrl = req.params.clubName; // assuming route like "/:ClubName/profile"
  if (clubInUrl !== req.session.club.ClubName) {
    req.flash("error", "You are not authorized to access this club's page.");
    return res.redirect(`/${req.session.club.ClubName}/profile`);
  }

  next();
};
