let College = require("../models/college");
let Club = require("../models/club");
let Student = require("../models/student");
const Event = require("../models/Event");
let Registration = require("../models/registration");
const Invitation = require("../models/invitation");
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
  req.flash("success", "Welcome back to Club Management!");
  res.redirect(redirectUrl);
};

module.exports.studentLogOut = async (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success", "You have logged out successfully.");
    res.redirect("/login");
  });
};

module.exports.studentLogOut = async (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success", "You have logged out successfully.");
    res.redirect("/login"); // Redirect to student login
  });
};

module.exports.showCollegeProfile = async (req, res) => {
  try {
    const { searchedCollege } = req.query;

    // If no login, redirect to login
    if (!req.user) {
      return res.redirect("/login");
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
      req.flash("error", "College not found");
      return res.redirect("/index");
    }

    // Render directly
    res.render("studentDashboard/index", { college, user: req.user });
  } catch (error) {
    console.error("Error in showCollegeProfile:", error);
    res.status(500).send("Server Error");
  }
};

module.exports.editProfile = async (req, res) => {
  const user = req.user;
  const student = await Student.findById(req.user._id);
  if (!student) {
    req.flash("error", "Student not found.");
    return res.redirect("/");
  }
  res.render("studentDashboard/studentDetailsEdit", { student, user });
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
    return res.redirect("/login");
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

// module.exports.handleEventRegistration = async (req, res) => {
//   try {
//     // Check if user is authenticated
//     if (!req.user) {
//       req.flash("error", "You must be logged in to register.");
//       return res.redirect("/login");
//     }

//     const { clubName, eventId } = req.params;
//     const decodedClubName = decodeURIComponent(clubName);
//     const decodedEventId = decodeURIComponent(eventId);

//     // Find club and event
//     const club = await Club.findOne({ ClubName: decodedClubName }).populate(
//       "events"
//     );
//     if (!club) {
//       req.flash("error", "Club not found");
//       return res.redirect("/clubRegistration");
//     }

//     const event = club.events.find((event) => event._id.equals(decodedEventId));
//     if (!event) {
//       req.flash("error", "Event not found");
//       return res.redirect(`/${encodeURIComponent(decodedClubName)}/profile`);
//     }

//     // Check registration deadline
//     if (new Date(event.registrationDeadline) < new Date()) {
//       req.flash("error", "Registration for this event has closed");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}`
//       );
//     }

//     // Validate event configuration
//     if (!Array.isArray(event.formFields)) {
//       req.flash("error", "Invalid event configuration");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}/register`
//       );
//     }

//     // Prevent duplicate registration
//     const existingRegistration = await Registration.findOne({
//       eventId: event._id,
//       studentId: req.user._id,
//     });
//     if (existingRegistration) {
//       req.flash("error", "You are already registered for this event");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}`
//       );
//     }

//     // Normalize team members
//     let members = Array.isArray(req.body.teamMembers)
//       ? req.body.teamMembers
//       : req.body.teamMembers
//       ? [req.body.teamMembers]
//       : [];

//     // Validate team size
//     if (
//       members.length < event.teamSize.min ||
//       members.length > event.teamSize.max
//     ) {
//       req.flash(
//         "error",
//         `Team size must be between ${event.teamSize.min} and ${event.teamSize.max} members`
//       );
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}/register`
//       );
//     }

//     // Validate team name if required
//     const isSingleStudent =
//       event.teamSize.max === 1 && event.teamSize.min === 1;
//     let teamName = null;
//     if (!isSingleStudent) {
//       teamName = req.body.teamName?.trim();
//       if (!teamName) {
//         req.flash("error", "Team name is required");
//         return res.redirect(
//           `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//             decodedEventId
//           )}/register`
//         );
//       }
//     }

//     // Process team members
//     const safeFieldLabels = event.formFields.map((field) =>
//       field.label.replace(/[^a-zA-Z0-9]/g, "_")
//     );
//     const registrationNumbers = new Set();
//     const teamMembers = [];

//     for (const [index, member] of members.entries()) {
//       const memberData = new Map();
//       for (const [j, field] of event.formFields.entries()) {
//         const safeLabel = safeFieldLabels[j];
//         const value =
//           member[safeLabel] ?? (field.type === "checkbox" ? "false" : "");

//         // Skip validation for "Team Name" field in formFields for single student
//         if (isSingleStudent && field.label.toLowerCase() === "team name") {
//           continue;
//         }

//         // Validate required fields
//         if (field.isRequired && !value) {
//           req.flash(
//             "error",
//             `${field.label} is required for team member ${index + 1}`
//           );
//           return res.redirect(
//             `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//               decodedEventId
//             )}/register`
//           );
//         }

//         // Validate field types
//         if (field.type === "number" && value && !/^[0-9]+$/.test(value)) {
//           req.flash(
//             "error",
//             `Invalid number format for ${field.label} in team member ${
//               index + 1
//             }`
//           );
//           return res.redirect(
//             `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//               decodedEventId
//             )}/register`
//           );
//         }

//         if (
//           field.type === "email" &&
//           value &&
//           !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
//         ) {
//           req.flash(
//             "error",
//             `Invalid email format for ${field.label} in team member ${
//               index + 1
//             }`
//           );
//           return res.redirect(
//             `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//               decodedEventId
//             )}/register`
//           );
//         }

//         memberData.set(field.label, value);
//       }

//       // Check for duplicate registration numbers
//       const regNum = memberData.get("Registration Number");
//       if (regNum) {
//         if (registrationNumbers.has(regNum)) {
//           req.flash(
//             "error",
//             `Duplicate registration number found in team member ${index + 1}`
//           );
//           return res.redirect(
//             `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//               decodedEventId
//             )}/register`
//           );
//         }
//         registrationNumbers.add(regNum);
//       }

//       teamMembers.push(memberData);
//     }

//     // Save registration
//     const registration = new Registration({
//       eventId: event._id,
//       studentId: req.user._id,
//       teamName,
//       teamMembers,
//       submittedAt: new Date(),
//     });

//     await registration.save();

//     // Update event's registered students
//     event.registeredStudents.push(req.user._id);
//     await event.save();

//     // Update student's registered events
//     await Student.findByIdAndUpdate(
//       req.user._id,
//       { $addToSet: { registeredEvents: event._id } },
//       { new: true }
//     );

//     req.flash("success", "Registered successfully!");
//     return res.redirect(
//       `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//         decodedEventId
//       )}`
//     );
//   } catch (error) {
//     console.error("Registration Error:", error);
//     req.flash("error", `Failed to complete registration: ${error.message}`);
//     return res.redirect(
//       `/${encodeURIComponent(
//         decodeURIComponent(req.params.clubName)
//       )}/event/${encodeURIComponent(
//         decodeURIComponent(req.params.eventId)
//       )}/register`
//     );
//   }
// };

module.exports.handleEventRegistration = async (req, res) => {
  try {
    if (!req.user) {
      req.flash("error", "You must be logged in to register.");
      return res.redirect("/login");
    }

    const { clubName, eventId } = req.params;
    const decodedClubName = decodeURIComponent(clubName);
    const decodedEventId = decodeURIComponent(eventId);

    const club = await Club.findOne({ ClubName: decodedClubName }).populate(
      "events"
    );
    if (!club) {
      req.flash("error", "Club not found");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((e) => e._id.equals(decodedEventId));
    if (!event) {
      req.flash("error", "Event not found");
      return res.redirect(`/${encodeURIComponent(decodedClubName)}/profile`);
    }

    // ✅ Check registration deadline
    if (new Date(event.registrationDeadline) < new Date()) {
      req.flash("error", "Registration for this event has closed");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // ✅ Prevent duplicate registration
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

    // -----------------
    // ✅ CASE 1: INDIVIDUAL EVENTS
    // -----------------
    if (event.participationType === "individual") {
      const registration = new Registration({
        eventId: event._id,
        studentId: req.user._id,
        teamName: null,
        teamMembers: [
          {
            id: req.user._id,
            email: req.user.email,
            name: req.user.studentName,
          },
        ],
      });
      await registration.save();

      // Update references
      event.registeredStudents.push(req.user._id);
      await event.save();
      await Student.findByIdAndUpdate(req.user._id, {
        $addToSet: { registeredEvents: event._id },
      });

      req.flash("success", "Registered successfully for individual event!");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // -----------------
    // ✅ CASE 2: TEAM EVENTS
    // -----------------
    if (event.participationType === "team") {
      const teamName = req.body.teamName?.trim();
      if (!teamName) {
        req.flash("error", "Team name is required");
        return res.redirect(
          `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
            decodedEventId
          )}/register`
        );
      }

      const minSize = event.teamSize.min;
      const maxSize = event.teamSize.max;

      // req.body.teamMembers will be an array of objects
      const teamMembers = req.body.teamMembers || [];

      // Extract all emails dynamically
      let emails = [];
      teamMembers.forEach((member) => {
        for (let key in member) {
          if (key.toLowerCase().includes("email") && member[key]) {
            emails.push(member[key].trim().toLowerCase());
          }
        }
      });

      // Remove duplicates, exclude leader’s email
      emails = [...new Set(emails)].filter(
        (email) => email && email !== req.user.email
      );

      // Validate team size (leader + teammates)
      if (emails.length + 1 < minSize || emails.length + 1 > maxSize) {
        req.flash(
          "error",
          `Team size must be between ${minSize} and ${maxSize} members (including leader).`
        );
        return res.redirect(
          `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
            decodedEventId
          )}/register`
        );
      }

      // Create registration (leader only for now)
      const registration = new Registration({
        eventId: event._id,
        studentId: req.user._id,
        teamName,
        teamMembers: [
          {
            id: req.user._id,
            email: req.user.email,
            name: req.user.studentName,
          },
        ],
      });
      await registration.save();

      // Update leader references
      event.registeredStudents.push(req.user._id);
      await event.save();
      await Student.findByIdAndUpdate(req.user._id, {
        $addToSet: { registeredEvents: event._id },
      });

      // Send invitations to teammates
      for (const email of emails) {
        const student = await Student.findOne({ email });
        await Invitation.create({
          eventId: event._id,
          registrationId: registration._id,
          senderId: req.user._id,
          receiverId: student ? student._id : null,
          receiverEmail: email,
          status: "pending",
        });
      }

      req.flash("success", "Team registered! Invitations sent to teammates.");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }
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

// // ================================
// // Show Edit Registration Form
// // ================================
// module.exports.showEditRegistration = async (req, res) => {
//   try {
//     if (!req.user) {
//       req.flash("error", "You must be logged in to edit registration.");
//       return res.redirect("/login");
//     }

//     const { clubName, eventId, registrationId } = req.params;
//     const decodedClubName = decodeURIComponent(clubName);
//     const decodedEventId = decodeURIComponent(eventId);

//     const club = await Club.findOne({ ClubName: decodedClubName }).populate(
//       "events"
//     );
//     if (!club) {
//       req.flash("error", "Club not found");
//       return res.redirect("/clubRegistration");
//     }

//     const event = club.events.find((e) => e._id.equals(decodedEventId));
//     if (!event) {
//       req.flash("error", "Event not found");
//       return res.redirect(`/${encodeURIComponent(decodedClubName)}/profile`);
//     }

//     const registration = await Registration.findById(registrationId);
//     if (!registration) {
//       req.flash("error", "Registration not found");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}`
//       );
//     }

//     // Authorization: only leader can edit
//     if (!registration.studentId.equals(req.user._id)) {
//       req.flash("error", "You are not authorized to edit this registration.");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}`
//       );
//     }

//     console.log("👉 registration.teamMembers:", registration.teamMembers);

//     res.render("studentDashboard/editRegistrations", {
//       club,
//       event,
//       registration,
//       user: req.user,
//     });
//   } catch (error) {
//     console.error("Show Edit Registration Error:", error);
//     req.flash("error", "Failed to load edit form.");
//     res.redirect("back");
//   }
// };

// // ================================
// // Handle Edit Registration
// // ================================
// module.exports.handleEditRegistration = async (req, res) => {
//   try {
//     if (!req.user) {
//       req.flash("error", "You must be logged in to edit registration.");
//       return res.redirect("/login");
//     }

//     const { clubName, eventId, registrationId } = req.params;
//     const decodedClubName = decodeURIComponent(clubName);
//     const decodedEventId = decodeURIComponent(eventId);

//     const registration = await Registration.findById(registrationId);
//     if (!registration) {
//       req.flash("error", "Registration not found");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}`
//       );
//     }

//     // Authorization: only leader can edit
//     if (!registration.studentId.equals(req.user._id)) {
//       req.flash("error", "You are not authorized to edit this registration.");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}`
//       );
//     }

//     // Find the event
//     const event = await Event.findById(decodedEventId);
//     if (!event) {
//       req.flash("error", "Event not found");
//       return res.redirect(`/${encodeURIComponent(decodedClubName)}/profile`);
//     }

//     // -----------------
//     // CASE 1: INDIVIDUAL
//     // -----------------
//     if (event.participationType === "individual") {
//       const memberData = {};

//       // Map submitted form data dynamically
//       event.formFields.forEach((field) => {
//         const safeLabel = field.label.replace(/[^a-zA-Z0-9]/g, "_");
//         memberData[safeLabel] = req.body[safeLabel] || "";
//       });

//       registration.teamMembers = [memberData];
//       await registration.save();

//       req.flash("success", "Individual registration updated!");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}`
//       );
//     }

//     // -----------------
//     // CASE 2: TEAM
//     // -----------------
//     if (event.participationType === "team") {
//       const teamName = req.body.teamName?.trim();
//       if (!teamName) {
//         req.flash("error", "Team name is required.");
//         return res.redirect("back");
//       }

//       const minSize = event.teamSize.min;
//       const maxSize = event.teamSize.max;

//       const teamMembersInput = req.body.teamMembers || [];

//       // Validate team size
//       if (
//         teamMembersInput.length < minSize ||
//         teamMembersInput.length > maxSize
//       ) {
//         req.flash(
//           "error",
//           `Team size must be between ${minSize} and ${maxSize} members.`
//         );
//         return res.redirect("back");
//       }

//       // Build team members dynamically
//       const updatedMembers = teamMembersInput.map((member) => {
//         const formattedMember = {};
//         event.formFields.forEach((field) => {
//           const safeLabel = field.label.replace(/[^a-zA-Z0-9]/g, "_");
//           formattedMember[safeLabel] = member[safeLabel] || "";
//         });
//         return formattedMember;
//       });

//       // Save updates
//       registration.teamName = teamName;
//       registration.teamMembers = updatedMembers;
//       await registration.save();

//       // ✅ Invitations (if Email field exists)
//       await Invitation.deleteMany({ registrationId: registration._id });
//       for (const member of updatedMembers) {
//         if (member.Email) {
//           const email = member.Email.toLowerCase();
//           const student = await Student.findOne({ email });
//           await Invitation.create({
//             eventId: event._id,
//             registrationId: registration._id,
//             senderId: req.user._id,
//             receiverId: student ? student._id : null,
//             receiverEmail: email,
//             status: "pending",
//           });
//         }
//       }

//       req.flash("success", "Team registration updated! Invitations resent.");
//       return res.redirect(
//         `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
//           decodedEventId
//         )}`
//       );
//     }
//   } catch (error) {
//     console.error("Edit Registration Error:", error);
//     req.flash("error", `Failed to edit registration: ${error.message}`);
//     res.redirect("back");
//   }
// };

module.exports.showEditRegistration = async (req, res) => {
  try {
    if (!req.user) {
      req.flash("error", "You must be logged in to edit registration.");
      return res.redirect("/login");
    }

    const { clubName, eventId, registrationId } = req.params;
    const decodedClubName = decodeURIComponent(clubName);
    const decodedEventId = decodeURIComponent(eventId);

    const club = await Club.findOne({ ClubName: decodedClubName }).populate(
      "events"
    );
    if (!club) {
      req.flash("error", "Club not found");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((e) => e._id.equals(decodedEventId));
    if (!event) {
      req.flash("error", "Event not found");
      return res.redirect(`/${encodeURIComponent(decodedClubName)}/profile`);
    }

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      req.flash("error", "Registration not found");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // Authorization: only leader can edit
    if (!registration.studentId.equals(req.user._id)) {
      req.flash("error", "You are not authorized to edit this registration.");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    console.log("👉 registration.teamMembers:", registration.teamMembers);
    console.log("👉 event.formFields:", event.formFields);

    res.render("studentDashboard/editRegistrations", {
      club,
      event,
      registration,
      user: req.user,
    });
  } catch (error) {
    console.error("Show Edit Registration Error:", error);
    req.flash("error", "Failed to load edit form.");
    res.redirect("back");
  }
};

// ================================
// Handle Edit Registration
// ================================
module.exports.handleEditRegistration = async (req, res) => {
  try {
    if (!req.user) {
      req.flash("error", "You must be logged in to edit registration.");
      return res.redirect("/login");
    }

    const { clubName, eventId, registrationId } = req.params;
    const decodedClubName = decodeURIComponent(clubName);
    const decodedEventId = decodeURIComponent(eventId);

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      req.flash("error", "Registration not found");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // Authorization: only leader can edit
    if (!registration.studentId.equals(req.user._id)) {
      req.flash("error", "You are not authorized to edit this registration.");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // Find the event
    const event = await Event.findById(decodedEventId);
    if (!event) {
      req.flash("error", "Event not found");
      return res.redirect(`/${encodeURIComponent(decodedClubName)}/profile`);
    }

    console.log("👉 Received form data:", req.body);

    // -----------------
    // CASE 1: INDIVIDUAL
    // -----------------
    if (event.participationType === "individual") {
      const memberData = {};

      // Map submitted form data dynamically using safe keys
      event.formFields.forEach((field) => {
        const safeKey = field.label.replace(/\s+/g, "_");
        // Store with original label as key for consistency
        memberData[field.label] = req.body[safeKey] || "";
      });

      registration.teamMembers = [memberData];
      await registration.save();

      req.flash("success", "Individual registration updated!");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // -----------------
    // CASE 2: TEAM
    // -----------------
    if (event.participationType === "team") {
      const teamName = req.body.teamName?.trim();
      if (!teamName) {
        req.flash("error", "Team name is required.");
        return res.redirect("back");
      }

      const minSize = event.teamSize.min;
      const maxSize = event.teamSize.max;

      const teamMembersInput = req.body.teamMembers || [];

      // Validate team size
      if (
        teamMembersInput.length < minSize ||
        teamMembersInput.length > maxSize
      ) {
        req.flash(
          "error",
          `Team size must be between ${minSize} and ${maxSize} members.`
        );
        return res.redirect("back");
      }

      // Build team members dynamically
      const updatedMembers = teamMembersInput.map((member) => {
        const formattedMember = {};
        event.formFields.forEach((field) => {
          const safeKey = field.label.replace(/\s+/g, "_");
          // Store with original label as key for consistency
          formattedMember[field.label] = member[safeKey] || "";
        });
        return formattedMember;
      });

      console.log("👉 Updated members:", updatedMembers);

      // Save updates
      registration.teamName = teamName;
      registration.teamMembers = updatedMembers;
      await registration.save();

      // ✅ Invitations (if Email field exists)
      await Invitation.deleteMany({ registrationId: registration._id });
      for (const member of updatedMembers) {
        // Check for Email field (could be "Email", "email", or "Email Address")
        const emailField = event.formFields.find((field) =>
          field.label.toLowerCase().includes("email")
        );

        if (emailField && member[emailField.label]) {
          const email = member[emailField.label].toLowerCase();
          const student = await Student.findOne({ email });
          await Invitation.create({
            eventId: event._id,
            registrationId: registration._id,
            senderId: req.user._id,
            receiverId: student ? student._id : null,
            receiverEmail: email,
            status: "pending",
          });
        }
      }

      req.flash("success", "Team registration updated! Invitations resent.");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }
  } catch (error) {
    console.error("Edit Registration Error:", error);
    req.flash("error", `Failed to edit registration: ${error.message}`);
    res.redirect("back");
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
      return res.redirect("/login");
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

    // Fetch registrations to get team names + map registrations
    const registrations = await Registration.find({
      studentId: req.user._id,
    }).lean();

    // Create maps
    const teamNameMap = {};
    const registrationMap = {};
    registrations.forEach((reg) => {
      teamNameMap[reg.eventId.toString()] = reg.teamName;
      registrationMap[reg.eventId.toString()] = reg; // save full registration object
    });

    // Render
    res.render("studentDashboard/studentEvents", {
      events: student.registeredEvents || [],
      teamNameMap,
      registrationMap, // ✅ pass here
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

module.exports.showInvitations = async (req, res) => {
  try {
    if (!req.user) {
      req.flash("error", "You must be logged in to view invitations.");
      return res.redirect("/login");
    }

    // Fetch all invitations where user is invited
    const invitations = await Invitation.find({
      $or: [{ receiverEmail: req.user.email }, { receiverId: req.user._id }],
    })
      .populate("eventId")
      .populate("registrationId", "teamName")
      .populate("senderId", "studentName email");

    // Format for EJS
    const formattedInvites = invitations.map((invite) => ({
      _id: invite._id,
      eventId: invite.eventId,
      teamName: invite.registrationId
        ? invite.registrationId.teamName
        : "Not Provided",
      inviterName: invite.senderId ? invite.senderId.studentName : "Unknown",
      status: invite.status,
    }));

    res.render("studentDashboard/invitations", {
      invitations: formattedInvites,
      user: req.user,
      error: req.flash("error"),
      success: req.flash("success"),
    });
  } catch (error) {
    console.error("Show Invitations Error:", error);
    req.flash("error", "Unable to fetch invitations.");
    return res.redirect("/");
  }
};

// Accept Invitation
module.exports.acceptInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    if (!req.user) {
      req.flash("error", "You must be logged in to respond to an invitation.");
      return res.redirect("/login");
    }

    const invitation = await Invitation.findById(invitationId).populate(
      "eventId"
    );
    if (!invitation) {
      req.flash("error", "Invitation not found");
      return res.redirect("/invitations");
    }

    if (invitation.status !== "pending") {
      req.flash("error", "This invitation has already been responded to.");
      return res.redirect("/invitations");
    }

    if (invitation.receiverEmail !== req.user.email) {
      // ✅ fixed
      req.flash("error", "This invitation was not sent to your email.");
      return res.redirect("/invitations");
    }

    // ✅ Mark as accepted
    invitation.status = "accepted";
    await invitation.save();

    // ✅ Add to registration team
    const registration = await Registration.findById(invitation.registrationId);
    if (!registration) {
      req.flash("error", "Registration not found");
      return res.redirect("/invitations");
    }

    const alreadyMember = registration.teamMembers.some(
      (m) => m.email === req.user.email
    );
    if (!alreadyMember) {
      registration.teamMembers.push({
        id: req.user._id,
        name: req.user.studentName,
        email: req.user.email,
      });
      await registration.save();
    }

    // ✅ Add student to event + student profile
    await Event.findByIdAndUpdate(
      registration.eventId,
      { $addToSet: { registeredStudents: req.user._id } },
      { new: true }
    );

    await Student.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { registeredEvents: registration.eventId } },
      { new: true }
    );

    req.flash("success", "You have successfully joined the team!");
    return res.redirect("/invitations");
  } catch (error) {
    console.error("Accept Invitation Error:", error);
    req.flash("error", "Failed to accept invitation.");
    return res.redirect("/invitations");
  }
};

// Reject Invitation
module.exports.rejectInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    if (!req.user) {
      req.flash("error", "You must be logged in to respond to an invitation.");
      return res.redirect("/login");
    }

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      req.flash("error", "Invitation not found");
      return res.redirect("/invitations");
    }

    if (invitation.status !== "pending") {
      req.flash("error", "This invitation has already been responded to.");
      return res.redirect("/invitations");
    }

    if (invitation.receiverEmail !== req.user.email) {
      // ✅ fixed
      req.flash("error", "This invitation was not sent to your email.");
      return res.redirect("/invitations");
    }

    invitation.status = "rejected";
    await invitation.save();

    req.flash("success", "You have rejected the team invitation.");
    return res.redirect("/invitations");
  } catch (error) {
    console.error("Reject Invitation Error:", error);
    req.flash("error", "Failed to reject invitation.");
    return res.redirect("/invitations");
  }
};
