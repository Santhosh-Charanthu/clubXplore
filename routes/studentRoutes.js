const express = require("express");
const router = express.Router();
const passport = require("passport");
const studentController = require("../controllers/studentController");

router
  .route("/studentRegistration/signup")
  .get(studentController.showStudentRegistration)
  .post(studentController.handleStudentRegistration);

router
  .route("/studentRegistration/login")
  .get(studentController.showStudentLogin)
  .post(
    passport.authenticate("student", {
      failureRedirect: "/studentRegistration/login",
      failureFlash: true,
    }),
    studentController.handleStudentLogin
  );

router.route("/index").get(studentController.showCollegeProfile);

router.route("/search-colleges").get(studentController.searchColleges);

router
  .route("/:clubName/:eventName/register")
  .get(studentController.showEventRegistration)
  .post(studentController.handleEventRegistration);

module.exports = router;
