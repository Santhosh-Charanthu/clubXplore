let College = require("../models/college");
let Club = require("../models/club");
let Student = require("../models/student");
let Registration = require("../models/registration");
const passport = require("passport");

const college = require("../models/college");
module.exports.showStudentRegistration = (req, res) => {
  let { id: collegeId } = req.params;
  res.render("student/signup", { collegeId });
};

module.exports.handleStudentRegistration = async (req, res) => {
  let { id: collegeId } = req.params;
  try {
    let { studentName, email, regNo, password } = req.body;
    const newStudent = new Student({
      studentName,
      email,
      regNo,
      role: "student",
      author: collegeId,
    });

    const college = await College.findById(collegeId);
    const registeredStudent = await Student.register(newStudent, password);
    college.students.push(registeredStudent._id);
    await college.save();

    req.login(registeredStudent, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to Club Management!");
      res.redirect("/collegeIndex", { college });
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect(`/college/${collegeId}/studentRegistration/signup`);
  }
};

module.exports.showStudentLogin = (req, res) => {
  res.render("student/login");
};

module.exports.handleStudentLogin = async (req, res) => {
  let redirectUrl = res.locals.redirectUrl || "/index";
  req.flash("success", "Welcome back to Club Management!");
  res.redirect(redirectUrl);
};

module.exports.studentLogOut = async (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success", "You have logged out successfully.");
    res.redirect("/studentRegistration/login");
  });
};

module.exports.studentLogOut = async (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success", "You have logged out successfully.");
    res.redirect("/studentRegistration/login"); // Redirect to student login
  });
};

module.exports.showCollegeProfile = async (req, res) => {
  try {
    const { searchedCollege } = req.query;

    // If no login, redirect to login
    if (!req.user) {
      return res.redirect("/studentRegistration/login");
    }

    let college;

    if (searchedCollege) {
      const cleanSearch = searchedCollege.trim();

      // Case-insensitive exact match
      college = await College.findOne({
        college: { $regex: new RegExp(`^${cleanSearch}$`, "i") },
      }).populate({
        path: "clubs",
        populate: { path: "events" },
      });
    } else {
      // Show logged-in user's college
      college = await College.findById(req.user.author).populate({
        path: "clubs",
        populate: { path: "events" },
      });
    }

    if (!college) {
      return res.status(404).send("College not found");
    }

    // Render directly
    res.render("studentDashboard/index", { college, user: req.user });
  } catch (error) {
    console.error("Error in showCollegeProfile:", error);
    res.status(500).send("Server Error");
  }
};

module.exports.editProfile = async (req, res) => {
  const student = await Student.findById(req.user._id);
  if (!student) {
    req.flash("error", "Student not found.");
    return res.redirect("/");
  }
  res.render("studentDashboard/studentDetailsEdit", { student });
};

module.exports.handleEditProfile = async (req, res) => {
  const { studentName, email, regNo } = req.body;

  try {
    // Check if the new regNo already exists and is not the current user's
    const existingStudent = await Student.findOne({ regNo });
    if (
      existingStudent &&
      existingStudent._id.toString() !== req.user._id.toString()
    ) {
      req.flash("error", "Registration number already in use.");
      return res.redirect("/edit-profile");
    }

    // Update the student
    await Student.findByIdAndUpdate(req.user._id, {
      studentName,
      email,
      regNo,
      username: regNo, // important: keep login username in sync
    });

    req.flash("success", "Profile updated successfully!");
    res.redirect("/index");
  } catch (err) {
    console.error("Edit profile error:", err);
    req.flash("error", "Failed to update profile.");
    res.redirect("/index");
  }
};

module.exports.searchColleges = async (req, res) => {
  try {
    const query = req.query.q?.trim(); // Remove extra spaces
    if (!query) return res.json([]);

    const colleges = await College.find({
      college: { $regex: query, $options: "i" }, // Case-insensitive partial match
    })
      .limit(5)
      .lean(); // Lean for performance since we just need plain objects

    res.json(colleges.map((c) => ({ name: c.college }))); // Send only names
  } catch (error) {
    console.error("Error fetching colleges:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.showEventRegistration = async (req, res) => {
  if (!req.user) {
    return res.redirect("/studentRegistration/login");
  }

  let { clubName, eventId } = req.params;
  clubName = decodeURIComponent(clubName);
  eventId = decodeURIComponent(eventId);

  const club = await Club.findOne({ ClubName: clubName })
    .populate("events")
    .exec();

  if (!club) {
    req.flash("error", "Club not found");
    return res.redirect("/clubRegistration");
  }

  const event = club.events.find((event) => event._id.equals(eventId));

  console.log(event);
  if (!event) {
    req.flash("error", "Event not found");
    return res.redirect(`/${encodeURIComponent(clubName)}/profile`);
  }

  if (new Date(event.registrationDeadline) < new Date()) {
    req.flash("error", "Registration for this event has closed");
    return res.redirect(
      `/${encodeURIComponent(clubName)}/event${encodeURIComponent(eventId)}`
    );
  }

  res.render("profile/register", {
    event,
    user: req.user,
    clubName,
    encodedEventId: encodeURIComponent(eventId),
    encodedClubName: encodeURIComponent(clubName),
  });
};

module.exports.handleEventRegistration = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      req.flash("error", "You must be logged in to register.");
      return res.redirect("/studentRegistration/login");
    }

    const { clubName, eventId } = req.params;
    const decodedClubName = decodeURIComponent(clubName);
    const decodedEventId = decodeURIComponent(eventId);

    // Find club and event
    const club = await Club.findOne({ ClubName: decodedClubName }).populate(
      "events"
    );
    if (!club) {
      req.flash("error", "Club not found");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((event) => event._id.equals(decodedEventId));
    if (!event) {
      req.flash("error", "Event not found");
      return res.redirect(`/${encodeURIComponent(decodedClubName)}/profile`);
    }

    // Check registration deadline
    if (new Date(event.registrationDeadline) < new Date()) {
      req.flash("error", "Registration for this event has closed");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // Validate event configuration
    if (!Array.isArray(event.formFields)) {
      req.flash("error", "Invalid event configuration");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}/register`
      );
    }

    // Prevent duplicate registration
    const existingRegistration = await Registration.findOne({
      eventId: event._id,
      studentId: req.user._id,
    });
    if (existingRegistration) {
      req.flash("error", "You are already registered for this event");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // Normalize team members
    let members = Array.isArray(req.body.teamMembers)
      ? req.body.teamMembers
      : req.body.teamMembers
      ? [req.body.teamMembers]
      : [];

    // Validate team size
    if (
      members.length < event.teamSize.min ||
      members.length > event.teamSize.max
    ) {
      req.flash(
        "error",
        `Team size must be between ${event.teamSize.min} and ${event.teamSize.max} members`
      );
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}/register`
      );
    }

    // Validate team name if required
    const isSingleStudent =
      event.teamSize.max === 1 && event.teamSize.min === 1;
    let teamName = null;
    if (!isSingleStudent) {
      teamName = req.body.teamName?.trim();
      if (!teamName) {
        req.flash("error", "Team name is required");
        return res.redirect(
          `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
            decodedEventId
          )}/register`
        );
      }
    }

    // Process team members
    const safeFieldLabels = event.formFields.map((field) =>
      field.label.replace(/[^a-zA-Z0-9]/g, "_")
    );
    const registrationNumbers = new Set();
    const teamMembers = [];

    for (const [index, member] of members.entries()) {
      const memberData = new Map();
      for (const [j, field] of event.formFields.entries()) {
        const safeLabel = safeFieldLabels[j];
        const value =
          member[safeLabel] ?? (field.type === "checkbox" ? "false" : "");

        // Skip validation for "Team Name" field in formFields for single student
        if (isSingleStudent && field.label.toLowerCase() === "team name") {
          continue;
        }

        // Validate required fields
        if (field.isRequired && !value) {
          req.flash(
            "error",
            `${field.label} is required for team member ${index + 1}`
          );
          return res.redirect(
            `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
              decodedEventId
            )}/register`
          );
        }

        // Validate field types
        if (field.type === "number" && value && !/^[0-9]+$/.test(value)) {
          req.flash(
            "error",
            `Invalid number format for ${field.label} in team member ${
              index + 1
            }`
          );
          return res.redirect(
            `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
              decodedEventId
            )}/register`
          );
        }

        if (
          field.type === "email" &&
          value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          req.flash(
            "error",
            `Invalid email format for ${field.label} in team member ${
              index + 1
            }`
          );
          return res.redirect(
            `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
              decodedEventId
            )}/register`
          );
        }

        memberData.set(field.label, value);
      }

      // Check for duplicate registration numbers
      const regNum = memberData.get("Registration Number");
      if (regNum) {
        if (registrationNumbers.has(regNum)) {
          req.flash(
            "error",
            `Duplicate registration number found in team member ${index + 1}`
          );
          return res.redirect(
            `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
              decodedEventId
            )}/register`
          );
        }
        registrationNumbers.add(regNum);
      }

      teamMembers.push(memberData);
    }

    // Save registration
    const registration = new Registration({
      eventId: event._id,
      studentId: req.user._id,
      teamName,
      teamMembers,
      submittedAt: new Date(),
    });

    await registration.save();

    // Update event's registered students
    event.registeredStudents.push(req.user._id);
    await event.save();

    // Update student's registered events
    await Student.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { registeredEvents: event._id } },
      { new: true }
    );

    req.flash("success", "Registered successfully!");
    return res.redirect(
      `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
        decodedEventId
      )}`
    );
  } catch (error) {
    console.error("Registration Error:", error);
    req.flash("error", `Failed to complete registration: ${error.message}`);
    return res.redirect(
      `/${encodeURIComponent(
        decodeURIComponent(req.params.clubName)
      )}/event/${encodeURIComponent(
        decodeURIComponent(req.params.eventId)
      )}/register`
    );
  }
};

module.exports.showStudentEvents = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      req.flash(
        "error",
        "You must be logged in to view your event registrations."
      );
      return res.redirect("/studentRegistration/login");
    }

    // Fetch the student with populated registeredEvents and author (Club)
    const student = await Student.findById(req.user._id).populate({
      path: "registeredEvents",
      populate: { path: "author", select: "ClubName" }, // Populate ClubName from author
    });
    if (!student) {
      req.flash("error", "Student not found.");
      return res.redirect("/college");
    }

    // Fetch registrations to get team names
    const registrations = await Registration.find({
      studentId: req.user._id,
    }).lean();

    // Create a map of eventId to teamName for easy lookup
    const teamNameMap = {};
    registrations.forEach((reg) => {
      teamNameMap[reg.eventId.toString()] = reg.teamName;
    });

    // Render the studentEvents template
    res.render("studentDashboard/studentEvents", {
      events: student.registeredEvents || [],
      teamNameMap,
      user: req.user,
      error: req.flash("error"),
      success: req.flash("success"),
    });
  } catch (error) {
    console.error("Error fetching student events:", error);
    req.flash("error", `Failed to load event registrations: ${error.message}`);
    return res.redirect("/college");
  }
};
