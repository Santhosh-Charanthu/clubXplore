const express = require("express");
const passport = require("passport");
const router = express.Router();

router
  .route("/login")
  .get((req, res) => res.render("users/login"))
  .post((req, res, next) => {
    const role = req.body.role;

    if (!role) {
      req.flash("error", "Please select a role");
      return res.redirect("/login");
    }

    passport.authenticate(role, (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        req.flash("error", info.message || "Login failed");
        return res.redirect("/login");
      }

      // log in the user
      req.logIn(user, (err) => {
        if (err) return next(err);

        // ✅ Redirect based on role
        if (role === "student") {
          return res.redirect("/index");
        } else if (role === "college") {
          return res.redirect(`/collegeProfile/${user._id}`);
        } else if (role === "club") {
          return res.redirect(`/clubProfile/${user._id}`);
        } else {
          return res.redirect("/"); // fallback
        }
      });
    })(req, res, next);
  });

module.exports = router;
