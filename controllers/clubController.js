let College = require("../models/college");
let Club = require("../models/club");
let Event = require("../models/Event");
let Registration = require("../models/registration");
const club = require("../models/club");

module.exports.showRegistrationForm = (req, res) => {
  res.render("club/clubform.ejs");
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
    console.log("Error during club registration:", e);
    req.flash("error", "Failed to register club.");
    res.redirect("/clubRegistration");
  }
};

module.exports.showLoginForm = (req, res) => {
  res.render("club/clubformLogin.ejs");
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
      return res.redirect("/clubRegistration/login");
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
      return res.redirect("/clubRegistration/login");
    }

    // ✅ Save authenticated club in session (not in req.user)
    delete req.session.club;
    req.session.club = club;

    req.flash("success", "Logged into club successfully!");
    let redirectUrl = res.locals.redirectUrl || `/${ClubName}/profile`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.log("Error during club login:", err);
    req.flash("error", "Failed to log in club.");
    res.redirect("/clubRegistration/login");
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
  if (!req.session.club) {
    return res.redirect("/interface");
  }
  try {
    const { clubName } = req.params;
    const club = await Club.findOne({ ClubName: clubName })
      .populate("author") // Populate the College reference to get the college field
      .populate({
        path: "events",
        options: { sort: { createdAt: -1 } },
        populate: { path: "author" }, // Populate Event.author (Club)
      });

    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    let user = req.session.club;
    let filteredEvents = club.events;
    // If user is a student
    if (user.role === "student") {
      let userCollege = await College.findById(user.author);
      filteredEvents = club.events.filter((event) => {
        // Show event if it's open to all or if it's college exclusive and matches user's college
        return (
          event.visibility === "openToAll" ||
          (event.visibility === "collegeExclusive" &&
            userCollege.college === club.author.college) // Corrected to club.author.college
        );
      });
      // Replace club.events with filtered events
      club.events = filteredEvents;
    }

    res.render("profile/profile.ejs", { club, user });
    // res.render("profile/profile2.ejs", { club, user });
  } catch (e) {
    console.log("Error loading profile:", e);
    req.flash("error", "Something went wrong!");
    res.redirect("clubRegistration/login");
  }
};

module.exports.handleClubPassword = async (req, res) => {
  try {
    const { ClubName } = req.body;
    const club = await Club.findOne({ ClubName });
    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/collegeRegistration/login");
    }
    req.flash("success", `Welcome to ${ClubName}'s profile!`);
    res.redirect(`/${ClubName}/profile`);
  } catch (e) {
    console.error("Club verification error:", e);
    req.flash("error", "Something went wrong during verification.");
    res.redirect("/collegeRegistration/login");
  }
};

module.exports.showEventForm = async (req, res) => {
  if (!req.session.club || req.user.role === "student") {
    req.flash("error", "You are not authorized to create events.");
    return res.redirect("/interface");
  }
  try {
    const { clubName } = req.params;
    const club = await Club.findOne({ ClubName: clubName });

    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }
    res.render("profile/createpost", { club });
  } catch (e) {
    console.log("Error loading createpost page:", e);
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
      image: { url, fileName },
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
      teamSize,
      rewards,
      sponsors,
      agenda,
      approvalStatus,
      author: club._id,
      formFields: parsedFormFields,
      registeredStudents: [],
    });

    await newEvent.save();
    club.events.push(newEvent);
    await club.save();

    req.flash("success", "Event created successfully!");
    return res.redirect(`/${clubName}/profile`);
  } catch (error) {
    console.error("Error creating event:", error);
    req.flash("error", "Failed to create event.");
    res.redirect(`/${clubName}/createpost`); // Redirect back to form on error
  }
};

module.exports.showClubEditForm = async (req, res) => {
  try {
    const clubDetails = await Club.findOne({ ClubName: req.params.clubName });
    if (!clubDetails) {
      return res.status(404).send("Club not found");
    }
    res.render("club/edit.ejs", { clubDetails });
  } catch (error) {
    console.error(error);
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
    console.error("Error updating club details:", error);
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
    console.error(err);
    req.flash("error", "Failed to delete club.");
    res.redirect(`/clubs/${ClubName}/profile`);
  }
};

module.exports.showEventDetails = async (req, res) => {
  if (!req.user) {
    return res.redirect("/interface");
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
  try {
    const { clubName, eventId } = req.params;
    console.log(eventId);
    const club = await Club.findOne({ ClubName: clubName }).populate("events");

    if (!club) {
      req.flash("error", "Club not found");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((e) => e._id.equals(eventId));
    console.log(event);
    if (!event) {
      req.flash("error", "Event not found");
      return res.redirect(`/${clubName}/profile`);
    }

    res.render("profile/eventedit", { club, event });
  } catch (error) {
    console.error("Error fetching event for editing:", error);
    req.flash("error", "Failed to load edit page");
    res.redirect(`/${clubName}/profile`);
  }
};

module.exports.updateEvent = async (req, res) => {
  const { clubName, eventId } = req.params;
  console.log("req.params:", req.params); // Make sure eventId is there

  try {
    const club = await Club.findOne({ ClubName: clubName });
    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    console.log(eventId);
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
    event.coordinators = Array.isArray(coordinators)
      ? coordinators
      : Object.values(coordinators);
    event.registrationRequired = registrationRequired === "on";
    event.participantLimit = participantLimit;
    event.eligibility = eligibility;
    event.teamSize = teamSize;
    event.rewards = rewards;
    event.sponsors = sponsors;
    event.agenda = agenda;
    event.approvalStatus = approvalStatus;

    // Handle form field updates
    const updatedFormFields = [];
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

    const deleted = deletedFields ? deletedFields.split(",") : [];

    // Filter out deleted fields
    event.formFields = updatedFormFields.filter(
      (field) => !deleted.includes(field.label)
    );

    await event.save();

    req.flash("success", "Event updated successfully!");
    res.redirect(`/${clubName}/profile`);
  } catch (err) {
    console.error("Error updating event:", err);
    req.flash("error", "Failed to update event.");
    res.redirect(`/${clubName}/event/${req.params.id}/edit`);
  }
};

module.exports.destroyEvent = async (req, res) => {
  try {
    const { clubName, eventId } = req.params;

    // Step 1: Find and delete the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).send("Event not found");
    }

    // Step 2: Remove the event reference from the associated club
    const club = await Club.findOneAndUpdate(
      { ClubName: clubName },
      { $pull: { events: event._id } }, // Remove event ID from events array
      { new: true } // Return the updated document
    );

    if (!club) {
      return res.status(404).send("Club not found");
    }

    // Step 3: Optionally delete the image file from the server
    if (event.image && event.image.filename) {
      const imagePath = path.join(
        __dirname,
        "..",
        "uploads",
        event.image.filename
      ); // Adjust path based on your setup
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error(" Error deleting image file:", err);
        } else {
          console.log(" Image file deleted:", event.image.filename);
        }
      });
    }

    // Step 4: Delete the event from the database
    await Event.deleteOne({ _id: event._id });
    req.flash(
      "success",
      `Event "${event.eventName}" deleted successfully from ${clubName}`
    );
    console.log(
      `Event "${event.eventName}" deleted successfully from ${clubName}`
    );
    res.redirect(`/${clubName}/profile`);
  } catch (error) {
    console.error(" Server Error:", error);
    res.status(500).send(`Server Error: ${error.message}`);
  }
};

module.exports.showRegistrations = async (req, res) => {
  try {
    const clubName = decodeURIComponent(req.params.clubName);
    const eventId = decodeURIComponent(req.params.eventId);

    if (!req.user) {
      req.flash("error", "You must be logged in to view registrations.");
      return res.redirect("/collegeRegistration/login");
    }

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
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((event) => event._id.equals(eventId));

    if (!event) {
      req.flash("error", "Event not found!");
      return res.redirect(`/${encodeURIComponent(clubName)}/profile`);
    }

    if (!event.author._id.equals(req.user._id)) {
      req.flash("error", "You do not have permission to view registrations.");
      return res.redirect(
        `/${encodeURIComponent(clubName)}/event/${encodeURIComponent(eventId)}`
      );
    }

    const registrations = await Registration.find({ eventId: event._id })
      .populate("studentId", "studentName")
      .exec();

    res.render("profile/viewRegistrations", {
      event,
      registrations,
      clubName,
      encodedClubName: encodeURIComponent(clubName),
      encodedEventId: encodeURIComponent(eventId),
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    req.flash("error", `Something went wrong: ${error.message}`);
    res.redirect("/clubRegistration");
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

    console.log("📦 Winners to be saved:", event.winners);
    await event.save();
    req.flash("success", "🎉 Winners announced and saved to the event.");

    res.redirect(`/${clubName}/event/${eventId}`);
  } catch (err) {
    req.flash("errror", "Something went wrong!");
    res.redirect(`/${clubName}/event/${eventId}`);
    res.status(500).send("Internal Server Error");
  }
};
