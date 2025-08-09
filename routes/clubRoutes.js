const express = require("express");
const router = express.Router();
const clubController = require("../controllers/clubController");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const multer = require("multer");
const { storage } = require("../cloudconfig");
const upload = multer({ storage: storage });
const { validateClub } = require("../middleware.js");

router
  .route("/clubRegistration")
  .get(clubController.showRegistrationForm)
  .post(
    upload.single("ClubLogo"),
    validateClub,
    clubController.handleRegistration
  );

router
  .route("/clubRegistration/login")
  .get(clubController.showLoginForm)
  .post(
    passport.authenticate("club", {
      failureRedirect: "/clubRegistration/login",
      failureFlash: true,
    }),
    clubController.handleLogin
  );

router.route("/:clubName/profile").get(clubController.showClubProfile);

router
  .route("/clubRegistration/login")
  .get(clubController.showLoginForm)
  .post(
    passport.authenticate("club", {
      failureRedirect: "/clubRegistration/login",
      failureFlash: true,
    }),
    clubController.handleLogin // No manual password check here
  );

router
  .route("/:clubName/createpost")
  .get(clubController.showEventForm)
  .post(upload.single("image"), clubController.handleEventCreation);

router
  .route("/:clubName/edit")
  .get(clubController.showClubEditForm)
  .put(upload.single("ClubLogo"), clubController.updateClub);

router.route("/:ClubName/delete").delete(clubController.destroyClub);

router.route("/:clubName/event/:eventId").get(clubController.showEventDetails);
////

router
  .route("/:clubName/event/:eventId/edit")
  .get(clubController.showEventEdit)
  .put(upload.single("eventImage"), clubController.updateEvent);

router
  .route("/:clubName/event/:eventId/delete")
  .delete(clubController.destroyEvent);

router
  .route("/:clubName/event/:eventId/viewRegistration")
  .get(clubController.showRegistrations);

router.post(
  "/:clubName/event/:eventId/announce-winners",
  clubController.annouceWinners
);

module.exports = router;
