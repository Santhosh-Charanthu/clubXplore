const College = require("../models/college");

module.exports.showRegistrationForm = (req, res) => {
  res.render("users/signup.ejs");
};

module.exports.handleRegistration = async (req, res, next) => {
  try {
    let {
      college,
      password,
      email,
      collegeId,
      principalName,
      establishedYear,
      address,
      collegeType,
      affiliatedUniversity,
    } = req.body;
    if (!college || !email || !password) {
      req.flash("error", "All fields are required!");
      return res.redirect("/collegeRegistration/signup");
    }
    if (!req.file) {
      req.flash("error", "Please upload a logo.");
      return res.redirect("/collegeRegistration/signup");
    }

    const url = req.file.path;
    const fileName = req.file.filename;

    const newCollege = new College({
      email,
      college,
      collegeId,
      principalName,
      establishedYear,
      address,
      collegeType,
      affiliatedUniversity,
      collegeLogo: { url, filename: fileName },
      role: "college",
    });

    const registeredCollege = await College.register(newCollege, password);

    req.login(registeredCollege, async (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to Club Management!");
      res.redirect(`/collegeProfile/${registeredCollege._id}`);
    });
  } catch (e) {
    req.flash("error", "Signup failed. Try again.");
    res.redirect("/collegeRegistration/signup");
  }
};

module.exports.showLoginForm = (req, res) => {
  res.render("users/login.ejs");
};
module.exports.logout = async (req, res) => {
  // read what was stored during serializeUser
  const sessionUser = req.session?.passport?.user; // { id, type } or undefined

  // Decide where to go after logout
  let redirectTo = "/"; // default
  if (sessionUser?.type === "College") {
    redirectTo = "/login";
  } else if (sessionUser?.type === "Club") {
    redirectTo = "/clubRegistration/login"; // or "/club/login" if that's your route
  } else {
    // if no session, send to a safe default
    redirectTo = "/login";
  }

  // Destroy session and redirect
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/dashboard");
    }
    res.clearCookie("connect.sid");
    return res.redirect(redirectTo);
  });
};

module.exports.handleLogin = async (req, res) => {
  try {
    const college = await College.findById(req.user._id).populate("clubs");
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/login");
    }
    req.flash("success", `Welcome to ${college.college} profile`);
    res.redirect(`/collegeProfile/${req.user._id}`);
  } catch (e) {
    req.flash("error", "Something went wrong during login.");
    res.redirect("/login");
  }
};
module.exports.showRegistrationLink = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await College.findById(id).populate("clubs");
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/login");
    }

    if (!req.user || !req.user._id.equals(college._id)) {
      req.flash("error", "You are not authorized to generate this link!");
      return res.redirect(
        req.user ? `/collegeProfile/${req.user._id}` : "/login"
      );
    }

    const registrationLink = `http://localhost:8080/college/${id}/studentRegistration/signup`;

    // Store the link and success message in flash
    req.flash("registrationLink", registrationLink);
    req.flash("success", "Link copied to clipboard!");
    res.redirect(`/collegeProfile/${id}`);
  } catch (err) {
    req.flash("error", "Failed to generate registration link: " + err.message);
    res.redirect("/login");
  }
};

module.exports.showCollegeProfile = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const college = await College.findById(id).populate("clubs");
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/login");
    }

    if (!req.user || !req.user._id.equals(college._id)) {
      req.flash(
        "error",
        "You are not authorized to view this college profile!"
      );
      return res.redirect(
        req.user ? `/collegeProfile/${req.user._id}` : "/login"
      );
    }

    // Get all flash messages
    const success = req.flash("success");
    const error = req.flash("error");
    const registrationLink = req.flash("registrationLink");

    res.render("profile/collegeIndex", {
      college,
      messages: {
        success: success[0],
        error: error[0],
        registrationLink: registrationLink[0],
      },
      user,
    });
  } catch (err) {
    req.flash("error", "Something went wrong: " + err.message);
    res.redirect("/login");
  }
};

module.exports.showEditForm = async (req, res) => {
  const user = req.user;
  try {
    const college = await College.findById(req.params.id);
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/login");
    }
    res.render("users/collegeEdit.ejs", { college, user });
  } catch (e) {
    req.flash("error", "Something went wrong.");
    res.redirect("/collegeIndex/" + req.params.id);
  }
};

module.exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      college,
      email,
      collegeId,
      principalName,
      establishedYear,
      address,
      collegeType,
      affiliatedUniversity,
    } = req.body;

    // Validate required fields
    if (!college || !email || !collegeId) {
      req.flash("error", "College name, email, and college ID are required!");
      return res.redirect(`/college/edit/${id}`);
    }

    // Find the college
    const collegeDoc = await College.findById(id);
    if (!collegeDoc) {
      req.flash("error", "College not found!");
      return res.redirect("/login");
    }

    // Update fields
    collegeDoc.college = college;
    collegeDoc.email = email;
    collegeDoc.collegeId = collegeId;
    collegeDoc.principalName = principalName || "";
    collegeDoc.establishedYear = establishedYear || "";
    collegeDoc.address = address || "";
    collegeDoc.collegeType = collegeType || "";
    collegeDoc.affiliatedUniversity = affiliatedUniversity || "";

    // Update logo if a new file is uploaded
    if (req.file) {
      // Delete old logo from Cloudinary if it exists
      if (collegeDoc.collegeLogo.filename) {
        await cloudinary.uploader.destroy(collegeDoc.collegeLogo.filename);
      }
      collegeDoc.collegeLogo = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    // Save updated college
    await collegeDoc.save();
    req.flash("success", "College details updated successfully!");
    res.redirect(`/collegeProfile/${id}`);
  } catch (e) {
    req.flash("error", "Failed to update college details.");
    res.redirect(`/college/edit/${id}`);
  }
};

module.exports.deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the college
    const college = await College.findById(id)
      .populate("clubs")
      .populate("students");
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/colleges");
    }

    // Optional: delete all clubs associated with this college
    if (college.clubs && college.clubs.length > 0) {
      await Club.deleteMany({ _id: { $in: college.clubs } });
    }

    // Optional: delete all students associated with this college
    if (college.students && college.students.length > 0) {
      await Student.deleteMany({ _id: { $in: college.students } });
    }

    // Finally, delete the college
    await College.findByIdAndDelete(id);

    req.flash("success", "College and associated data deleted successfully!");
    res.redirect("/login");
  } catch (err) {
    req.flash("error", "Something went wrong while deleting the college.");
    res.redirect("/colleges");
  }
};
