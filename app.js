if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const ejsMate = require("ejs-mate");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const cookieParser = require("cookie-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");
let College = require("./models/college");
let Club = require("./models/club");
let Event = require("./models/Event");
let Student = require("./models/student");
let Registration = require("./models/registration");
const cloudinary = require("cloudinary").v2;
const { validateClub } = require("./middleware.js");
const multer = require("multer");
const { storage } = require("./cloudconfig.js");
const upload = multer({ storage: storage });
const Joi = require("joi");
const methodoverride = require("method-override");

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodoverride("_method"));

const sessionOptions = {
  secret: "supersecretpassword",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(passport.initialize());
app.use(passport.session());
passport.use(
  "college",
  new LocalStrategy({ usernameField: "college" }, College.authenticate())
);

passport.use(
  "club",
  new LocalStrategy({ usernameField: "ClubName" }, Club.authenticate())
);
passport.use(
  "student",
  new LocalStrategy({ usernameField: "regNo" }, Student.authenticate())
);

//Middleware
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

passport.serializeUser((user, done) => {
  let userType = "";
  if (user instanceof College) userType = "College";
  else if (user instanceof Club) userType = "Club";
  else if (user instanceof Student) userType = "Student";

  done(null, { id: user.id, type: userType });
});

passport.deserializeUser(async (obj, done) => {
  try {
    if (obj.type === "College") {
      const college = await College.findById(obj.id);
      done(null, college);
    } else if (obj.type === "Club") {
      const club = await Club.findById(obj.id);
      done(null, club);
    } else if (obj.type === "Student") {
      const student = await Student.findById(obj.id);
      done(null, student);
    } else {
      done(new Error("Invalid user type"), null);
    }
  } catch (err) {
    done(err, null);
  }
});

dbUrl = "mongodb+srv://santhosh:santhosh981@cluster0.whu02.mongodb.net/clubs";

mongoose
  .connect(dbUrl)
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log("DB Connection Error:", err));

app.get("/interface", async (req, res) => {
  res.render("profile/interface");
});

app.get("/collegeRegistration/login", (req, res) => {
  res.render("users/login.ejs");
});

app.post(
  "/collegeRegistration/login",

  passport.authenticate("college", {
    failureRedirect: "/collegeRegistration/login",
    failureFlash: true, // Show an error message
  }),
  async (req, res) => {
    let redirectUrl = res.locals.redirectUrl || "/clubRegistration/login";
    res.redirect(redirectUrl);
  }
);

app.get("/collegeRegistration/signup", (req, res) => {
  res.render("users/signup.ejs");
});

app.post(
  "/collegeRegistration/signup",
  upload.single("collegeLogo"),
  async (req, res, next) => {
    try {
      let { college, password, email } = req.body;
      if (!college || !email || !password) {
        req.flash("error", "All fields are required!");
        return res.redirect("/signup");
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
        collegeLogo: { url, filename: fileName },
        role: "college",
      });

      const registeredCollege = await College.register(newCollege, password);

      req.login(registeredCollege, (err) => {
        if (err) return next(err);
        req.flash("success", "Welcome to Club Management!");
        res.redirect("/clubRegistration/login");
      });
    } catch (e) {
      console.error("Signup error:", e);
      req.flash("error", "Signup failed. Try again.");
      res.redirect("/collegeRegistration/signup");
    }
  }
);

app.get("/:clubName/profile", async (req, res) => {
  if (!req.user) {
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

    let user = req.user;
    let filteredEvents = club.events;

    // If user is a student
    if (user.role === "student") {
      filteredEvents = club.events.filter((event) => {
        // Show event if it's open to all or if it's college exclusive and matches user's college
        return (
          event.visibility === "openToAll" ||
          (event.visibility === "collegeExclusive" &&
            user.college === club.author.college) // Corrected to club.author.college
        );
      });
      // Replace club.events with filtered events
      club.events = filteredEvents;
    }

    console.log("Filtered Events:", club.events);

    res.render("profile/profile.ejs", { club, user });
    // res.render("profile/profile2.ejs", { club, user });
  } catch (e) {
    console.log("Error loading profile:", e);
    req.flash("error", "Something went wrong!");
    res.redirect("clubRegistration/login");
  }
});

app.get("/clubRegistration", (req, res) => {
  res.render("club/clubform.ejs");
});

app.post(
  "/clubRegistration",
  upload.single("ClubLogo"),
  validateClub,
  async (req, res) => {
    try {
      let { ClubName, password, branchName } = req.body;

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
        ClubLogo: {
          url: url,
          filename: fileName,
        },
        author: college._id,
      });

      const registeredClub = await Club.register(newClub, password);

      college.clubs.push(registeredClub._id);
      await college.save();

      req.flash("success", "Club registered successfully!");
      res.redirect(`/${ClubName}/profile`);
    } catch (e) {
      console.log("Error during club registration:", e);
      req.flash("error", "Failed to register club.");
      res.redirect("/clubRegistration");
    }
  }
);

app.get("/clubRegistration/login", (req, res) => {
  res.render("club/clubformLogin.ejs");
});

app.post(
  "/clubRegistration/login",
  passport.authenticate("club", {
    failureRedirect: "/clubRegistration/login",
    failureFlash: true,
  }),
  async (req, res) => {
    let { ClubName } = req.body;
    let redirectUrl = res.locals.redirectUrl || `/${ClubName}/profile`;
    res.redirect(redirectUrl);
  }
);

app.get("/:clubName/createpost", async (req, res) => {
  if (!req.user || req.user.role === "student") {
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
});

// Replace the existing app.post("/:clubName/createpost") with this
app.post("/:clubName/createpost", upload.single("image"), async (req, res) => {
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

    console.log("Request Body:", req.body); // Debug visibility value

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

    console.log("New Event:", newEvent); // Debug the event before saving

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
});

app.get("/:clubName/edit", async (req, res) => {
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
});

// Update Route
app.put(
  "/:clubName/edit",
  upload.single("ClubLogo"),

  async (req, res) => {
    try {
      const { ClubName, branchName, password } = req.body;
      const existingClub = await Club.findOne({
        ClubName: req.params.clubName,
      });

      if (!existingClub) {
        return res.status(404).send("Club not found");
      }

      existingClub.ClubName = ClubName;
      existingClub.branchName = branchName;

      if (password) {
        await existingClub.setPassword(password);
      }

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
  }
);

app.delete("/:ClubName/delete", async (req, res) => {
  try {
    const { ClubName } = req.params;

    // Find the club document
    const club = await Club.findOne({ ClubName: ClubName });
    if (!club) {
      req.flash("error", "Club not found.");
      return res.redirect("/listings");
    }

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
});

app.get("/studentRegistration/signup", (req, res) => {
  res.render("student/signup");
});

app.post("/studentRegistration/signup", async (req, res) => {
  try {
    let { studentName, college, email, regNo, password } = req.body;
    const newStudent = new Student({
      studentName,
      college,
      email,
      regNo,
      role: "student",
    });
    const registeredStudent = await Student.register(newStudent, password);
    req.login(registeredStudent, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to Club Management!");
      res.redirect("/index");
    });
  } catch (e) {
    console.log(e);
  }
});

app.get("/studentRegistration/login", (req, res) => {
  res.render("student/login");
});

app.post(
  "/studentRegistration/login",

  passport.authenticate("student", {
    failureRedirect: "/studentRegistration/login",
    failureFlash: true,
  }),
  async (req, res) => {
    let redirectUrl = res.locals.redirectUrl || "/index";
    res.redirect(redirectUrl);
  }
);

app.get("/index", async (req, res) => {
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
    college = await College.findOne({ college: user.college }).populate({
      path: "clubs",
      populate: { path: "events" },
    });
  }

  res.render("studentDashboard/index", { college });
});

app.get("/search-colleges", async (req, res) => {
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
});

app.get("/:clubName/:eventName/eventdetails", async (req, res) => {
  if (!req.user) {
    return res.redirect("/interface");
  }
  let { clubName, eventName } = req.params;

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

  const event = club.events.find(
    (event) => event.eventName === req.params.eventName
  );

  if (!event) {
    return res.status(404).send("Event not found");
  }

  let user = req.user;
  console.log(user);

  res.render("profile/event", { event, user });
});

app.post("/:clubName/:eventName/eventdetails", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("You must be logged in to register.");
    }

    const { clubName, eventName } = req.params;

    // Find the club
    const club = await Club.findOne({ ClubName: clubName }).populate("events");
    if (!club) {
      return res.status(404).send("Club not found.");
    }

    // Find the event within the club's events array
    const event = club.events.find((e) => e.eventName === eventName);
    if (!event) {
      return res.status(404).send("Event not found.");
    }

    // Check if the user is already registered
    if (event.registeredStudents.includes(req.user._id)) {
      return res.status(400).send("You are already registered for this event.");
    }

    // Register the user
    event.registeredStudents.push(req.user._id);
    await event.save();

    res.send("Successfully registered for the event!");
  } catch (error) {
    console.error("Error registering student:", error);
    res.status(500).send("Server error.");
  }
});

app.get("/:clubName/:eventName/register", async (req, res) => {
  if (!req.user) {
    return res.redirect("/studentRegistration/login");
  }

  let { clubName, eventName } = req.params;

  const club = await Club.findOne({ ClubName: clubName })
    .populate("events")
    .exec();

  if (!club) {
    return res.status(404).send("Club not found");
  }

  const event = club.events.find((event) => event.eventName === eventName);

  if (!event) {
    return res.status(404).send("Event not found");
  }

  res.render("profile/register", { event, user: req.user, clubName });
});

// Replace app.get and app.post for "/:clubName/:eventName/register"
app.post("/:clubName/:eventName/register", async (req, res) => {
  if (!req.user) {
    return res.redirect("/studentRegistration/login");
  }

  // ✅ Decode the parameters
  const clubName = decodeURIComponent(req.params.clubName);
  const eventName = decodeURIComponent(req.params.eventName);

  console.log("Decoded clubName:", clubName);
  console.log("Decoded eventName:", eventName);

  try {
    const club = await Club.findOne({ ClubName: clubName }).populate("events");

    if (!club) {
      console.log("Club not found in DB:", clubName);
      req.flash("error", "Club not found");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((e) => e.eventName === eventName);

    if (!event) {
      console.log("Event not found in club:", eventName);
      req.flash("error", "Event not found");
      return res.redirect(`/${clubName}/profile`);
    }

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

    const formData = new Map();
    for (const field of event.formFields) {
      formData.set(field.label, req.body[field.label] || "");
    }

    const registration = new Registration({
      eventId: event._id,
      studentId: req.user._id,
      formData,
    });

    await registration.save();

    event.registeredStudents.push(req.user._id);
    await event.save();

    req.flash("success", "Registered successfully!");
    res.redirect(
      `/${encodeURIComponent(clubName)}/${encodeURIComponent(
        eventName
      )}/eventdetails`
    );
  } catch (error) {
    console.error("Error registering student:", error);
    req.flash("error", "Failed to register");
    res.redirect(
      `/${encodeURIComponent(clubName)}/${encodeURIComponent(
        eventName
      )}/eventdetails`
    );
  }
});

app.get("/:clubName/:eventName/edit", async (req, res) => {
  try {
    const { clubName, eventName } = req.params;
    const club = await Club.findOne({ ClubName: clubName }).populate("events");

    if (!club) {
      req.flash("error", "Club not found");
      return res.redirect("/clubRegistration");
    }

    const event = club.events.find((e) => e.eventName === eventName);
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
});
app.put(
  "/:clubName/:eventName/edit",
  upload.single("eventImage"),
  async (req, res) => {
    try {
      const eventName = decodeURIComponent(req.params.eventName);
      const clubName = decodeURIComponent(req.params.clubName);

      let event = await Event.findOne({ eventName });

      if (!event) {
        req.flash("error", "Event not found!");
        return res.redirect(`/${clubName}/profile`);
      }

      console.log("Request Body:", req.body);
      console.log("Uploaded File:", req.file);

      // Update event name if provided
      if (req.body.eventName && req.body.eventName !== event.eventName) {
        event.eventName = req.body.eventName.trim();
      }

      // Update event details if provided
      if (req.body.eventDetails) {
        event.eventDetails = req.body.eventDetails.trim();
      }

      // Update event image if a new file is uploaded
      if (req.file) {
        event.image = { url: req.file.path, filename: req.file.filename };
      }

      // Update visibility field with validation
      if (req.body.visibility) {
        const validVisibility = ["collegeExclusive", "openToAll"];
        if (validVisibility.includes(req.body.visibility)) {
          event.visibility = req.body.visibility;
        } else {
          throw new Error(
            "Invalid visibility value. Must be 'collegeExclusive' or 'openToAll'."
          );
        }
      } else {
        // Since visibility is required in the schema, ensure it's always set
        event.visibility = event.visibility || "collegeExclusive"; // Fallback to existing or default
      }

      // Handle formFields with validation
      if (req.body.formFields) {
        let { label, type, isRequired, originalLabel } = req.body.formFields;

        // Ensure arrays and filter out empty values
        label = Array.isArray(label) ? label : [label].filter(Boolean);
        type = Array.isArray(type) ? type : [type].filter(Boolean);
        isRequired = Array.isArray(isRequired) ? isRequired : [];
        originalLabel = Array.isArray(originalLabel)
          ? originalLabel
          : [originalLabel].filter(Boolean);

        // Handle deletions
        let deletedFields = req.body.deletedFields
          ? req.body.deletedFields.split(",").filter(Boolean)
          : [];

        // Remove deleted fields
        event.formFields = event.formFields.filter(
          (field) => !deletedFields.includes(field.label)
        );

        // Create a map of existing fields
        const existingFieldsMap = new Map();
        event.formFields.forEach((field, index) => {
          existingFieldsMap.set(index, field);
        });

        // Validate and process submitted fields
        const updatedFieldsMap = new Map();
        const validFieldTypes = ["text", "email", "number", "checkbox"]; // Match schema enum

        for (let index = 0; index < label.length; index++) {
          const fieldLabel = String(label[index]).trim();
          const fieldType = String(type[index] || "text").trim();
          const origLabel = originalLabel[index] || "";

          // Validate field type against schema enum
          if (!validFieldTypes.includes(fieldType)) {
            throw new Error(
              `Invalid field type: ${fieldType}. Must be one of ${validFieldTypes.join(
                ", "
              )}.`
            );
          }

          // Validate label (ensure it's not empty after trimming)
          if (!fieldLabel) {
            throw new Error("Field label cannot be empty.");
          }

          const fieldData = {
            label: fieldLabel,
            type: fieldType,
            isRequired:
              isRequired.includes(String(index)) ||
              isRequired[index] === "true" ||
              isRequired[index] === "on",
          };

          // Check if this is an existing field by matching originalLabel
          let matchedIndex = -1;
          for (let [idx, field] of existingFieldsMap) {
            if (field.label === origLabel) {
              matchedIndex = idx;
              break;
            }
          }

          if (origLabel && matchedIndex !== -1) {
            // Update existing field
            updatedFieldsMap.set(matchedIndex, fieldData);
          } else if (!event.formFields.some((f) => f.label === fieldLabel)) {
            // Add as new field only if the label doesn’t already exist
            updatedFieldsMap.set(
              event.formFields.length + updatedFieldsMap.size,
              fieldData
            );
          }
        }

        // Rebuild formFields array
        const newFormFields = [];
        for (let i = 0; i < event.formFields.length; i++) {
          if (updatedFieldsMap.has(i)) {
            newFormFields.push(updatedFieldsMap.get(i)); // Updated field
          } else if (!deletedFields.includes(event.formFields[i].label)) {
            newFormFields.push(event.formFields[i]); // Unchanged field
          }
        }
        // Add new fields
        for (let [idx, field] of updatedFieldsMap) {
          if (idx >= event.formFields.length) {
            newFormFields.push(field);
          }
        }

        event.formFields = newFormFields;
      }

      // Save the updated event
      await event.save();
      console.log("Event updated successfully:", event);
      req.flash("success", "Event updated successfully!");
      const redirectEventName = encodeURIComponent(
        req.body.eventName || eventName
      );
      res.redirect(`/${clubName}/${redirectEventName}/eventdetails`);
    } catch (error) {
      console.error("🔥 Server Error:", error);
      req.flash("error", `Failed to update event: ${error.message}`);
      res.redirect(`/${clubName}/${eventName}/edit`);
    }
  }
);

app.delete("/:clubName/:eventName/delete", async (req, res) => {
  try {
    const { clubName, eventName } = req.params;

    // Step 1: Find and delete the event
    const event = await Event.findOne({ eventName });
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

    console.log(` Event "${eventName}" deleted successfully from ${clubName}`);
    res.redirect(`/${clubName}/profile`);
  } catch (error) {
    console.error(" Server Error:", error);
    res.status(500).send(`Server Error: ${error.message}`);
  }
});

app.get(
  "/:clubName/:eventName/eventdetails/viewRegistration",
  async (req, res) => {
    try {
      const { clubName, eventName } = req.params;

      // Find the club and populate events
      const club = await Club.findOne({ ClubName: clubName })
        .populate({
          path: "events",
        })
        .exec();

      if (!club) {
        req.flash("error", "Club not found!");
        return res.redirect("/clubRegistration");
      }

      const event = club.events.find((event) => event.eventName === eventName);

      if (!event) {
        req.flash("error", "Event not found!");
        return res.redirect(`/${clubName}/profile`);
      }

      // Fetch registrations for this event and populate student details
      const registrations = await Registration.find({ eventId: event._id })
        .populate("studentId", "studentName") // Only fetch studentName for efficiency
        .exec();

      console.log("Event Data:", JSON.stringify(event, null, 2));
      console.log("Registrations:", JSON.stringify(registrations, null, 2));
      console.log("Form Fields:", JSON.stringify(event.formFields, null, 2));

      res.render("profile/viewRegistrations", {
        event,
        registrations, // Pass registrations instead of registeredStudents
      });
    } catch (error) {
      console.error("Error fetching registrations:", error);
      req.flash("error", "Something went wrong!");
      res.redirect("clubRegistration/login");
    }
  }
);

app.post("/:clubName/:eventName/eventdetails/viewRegistration", (req, res) => {
  console.log(req.user);
});

app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found")); // ✅ No need to manually flash here
});

// Error handler middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error", { statusCode, message }); // ✅ Pass statusCode
});

// General Error-Handling Middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong" } = err;

  // Flash the error message (if using flash)
  req.flash("error", message);

  // Render an error page or redirect with status
  res.status(statusCode).render("error", {
    statusCode,
    message,
    currUser: req.user, // Pass current user for template consistency
  });
});

app.listen(8080, () => {
  console.log("Listening on port 8080");
});
