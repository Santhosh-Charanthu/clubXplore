let College = require("../models/college");
let Club = require("../models/club");
let Event = require("../models/Event");
let Registration = require("../models/registration");
const club = require("../models/club");
const path = require("path");
const fs = require("fs/promises");
const cloudinary = require("cloudinary").v2;

module.exports.showRegistrationForm = (req, res) => {
  res.render("club/clubForm.ejs");
};

module.exports.handleRegistration = async (req, res) => {
  try {
    let {
      ClubName,
      password,
      branchName,
      clubDescription,
      facultyCoordinators,
      studentCoordinators,
      socialMediaLink,
      Achievements,
      establishedYear,
    } = req.body;

    if (!ClubName || !password) {
      req.flash("error", "All fields are required!");
      return res.redirect("/clubRegistration");
    }
    if (!req.user) {
      req.flash(
        "error",
        "You must be logged in as a college to register a club."
      );
      return res.redirect("/collegeRegistration/signup");
    }
    const college = await College.findById(req.user._id);
    if (!college) {
      req.flash("error", "College not found!");
      return res.redirect("/collegeRegistration/signup");
    }

    if (!req.file) {
      req.flash("error", "Please upload a logo.");
      return res.redirect("/clubRegistration");
    }

    const url = req.file.path;
    const fileName = req.file.filename;

    const newClub = new Club({
      ClubName,
      branchName,
      clubDescription,
      facultyCoordinators,
      studentCoordinators,
      socialMediaLink,
      Achievements,
      establishedYear,
      ClubLogo: {
        url: url,
        filename: fileName,
      },
      author: college._id,
      role: "club",
    });

    const registeredClub = await Club.register(newClub, password);

    college.clubs.push(registeredClub._id);
    await college.save();
    req.session.club = registeredClub;
    req.flash("success", "Club registered successfully!");
    res.redirect(`/${ClubName}/profile`);
  } catch (e) {
    req.flash("error", "Failed to register club.");
    res.redirect("/clubRegistration");
  }
};

module.exports.showLoginForm = (req, res) => {
  const clubName = req.query.club || ""; // default empty if not provided
  res.render("club/clubFormLogin.ejs", {
    clubName,
    error: req.flash("error")[0],
  });
};

// module.exports.clubLogOut = async (req, res) => {
//   req.session.destroy((err) => {
//     if (err) {
//       console.error(err);
//       return res.redirect("/dashboard");
//     }
//     res.clearCookie("connect.sid");
//     res.redirect("/clubRegistration/login");
//   });
// };

// module.exports.handleLogin = async (req, res) => {
//   let { ClubName } = req.body;
//   let redirectUrl = res.locals.redirectUrl || `/${ClubName}/profile`;
//   res.redirect(redirectUrl);
// };

module.exports.handleLogin = async (req, res) => {
  try {
    const { ClubName, password } = req.body;

    if (!ClubName || !password) {
      req.flash("error", "All fields are required!");
      return res.render("club/clubFormLogin.ejs", {
        clubName: ClubName,
        error: req.flash("error")[0],
      });
    }

    // 🔍 Find the club
    const club = await Club.findOne({ ClubName });
    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration/login");
    }

    // ✅ Authenticate manually using passport-local-mongoose helper
    const { user, error } = await club.authenticate(password);
    if (error || !user) {
      req.flash("error", "Invalid credentials!");
      return res.render("club/clubFormLogin.ejs", {
        clubName: ClubName,
        error: req.flash("error")[0],
      });
    }

    // ✅ Save authenticated club in session (not in req.user)
    delete req.session.club;
    req.session.club = club;

    req.flash("success", "Logged into club successfully!");
    let redirectUrl = res.locals.redirectUrl || `/${ClubName}/profile`;
    res.redirect(redirectUrl);
  } catch (err) {
    req.flash("error", "Failed to log in club.");
    return res.render("club/clubFormLogin.ejs", {
      clubName: ClubName,
      error: req.flash("error")[0],
    });
  }
};

// module.exports.showLoginForm = (req, res) => {
//   const { clubName } = req.query;
//   res.render("club/clubformLogin.ejs", { clubName });
// };

// module.exports.handleLogin = (req, res) => {
//   // User is already authenticated by Passport
//   const ClubName = req.user.ClubName;
//   res.redirect(`/${encodeURIComponent(ClubName)}/profile`);
// };

module.exports.showClubProfile = async (req, res) => {
  try {
    const { clubName } = req.params;
    const club = await Club.findOne({ ClubName: clubName })
      .populate("author")
      .populate({
        path: "events",
        options: { sort: { createdAt: -1 } },
        populate: { path: "author" },
      });

    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    let user = req.session.club || req.user;

    if (!user) {
      // Not logged in at all
      return res.redirect("/login");
    }

    if (user.role === "club") {
      // Only allow club to access its own profile
      if (user.ClubName !== clubName) {
        req.flash("error", "Access denied.");
        return res.redirect("/login");
      }
    }

    if (user.role === "student") {
      // Filter events for students
      const userCollege = await College.findById(user.author);
      club.events = club.events.filter((event) => {
        return (
          event.visibility === "openToAll" ||
          (event.visibility === "collegeExclusive" &&
            userCollege.college === club.author.college)
        );
      });
    }

    res.render("profile/profile.ejs", { club, user });
  } catch (e) {
    req.flash("error", "Something went wrong!");
    res.redirect("/clubRegistration/login");
  }
};

module.exports.handleClubPassword = async (req, res) => {
  try {
    const { ClubName } = req.body;
    const club = await Club.findOne({ ClubName });
    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration/login");
    }
    req.flash("success", `Welcome to ${ClubName}'s profile!`);
    res.redirect(`/${ClubName}/profile`);
  } catch (e) {
    req.flash("error", "Something went wrong during verification.");
    res.redirect("/clubRegistration/login");
  }
};

module.exports.showEventForm = async (req, res) => {
  const user = req.user;
  if (!req.session.club) {
    req.flash("error", "You are not authorized to create events.");
    return res.redirect("/login");
  }
  try {
    const { clubName } = req.params;
    const club = await Club.findOne({ ClubName: clubName });

    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }
    res.render("profile/createpost", { club, user });
  } catch (e) {
    req.flash("error", "Something went wrong!");
    res.redirect("/");
  }
};

module.exports.handleEventCreation = async (req, res) => {
  const { clubName } = req.params;
  try {
    const {
      eventName,
      eventDetails,
      visibility,
      branchVisibility,
      branchName,
      startDate,
      endDate,
      registrationDeadline,
      mode,
      venue,
      meetingLink,
      coordinators,
      registrationRequired,
      participantLimit,
      eligibility,
      participationType,
      teamSize,
      rewards,
      sponsors,
      agenda,
      approvalStatus,
      formFields,
    } = req.body;

    let club = await Club.findOne({ ClubName: clubName });
    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    if (!req.file) {
      req.flash("error", "Please upload an image.");
      return res.redirect(`/${clubName}/createpost`);
    }

    const url = req.file.path;
    const fileName = req.file.filename;

    // Validate visibility
    if (!["collegeExclusive", "openToAll"].includes(visibility)) {
      req.flash("error", "Invalid visibility value.");
      return res.redirect(`/${clubName}/createpost`);
    }

    if (!formFields) {
      req.flash(
        "error",
        "You must create the registration form for this event."
      );
    }

    // Parse formFields with safety checks
    let parsedFormFields = [];
    if (formFields && formFields.label) {
      const labels = Array.isArray(formFields.label)
        ? formFields.label
        : [formFields.label];
      const types = Array.isArray(formFields.type)
        ? formFields.type
        : [formFields.type];
      const isRequireds = Array.isArray(formFields.isRequired)
        ? formFields.isRequired
        : formFields.isRequired
        ? [formFields.isRequired]
        : [];

      for (let i = 0; i < labels.length; i++) {
        parsedFormFields.push({
          label: labels[i],
          type: types[i],
          isRequired: isRequireds[i] === "true" || false, // Default to false if not provided
        });
      }
    }

    let newEvent = new Event({
      eventName,
      eventDetails,
      image: { url: url, filename: fileName },
      visibility,
      branchVisibility,
      branchName,
      startDate,
      endDate,
      registrationDeadline,
      mode,
      venue,
      meetingLink,
      coordinators,
      registrationRequired: req.body.registrationRequired === "on",
      participantLimit,
      eligibility,
      participationType,
      teamSize,
      rewards,
      sponsors,
      agenda,
      approvalStatus,
      author: club._id,
      formFields: parsedFormFields,
      registeredStudents: [],
    });

    if (participationType === "individual") {
      teamSize.min = 1;
      teamSize.max = 1;
    }

    await newEvent.save();
    club.events.push(newEvent);
    await club.save();

    req.flash("success", "Event created successfully!");
    return res.redirect(`/${clubName}/profile`);
  } catch (error) {
    req.flash("error", "Failed to create event.");
    res.redirect(`/${clubName}/createpost`); // Redirect back to form on error
  }
};

module.exports.showClubEditForm = async (req, res) => {
  const user = req.user;
  try {
    const clubDetails = await Club.findOne({ ClubName: req.params.clubName });
    if (!clubDetails) {
      return res.status(404).send("Club not found");
    }
    res.render("club/edit.ejs", { clubDetails, user });
  } catch (error) {
    res.status(500).send("Server error");
  }
};

module.exports.updateClub = async (req, res) => {
  try {
    const {
      ClubName,
      branchName,
      clubDescription,
      facultyCoordinators,
      studentCoordinators,
      socialMediaLink,
      Achievements,
      establishedYear,
    } = req.body;
    const existingClub = await Club.findOne({
      ClubName: req.params.clubName,
    });

    if (!existingClub) {
      return res.status(404).send("Club not found");
    }

    existingClub.ClubName = ClubName;
    existingClub.branchName = branchName;
    existingClub.clubDescription = clubDescription;
    existingClub.facultyCoordinators = facultyCoordinators;
    existingClub.studentCoordinators = studentCoordinators;
    existingClub.socialMediaLink = socialMediaLink;
    existingClub.Achievements = Achievements;
    existingClub.establishedYear = establishedYear;

    if (req.file) {
      existingClub.ClubLogo = {
        url: req.file.path, // Cloudinary image URL
        filename: req.file.filename,
      };
    }

    await existingClub.save();
    req.flash("success", "Club details updated successfully!");
    res.redirect(`/${ClubName}/profile`);
  } catch (error) {
    req.flash("error", "Failed to update club.");
    res.redirect(`/${req.params.clubName}/edit`);
  }
};

module.exports.destroyClub = async (req, res) => {
  try {
    const { ClubName } = req.params;

    // Find the club document
    const club = await Club.findOne({ ClubName: ClubName }).populate("events");
    if (!club) {
      req.flash("error", "Club not found.");
      return res.redirect("/listings");
    }

    for (const event of club.events) {
      if (event.image && event.image.filename) {
        const imagePath = path.join(
          __dirname,
          "..",
          "uploads",
          event.image.filename
        );
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          console.log(err);
        }
      }
    }

    const eventIds = club.events.map((e) => e.id);
    await Event.deleteMany({ _id: { $in: eventIds } });

    await College.updateOne(
      { clubs: club._id },
      { $pull: { clubs: club._id } }
    );

    await club.deleteOne();

    req.flash("success", "Club and all its events deleted successfully.");
    res.redirect("/clubRegistration");
  } catch (err) {
    req.flash("error", "Failed to delete club.");
    res.redirect(`/clubs/${ClubName}/profile`);
  }
};

module.exports.showEventDetails = async (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }
  let { clubName, eventId } = req.params;

  const club = await Club.findOne({ ClubName: clubName })
    .populate({
      path: "events",
      populate: {
        path: "author",
        select: "ClubName",
      },
    })
    .exec();

  if (!club) {
    return res.status(404).send("Club not found");
  }

  const event = club.events.find((event) => event._id.equals(eventId));

  if (!event) {
    return res.status(404).send("Event not found");
  }

  let user = req.user;

  res.render("profile/event", { event, user });
};

module.exports.showEventEdit = async (req, res) => {
  const user = req.session.club;
  try {
    const { clubName, eventId } = req.params;
    const club = await Club.findOne({ ClubName: clubName }).populate("events");

    if (!club) {
      req.flash("error", "Club not found");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((e) => e._id.equals(eventId));
    if (!event) {
      req.flash("error", "Event not found");
      return res.redirect(`/${clubName}/profile`);
    }

    res.render("profile/eventedit", { club, event, user });
  } catch (error) {
    req.flash("error", "Failed to load edit page");
    res.redirect(`/${clubName}/profile`);
  }
};

module.exports.updateEvent = async (req, res) => {
  const { clubName, eventId } = req.params;

  try {
    const club = await Club.findOne({ ClubName: clubName });
    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    const event = await Event.findById(eventId);
    if (!event) {
      req.flash("error", "Event not found!");
      return res.redirect(`/${clubName}/profile`);
    }

    // Update basic fields
    let {
      eventName,
      eventDetails,
      visibility,
      branchVisibility,
      branchName,
      startDate,
      endDate,
      registrationDeadline,
      mode,
      venue,
      meetingLink,
      coordinators,
      registrationRequired,
      participantLimit,
      eligibility,
      participationType,
      teamSize,
      rewards,
      sponsors,
      agenda,
      approvalStatus,
      formFields,
      deletedFields,
    } = req.body;

    // Optional: Handle new image upload
    if (req.file) {
      if (event.image && event.image.fileName) {
        await cloudinary.uploader.destroy(event.image.fileName);
      }
      event.image.url = req.file.path;
      event.image.fileName = req.file.filename;
    }
    mode = req.body.mode?.toLowerCase();

    event.eventName = eventName;
    event.eventDetails = eventDetails;
    event.visibility = visibility;
    event.branchVisibility = branchVisibility;
    event.branchName = branchName;
    event.startDate = startDate;
    event.endDate = endDate;
    event.registrationDeadline = registrationDeadline;
    event.mode = mode;
    event.venue = venue;
    event.meetingLink = meetingLink;
    // event.coordinators = Array.isArray(coordinators)
    //   ? coordinators
    //   : Object.values(coordinators);
    event.coordinators = coordinators
      ? Array.isArray(coordinators)
        ? coordinators
        : Object.values(coordinators)
      : [];
    event.registrationRequired = registrationRequired === "on";
    event.participantLimit = participantLimit;
    event.eligibility = eligibility;
    event.participationType = participationType;
    event.teamSize = teamSize;
    event.rewards = rewards;
    event.sponsors = sponsors;
    event.agenda = agenda;
    event.approvalStatus = approvalStatus;

    // Handle form field updates
    // const updatedFormFields = [];
    // const labels = Array.isArray(formFields.label)
    //   ? formFields.label
    //   : [formFields.label];
    // const types = Array.isArray(formFields.type)
    //   ? formFields.type
    //   : [formFields.type];
    // const isRequireds = formFields.isRequired || [];

    // for (let i = 0; i < labels.length; i++) {
    //   updatedFormFields.push({
    //     label: labels[i],
    //     type: types[i],
    //     isRequired: isRequireds.includes(String(i)),
    //   });
    // }

    let updatedFormFields = [];
    if (formFields) {
      const labels = Array.isArray(formFields.label)
        ? formFields.label
        : [formFields.label];
      const types = Array.isArray(formFields.type)
        ? formFields.type
        : [formFields.type];
      const isRequireds = formFields.isRequired || [];

      for (let i = 0; i < labels.length; i++) {
        updatedFormFields.push({
          label: labels[i],
          type: types[i],
          isRequired: isRequireds.includes(String(i)),
        });
      }
    }

    const deleted = deletedFields ? deletedFields.split(",") : [];

    // Filter out deleted fields
    event.formFields = updatedFormFields.filter(
      (field) => !deleted.includes(field.label)
    );

    if (participationType === "individual") {
      teamSize.min = 1;
      teamSize.max = 1;
    }

    await event.save();

    req.flash("success", "Event updated successfully!");
    res.redirect(`/${clubName}/profile`);
  } catch (err) {
    req.flash("error", "Failed to update event.");
    res.redirect(`/${clubName}/event/${eventId}/edit`);
  }
};

module.exports.destroyEvent = async (req, res) => {
  const { clubName, eventId } = req.params;
  try {
    // Step 1: Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash("error", "Event not found");
      return res.redirect("back");
    }

    // Step 2: Delete the event document
    await event.deleteOne();

    // Step 3: Remove the event reference from the associated club
    const club = await Club.findOneAndUpdate(
      { ClubName: new RegExp("^" + clubName + "$", "i") }, // case-insensitive match
      { $pull: { events: event._id } },
      { new: true }
    );

    if (!club) {
      req.flash("error", "Club not found");
      return res.redirect("back");
    }

    // Step 4: Delete the image file if it exists
    if (event.image) {
      const publicId = event.image.filename || event.image.fileName; // support both cases
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("❌ Error deleting Cloudinary image:", err);
        }
      } else {
        console.warn("⚠️ No filename found in event.image");
      }
    }

    // Step 5: Success response
    req.flash(
      "success",
      `Event "${event.eventName}" deleted successfully from ${clubName}`
    );
    res.redirect(`/${clubName}/profile`);
  } catch (error) {
    req.flash("error", "Something went wrong while deleting the event");
    res.redirect(`/${clubName}/profile`);
  }
};

const Invitation = require("../models/invitation");

module.exports.showRegistrations = async (req, res) => {
  const user = req.session.club;

  try {
    const clubName = decodeURIComponent(req.params.clubName);
    const eventId = decodeURIComponent(req.params.eventId);

    if (!req.session.club) {
      req.flash("error", "You must be logged in to view registrations.");
      return res.redirect("/clubRegistration/login");
    }

    const club = await Club.findOne({ ClubName: clubName })
      .populate({
        path: "events",
        populate: { path: "author", select: "ClubName" },
      })
      .exec();

    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((e) => String(e._id) === String(eventId));
    if (!event) {
      req.flash("error", "Event not found!");
      return res.redirect(`/${encodeURIComponent(clubName)}/profile`);
    }

    if (String(event.author._id) !== String(req.session.club._id)) {
      req.flash("error", "You do not have permission to view registrations.");
      return res.redirect(
        `/${encodeURIComponent(clubName)}/event/${encodeURIComponent(eventId)}`
      );
    }

    const registrations = await Registration.find({ eventId: event._id })
      .populate("studentId", "studentName")
      .lean();

    const invitations = await Invitation.find({ eventId: event._id }).lean();
    const invitationLookup = {};
    for (const inv of invitations) {
      if (!inv || !inv.registrationId || !inv.receiverEmail) continue;
      const key =
        String(inv.registrationId) +
        "|" +
        String(inv.receiverEmail).toLowerCase();
      invitationLookup[key] = inv.status;
    }

    res.render("profile/viewRegistrations", {
      event,
      registrations,
      invitationLookup,
      clubName,
      encodedClubName: encodeURIComponent(clubName),
      encodedEventId: encodeURIComponent(eventId),
      user,
    });
  } catch (error) {
    req.flash("error", `Something went wrong: ${error.message}`);
    res.redirect("/clubRegistration/login");
  }
};

module.exports.annouceWinners = async (req, res) => {
  const { eventId } = req.params;
  const { first, second, third } = req.body;

  try {
    const event = await Event.findById(eventId).populate("author");
    const clubName = event.author.ClubName;

    if (!event) return res.status(404).send("Event not found");

    event.winners = {
      first,
      second,
      third,
      announcedAt: new Date(),
    };
    await event.save();
    req.flash("success", "🎉 Winners announced and saved to the event.");

    res.redirect(`/${clubName}/event/${eventId}`);
  } catch (err) {
    req.flash("errror", "Something went wrong!");
    res.redirect(`/${clubName}/event/${eventId}`);
    res.status(500).send("Internal Server Error");
  }
};
