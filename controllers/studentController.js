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

    // ⏳ Check registration deadline
    if (new Date(event.registrationDeadline) < new Date()) {
      req.flash("error", "Registration for this event has closed");
      return res.redirect(
        `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
          decodedEventId
        )}`
      );
    }

    // 🚫 Prevent duplicate registration
    const existingRegistration = await Registration.findOne({
      eventId: event._id,
      "teamMembers.email": req.user.email, // check in team members too
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
    // CASE 1: INDIVIDUAL EVENTS
    // -----------------
    if (event.participationType === "individual") {
      const leaderFields = { ...(req.body.teamMembers?.[0] || {}) };

      const registration = new Registration({
        eventId: event._id,
        studentId: req.user._id,
        teamName: null,
        teamMembers: [
          {
            id: req.user._id,
            email: req.user.email,
            fields: leaderFields,
            status: "accepted",
          },
        ],
      });
      await registration.save();

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
    // CASE 2: TEAM EVENTS
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
      const teamMembersInput = req.body.teamMembers || [];

      // Build members array
      const teamMembersData = [];
      let emails = [];

      for (let i = 0; i < teamMembersInput.length; i++) {
        const memberData = teamMembersInput[i];
        let email = "";
        const fields = {};

        for (let key in memberData) {
          if (key.toLowerCase().includes("email")) {
            email = memberData[key].trim().toLowerCase();
          } else {
            fields[key] = memberData[key];
          }
        }

        if (i === 0) {
          // leader
          teamMembersData.push({
            id: req.user._id,
            email: req.user.email,
            fields,
            status: "accepted",
          });
        } else {
          if (email && email !== req.user.email) {
            teamMembersData.push({
              id: null,
              email,
              fields,
              status: "pending",
            });
            emails.push(email);
          }
        }
      }

      // Validate team size
      if (
        teamMembersData.length < minSize ||
        teamMembersData.length > maxSize
      ) {
        req.flash(
          "error",
          `Team size must be between ${minSize} and ${maxSize} (including leader).`
        );
        return res.redirect(
          `/${encodeURIComponent(decodedClubName)}/event/${encodeURIComponent(
            decodedEventId
          )}/register`
        );
      }

      // Save registration
      const registration = new Registration({
        eventId: event._id,
        studentId: req.user._id,
        teamName,
        teamMembers: teamMembersData,
      });
      await registration.save();

      // Update leader references
      event.registeredStudents.push(req.user._id);
      await event.save();
      await Student.findByIdAndUpdate(req.user._id, {
        $addToSet: { registeredEvents: event._id },
      });

      // Create invitations
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

    // Convert Map fields to plain objects so EJS can read them
    registration.teamMembers = registration.teamMembers.map((member) => ({
      ...member.toObject(),
      fields:
        member.fields instanceof Map
          ? Object.fromEntries(member.fields)
          : member.fields || {},
    }));

    res.render("studentDashboard/editRegistrations", {
      club,
      event,
      registration,
      user: req.user,
    });
  } catch (error) {
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
      req.flash("error", "You must be logged in to update registration.");
      return res.redirect("/login");
    }

    const { registrationId } = req.params;
    const registration = await Registration.findById(registrationId);

    if (!registration) {
      req.flash("error", "Registration not found.");
      return res.redirect("/invitations");
    }

    const event = await Event.findById(registration.eventId);
    if (!event) {
      req.flash("error", "Event not found.");
      return res.redirect("/invitations");
    }

    const isLeader = registration.studentId.equals(req.user._id);
    const emailFieldLabel = event.formFields.find((f) =>
      f.label.toLowerCase().includes("email")
    )?.label;

    if (!isLeader) {
      const memberExists = registration.teamMembers.some(
        (m) => m.email?.toLowerCase() === req.user.email.toLowerCase()
      );

      if (!memberExists) {
        req.flash(
          "error",
          "You are not authorized to update this registration."
        );
        return res.redirect("/invitations");
      }
    }

    // Map existing members by email (normalized)
    const existingMembersMap = new Map(
      registration.teamMembers.map((m) => [m.email.toLowerCase(), m])
    );
    const previousMembers = Array.from(existingMembersMap.keys());

    const teamMembersInput = req.body.teamMembers || [];
    const newMembers = [];

    for (const memberData of teamMembersInput) {
      const safeEmailKey = emailFieldLabel.replace(/\s+/g, "_");

      let email = memberData[safeEmailKey]?.trim();
      if (!email) continue;

      email = email.toLowerCase();

      const student = await Student.findOne({ email });

      const fields = {};
      event.formFields.forEach((f) => {
        const safeKey = f.label.replace(/\s+/g, "_");
        if (!f.label.toLowerCase().includes("email")) {
          fields[f.label] = memberData[safeKey] || "";
        }
      });

      const existingMember = existingMembersMap.get(email);

      newMembers.push({
        id: student ? student._id : existingMember?.id || null,
        email,
        fields,
        // ✅ Preserve old status if they already existed
        status: existingMember ? existingMember.status : "pending",
      });
    }

    const min = event.teamSize.min;
    const max = event.teamSize.max;
    if (newMembers.length < min || newMembers.length > max) {
      req.flash("error", `Team size must be ${min} - ${max} members.`);
      return res.redirect("back");
    }

    const removedMembers = previousMembers.filter(
      (email) => !newMembers.some((m) => m.email === email)
    );

    registration.teamMembers = newMembers;
    await registration.save();

    // Remove removed members history
    // 🆕 Handle removed members properly
    for (const email of removedMembers) {
      const oldInvitation = await Invitation.findOne({
        registrationId: registration._id,
        receiverEmail: email,
      });

      if (oldInvitation) {
        if (oldInvitation.status === "pending") {
          // Pending → delete completely
          await Invitation.deleteOne({ _id: oldInvitation._id });
        } else if (oldInvitation.status === "accepted") {
          // Accepted → mark removed (DO NOT delete)
          oldInvitation.status = "removed";
          oldInvitation.removalNote =
            "You were removed from the team by the team leader.";
          await oldInvitation.save();

          // Remove student-event mapping (if exists)
          const student = await Student.findOne({ email });
          if (student) {
            await Event.findByIdAndUpdate(event._id, {
              $pull: { registeredStudents: student._id },
            });
            await Student.findByIdAndUpdate(student._id, {
              $pull: { registeredEvents: event._id },
            });
          }
        }
      }
    }

    // Add invitations only for newly added
    // Invitations for newly added members (Avoid duplicates)
    for (const member of newMembers) {
      const isNew = !previousMembers.includes(member.email);
      if (!isNew) continue;

      // Check if an invitation already exists for this registration + member
      let existing = await Invitation.findOne({
        registrationId: registration._id,
        receiverEmail: member.email,
      });

      if (existing) {
        // If previously removed or rejected → reactivate the same invitation
        existing.status = "pending";
        existing.removalNote = null;
        await existing.save();
      } else {
        // Otherwise create a new invitation
        await Invitation.create({
          eventId: event._id,
          registrationId: registration._id,
          senderId: registration.studentId,
          receiverId: member.id || null,
          receiverEmail: member.email,
          status: "pending",
        });
      }
    }

    req.flash("success", "Team registration updated successfully!");
    return res.redirect(
      `/${encodeURIComponent(req.params.clubName)}/event/${encodeURIComponent(
        registration.eventId
      )}`
    );
  } catch (err) {
    req.flash("error", "Failed to update registration.");
    return res.redirect("back");
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
      .populate({
        path: "eventId",
        populate: { path: "author", select: "ClubName" }, // ✅ populate club name
      })
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
    });
  } catch (error) {
    req.flash("error", "Unable to fetch invitations.");
    return res.redirect("/");
  }
};

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
      req.flash("error", "This invitation was not sent to your email.");
      return res.redirect("/invitations");
    }

    // 🚫 Prevent accepting invite for event where user is already part of another team
    const alreadyRegistered = await Registration.findOne({
      eventId: invitation.eventId._id,
      _id: { $ne: invitation.registrationId }, // ignore the registration of this invitation
      $or: [
        { studentId: req.user._id }, // Team leader of another team ❌ block
        {
          teamMembers: {
            $elemMatch: {
              email: { $regex: "^" + req.user.email + "$", $options: "i" },
              status: "accepted", // Already accepted as teammate ❌ block
            },
          },
        },
      ],
    });

    if (alreadyRegistered) {
      console.log("Triggered");
      req.flash(
        "error",
        "You are already registered for this event. You cannot join another team."
      );
      console.log("FLASH ERROR: ", req.flash("error"));

      return res.redirect("/invitations");
    }

    // Mark as accepted
    invitation.status = "accepted";
    await Invitation.updateOne(
      { _id: invitationId },
      { $set: { status: "accepted" } }
    );

    await invitation.save();

    // Find registration linked to this invitation
    const registration = await Registration.findById(invitation.registrationId);
    if (!registration) {
      req.flash("error", "Registration not found");
      return res.redirect("/invitations");
    }

    // Find member inside teamMembers
    const memberIndex = registration.teamMembers.findIndex(
      (m) => m.email.toLowerCase() === req.user.email.toLowerCase()
    );

    if (memberIndex !== -1) {
      // Update status + link studentId
      registration.teamMembers[memberIndex].id = req.user._id;
      registration.teamMembers[memberIndex].status = "accepted";

      // ✅ Only update fields if new data is submitted
      //---------
      // Checking
      //---------
      // if (req.body && Object.keys(req.body).length > 0) {
      //   registration.teamMembers[memberIndex].fields = {
      //     ...registration.teamMembers[memberIndex].fields, // keep old fields
      //     ...req.body, // merge new fields
      //   };
      // }
    } else {
      // If not found in teamMembers, add as new
      const memberFields = {};
      for (let key in req.body) {
        if (!key.toLowerCase().includes("email")) {
          memberFields[key] = req.body[key];
        }
      }

      registration.teamMembers
        .push({
          id: req.user._id,
          email: req.user.email,
          fields: memberFields,
          status: "accepted",
        })
        .then(() => {
          console.log("added to registrations!");
        });
    }

    await registration.save();

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
    const user = req.user;
    const registrationId = invitation.registrationId;
    const registration = await Registration.findById(registrationId);
    for (const member of registration.teamMembers) {
      if (member.email === user.email) {
        member.status = "rejected";
      }
    }
    await registration.save();

    invitation.status = "rejected";
    await invitation.save();

    req.flash("success", "You have rejected the team invitation.");
    return res.redirect("/invitations");
  } catch (error) {
    req.flash("error", "Failed to reject invitation.");
    return res.redirect("/invitations");
  }
};

module.exports.friendsStatus = async (req, res) => {
  const { eventId } = req.params;
  const studentId = req.user._id;

  const registration = await Registration.findOne({ eventId, studentId });

  if (!registration) {
    req.flash("error", "No registration found!");
    return res.redirect("/dashboard");
  }

  const event = await Event.findById(eventId);

  res.render("studentDashboard/friendsStatus", {
    user: req.user,
    event,
    registration,
  });
};

module.exports.inviteAgain = async (req, res) => {
  try {
    const { registrationId, email } = req.params;
    const studentEmail = email.toLowerCase();

    const registration = await Registration.findById(registrationId);
    if (!registration) {
      req.flash("error", "Registration not found.");
      return res.redirect("back");
    }

    // Only leader can re-invite
    if (!registration.studentId.equals(req.user._id)) {
      req.flash("error", "You are not the team leader!");
      return res.redirect("back");
    }

    // Find member in registration
    const member = registration.teamMembers.find(
      (m) => m.email === studentEmail
    );
    if (!member) {
      req.flash("error", "Team member not found.");
      return res.redirect("back");
    }

    // Update Registration member status => pending
    member.status = "pending";
    await registration.save();

    // Find invitation related to this member
    let invitation = await Invitation.findOne({
      registrationId,
      receiverEmail: studentEmail,
    });

    if (invitation) {
      // revive invitation
      invitation.status = "pending";
      invitation.removalNote = null;
      await invitation.save();
    } else {
      // Create a new invitation
      await Invitation.create({
        eventId: registration.eventId,
        registrationId,
        senderId: registration.studentId,
        receiverEmail: studentEmail,
        receiverId: member.id || null,
        status: "pending",
      });
    }

    req.flash("success", "Invitation resent successfully!");
    res.redirect("back");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to resend invitation.");
    res.redirect("back");
  }
};
