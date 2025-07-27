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
    console.error("Signup error:", e);
    req.flash("error", "Signup failed. Try again.");
    res.redirect("/collegeRegistration/signup");
  }
};

module.exports.showLoginForm = (req, res) => {
  res.render("users/login.ejs");
};

module.exports.handleLogin = async (req, res) => {
  try {
    const college = await College.findById(req.user._id).populate("clubs");
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/collegeRegistration/login");
    }
    req.flash("success", `Welcome to ${college.college} profile`);
    res.redirect(`/collegeProfile/${req.user._id}`);
  } catch (e) {
    console.error("Login error:", e);
    req.flash("error", "Something went wrong during login.");
    res.redirect("/collegeRegistration/login");
  }
};
module.exports.showRegistrationLink = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await College.findById(id).populate("clubs");
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/collegeRegistration/login");
    }

    if (!req.user || !req.user._id.equals(college._id)) {
      req.flash("error", "You are not authorized to generate this link!");
      return res.redirect(
        req.user
          ? `/collegeProfile/${req.user._id}`
          : "/collegeRegistration/login"
      );
    }

    const registrationLink = `http://localhost:8080/college/${id}/studentRegistration/signup`;

    // Store the link and success message in flash
    req.flash("registrationLink", registrationLink);
    req.flash("success", "Link copied to clipboard!");
    res.redirect(`/collegeProfile/${id}`);
  } catch (err) {
    console.error("Error in showRegistrationLink:", err);
    req.flash("error", "Failed to generate registration link: " + err.message);
    res.redirect("/collegeRegistration/login");
  }
};

module.exports.showCollegeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await College.findById(id).populate("clubs");

    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/collegeRegistration/login");
    }

    if (!req.user || !req.user._id.equals(college._id)) {
      req.flash(
        "error",
        "You are not authorized to view this college profile!"
      );
      return res.redirect(
        req.user
          ? `/collegeProfile/${req.user._id}`
          : "/collegeRegistration/login"
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
    });
  } catch (err) {
    console.error("Error in showCollegeProfile:", err);
    req.flash("error", "Something went wrong: " + err.message);
    res.redirect("/collegeRegistration/login");
  }
};

module.exports.showEditForm = async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/collegeRegistration/login");
    }
    res.render("users/collegeEdit.ejs", { college });
  } catch (e) {
    console.error("Error rendering edit form:", e);
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
      return res.redirect("/collegeRegistration/login");
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
    console.error("Error updating college:", e);
    req.flash("error", "Failed to update college details.");
    res.redirect(`/college/edit/${id}`);
  }
};
