const express = require("express");
const router = express.Router();
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const multer = require("multer");
const { storage } = require("../cloudconfig");
const upload = multer({ storage: storage });
const collegeController = require("../controllers/collegeController");
const { isUserLoggedIn } = require("../middleware");

router
  .route("/collegeRegistration/signup")
  .get(collegeController.showRegistrationForm)
  .post(upload.single("collegeLogo"), collegeController.handleRegistration);

router
  .route("/collegeRegistration/login")
  .get(collegeController.showLoginForm)
  .post(
    passport.authenticate("college", {
      failureRedirect: "/collegeRegistration/login",
      failureFlash: true,
    }),
    collegeController.handleLogin
  );

router
  .route("/collegeProfile/:id")
  .get(isUserLoggedIn, collegeController.showCollegeProfile);

router
  .route("/collegeProfile/:id/get-link")
  .post(collegeController.showRegistrationLink);

router
  .route("/college/edit/:id")
  .get(collegeController.showEditForm)
  .put(
    isUserLoggedIn,
    upload.single("collegeLogo"),
    collegeController.updateProfile
  );

module.exports = router;
