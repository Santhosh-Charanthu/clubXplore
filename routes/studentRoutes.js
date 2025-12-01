const express = require("express");
const router = express.Router();
const passport = require("passport");
const studentController = require("../controllers/studentController");
const { isLoggedIn } = require("../middleware.js");
router
  .route("/college/:id/studentRegistration/signup")
  .get(studentController.showStudentRegistration)
  .post(studentController.handleStudentRegistration);

// router
//   .route("/studentRegistration/login")
//   .get(studentController.showStudentLogin)
//   .post(
//     passport.authenticate("student", {
//       failureRedirect: "/studentRegistration/login",
//       failureFlash: true,
//     }),
//     studentController.handleStudentLogin
//   );

router.route("/logout").get(studentController.studentLogOut);

router.route("/index").get(studentController.showCollegeProfile);

router
  .route("/edit-profile")
  .get(isLoggedIn, studentController.editProfile)
  .post(isLoggedIn, studentController.handleEditProfile);

router.route("/search-colleges").get(studentController.searchColleges);

router
  .route("/:clubName/event/:eventId/register")
  .get(studentController.showEventRegistration)
  .post(studentController.handleEventRegistration);

// ✅ Edit Registration Route
router
  .route("/:clubName/event/:eventId/edit-registration/:registrationId")
  .get(studentController.showEditRegistration)
  .post(studentController.handleEditRegistration);

router.route("/event-registrations").get(studentController.showStudentEvents);

router.get("/invitations", studentController.showInvitations);

router.post(
  "/invitation/:invitationId/accept",
  studentController.acceptInvitation
);

router.post(
  "/invitation/:invitationId/reject",
  studentController.rejectInvitation
);

router.get(
  "/:club/event/:eventId/friends",
  isLoggedIn,
  studentController.friendsStatus
);

router.post(
  "/invite-again/:registrationId/:email",
  isLoggedIn,
  studentController.inviteAgain
);

module.exports = router;
