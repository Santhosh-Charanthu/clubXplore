let College = require("../models/college");
let Club = require("../models/club");
let Student = require("../models/student");
let Registration = require("../models/registration");
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
      res.redirect("/index");
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
  res.redirect(redirectUrl);
};

module.exports.showCollegeProfile = async (req, res) => {
  let { searchedCollege } = req.query;
  if (!req.user) {
    return res.redirect("/studentRegistration/login");
  }
  let college;
  if (searchedCollege) {
    college = await College.findOne({ college: searchedCollege }).populate({
      path: "clubs",
      populate: { path: "events" },
    });
  } else {
    let user = req.user;
    college = await College.findById(user.author).populate({
      path: "clubs",
      populate: { path: "events" },
    });
  }

  res.render("studentDashboard/index", { college });
};

module.exports.searchColleges = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);

    const colleges = await College.find({
      college: { $regex: query, $options: "i" }, // Case-insensitive search
    }).limit(5);

    res.json(colleges.map((college) => ({ name: college.college }))); // Send only names
  } catch (error) {
    console.error("Error fetching colleges:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports.showEventRegistration = async (req, res) => {
  if (!req.user) {
    return res.redirect("/studentRegistration/login");
  }

  let { clubName, eventName } = req.params;
  clubName = decodeURIComponent(clubName);
  eventName = decodeURIComponent(eventName);

  const club = await Club.findOne({ ClubName: clubName })
    .populate("events")
    .exec();

  if (!club) {
    req.flash("error", "Club not found");
    return res.redirect("/clubRegistration");
  }

  const event = club.events.find((event) => event.eventName === eventName);

  if (!event) {
    req.flash("error", "Event not found");
    return res.redirect(`/${encodeURIComponent(clubName)}/profile`);
  }

  if (new Date(event.registrationDeadline) < new Date()) {
    req.flash("error", "Registration for this event has closed");
    return res.redirect(
      `/${encodeURIComponent(clubName)}/${encodeURIComponent(
        eventName
      )}/eventdetails`
    );
  }

  res.render("profile/register", {
    event,
    user: req.user,
    clubName,
    encodedEventName: encodeURIComponent(eventName),
    encodedClubName: encodeURIComponent(clubName),
  });
};

module.exports.handleEventRegistration = async (req, res) => {
  if (!req.user) {
    req.flash("error", "You must be logged in to register.");
    return res.redirect("/studentRegistration/login");
  }

  const clubName = decodeURIComponent(req.params.clubName);
  const eventName = decodeURIComponent(req.params.eventName);

  try {
    console.log("Request Body:", JSON.stringify(req.body, null, 2)); // Debug form data

    const club = await Club.findOne({ ClubName: clubName }).populate("events");
    if (!club) {
      req.flash("error", "Club not found");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((e) => e.eventName === eventName);
    if (!event) {
      req.flash("error", "Event not found");
      return res.redirect(`/${encodeURIComponent(clubName)}/profile`);
    }

    if (new Date(event.registrationDeadline) < new Date()) {
      req.flash("error", "Registration for this event has closed");
      return res.redirect(
        `/${encodeURIComponent(clubName)}/${encodeURIComponent(
          eventName
        )}/eventdetails`
      );
    }

    if (!Array.isArray(event.formFields)) {
      req.flash("error", "Invalid event configuration");
      return res.redirect(
        `/${encodeURIComponent(clubName)}/${encodeURIComponent(
          eventName
        )}/register`
      );
    }

    // Check existing registration
    const existingRegistration = await Registration.findOne({
      eventId: event._id,
      studentId: req.user._id,
    });

    if (existingRegistration) {
      req.flash("error", "You are already registered for this event");
      return res.redirect(
        `/${encodeURIComponent(clubName)}/${encodeURIComponent(
          eventName
        )}/eventdetails`
      );
    }

    // Validate team name
    const teamName =
      event.teamSize.max > 1 || event.teamSize.min > 1
        ? req.body.teamName
        : null;
    if ((event.teamSize.max > 1 || event.teamSize.min > 1) && !teamName) {
      req.flash("error", "Team name is required");
      return res.redirect(
        `/${encodeURIComponent(clubName)}/${encodeURIComponent(
          eventName
        )}/register`
      );
    }

    // Process team members
    const teamMembers = [];
    const safeFieldLabels = event.formFields.map((field) =>
      field.label.replace(/[^a-zA-Z0-9]/g, "_")
    );
    const registrationNumbers = new Set();

    const members = req.body.teamMembers || [];
    if (
      members.length < event.teamSize.min ||
      members.length > event.teamSize.max
    ) {
      req.flash(
        "error",
        `Team size must be between ${event.teamSize.min} and ${event.teamSize.max} members`
      );
      return res.redirect(
        `/${encodeURIComponent(clubName)}/${encodeURIComponent(
          eventName
        )}/register`
      );
    }

    for (let i = 0; i < members.length; i++) {
      const memberData = new Map();
      for (let j = 0; j < event.formFields.length; j++) {
        const field = event.formFields[j];
        const safeLabel = safeFieldLabels[j];
        const value =
          members[i][safeLabel] || (field.type === "checkbox" ? "false" : "");

        if (field.isRequired && !value) {
          req.flash(
            "error",
            `${field.label} is required for team member ${i + 1}`
          );
          return res.redirect(
            `/${encodeURIComponent(clubName)}/${encodeURIComponent(
              eventName
            )}/register`
          );
        }

        if (field.type === "number" && value && !/^[0-9]+$/.test(value)) {
          req.flash(
            "error",
            `Invalid number format for ${field.label} in team member ${i + 1}`
          );
          return res.redirect(
            `/${encodeURIComponent(clubName)}/${encodeURIComponent(
              eventName
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
            `Invalid email format for ${field.label} in team member ${i + 1}`
          );
          return res.redirect(
            `/${encodeURIComponent(clubName)}/${encodeURIComponent(
              eventName
            )}/register`
          );
        }

        memberData.set(field.label, value);
      }

      const regNum = memberData.get("Registration Number");
      if (regNum) {
        if (registrationNumbers.has(regNum)) {
          req.flash(
            "error",
            `Duplicate registration number found in team member ${i + 1}`
          );
          return res.redirect(
            `/${encodeURIComponent(clubName)}/${encodeURIComponent(
              eventName
            )}/register`
          );
        }
        registrationNumbers.add(regNum);
      }

      teamMembers.push(memberData);
    }

    // Create and save registration
    const registration = new Registration({
      eventId: event._id,
      studentId: req.user._id,
      teamName,
      teamMembers,
      submittedAt: new Date(),
    });

    await registration.save();

    event.registeredStudents.push(req.user._id);
    await event.save();

    req.flash("success", "Registered successfully!");
    return res.redirect(
      `/${encodeURIComponent(clubName)}/${encodeURIComponent(
        eventName
      )}/eventdetails`
    );
  } catch (error) {
    console.error("Registration Error:", error);
    req.flash("error", `Failed to complete registration: ${error.message}`);
    return res.redirect(
      `/${encodeURIComponent(clubName)}/${encodeURIComponent(
        eventName
      )}/register`
    );
  }
};
