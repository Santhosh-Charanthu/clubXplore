if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
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
let College = require("./models/college");
let Club = require("./models/club");
let Event = require("./models/Event");
let Student = require("./models/student");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { storage } = require("./cloudconfig.js");
const upload = multer({ storage: storage });

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.urlencoded({ extended: true }));

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

app.get("/collegeRegistration/login", (req, res) => {
  res.render("users/login.ejs");
});

app.post(
  "/collegeRegistration/login",
  passport.authenticate("college", {
    failureRedirect: "/collegeRegistration/login", // Redirect to login page if authentication fails
    failureFlash: true, // Show an error message
  }),
  async (req, res) => {
    let redirectUrl = res.locals.redirectUrl || "/clubRegistration";
    res.redirect(redirectUrl);
  }
);

app.get("/collegeRegistration/signup", (req, res) => {
  res.render("users/signup.ejs");
});

// app.js

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
      });

      const registeredCollege = await College.register(newCollege, password);

      req.login(registeredCollege, (err) => {
        if (err) return next(err);
        req.flash("success", "Welcome to Club Management!");
        res.redirect("/clubRegistration");
      });
    } catch (e) {
      console.error("Signup error:", e);
      req.flash("error", "Signup failed. Try again.");
      res.redirect("/collegeRegistration/signup");
    }
  }
);

app.get("/:clubName/profile", async (req, res) => {
  try {
    const { clubName } = req.params;
    const club = await Club.findOne({ ClubName: clubName }).populate("events");

    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    res.render("profile/profile.ejs", { club });
  } catch (e) {
    console.log("Error loading profile:", e);
    req.flash("error", "Something went wrong!");
    res.redirect("/");
  }
});

app.get("/clubRegistration", (req, res) => {
  res.render("club/clubform.ejs");
});

app.post("/clubRegistration", upload.single("ClubLogo"), async (req, res) => {
  try {
    let { ClubName, password } = req.body;

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
});
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

app.post("/:clubName/createpost", upload.single("image"), async (req, res) => {
  try {
    const { clubName } = req.params;
    const { eventName, eventDetails } = req.body;

    let club = await Club.findOne({ ClubName: clubName });

    if (!club) {
      req.flash("error", "Club not found!");
      return res.redirect("/clubRegistration");
    }

    if (!req.file) {
      req.flash("error", "Please upload a image.");
      return res.redirect("/:clubName/profile");
    }

    const url = req.file.path;
    const fileName = req.file.filename;
    let newEvent = new Event({
      eventName,
      eventDetails,
      image: {
        url: url,
        filename: fileName,
      },
      author: club._id,
    });

    await newEvent.save();
    club.events.push(newEvent);
    await club.save();

    req.flash("success", "Event created successfully!");
    res.redirect(`/${clubName}/profile`);
  } catch (e) {
    console.log("Error creating event:", e);
    req.flash("error", "Failed to create event.");
    res.redirect("/collegeRegistration/login");
  }
});

app.get("/studentRegistration/signup", (req, res) => {
  res.render("student/signup");
});

app.post("/studentRegistration/signup", async (req, res) => {
  try {
    let { studentName, college, email, regNo, password } = req.body;
    const newStudent = new Student({ studentName, college, email, regNo });
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

app.get("/index", async (req, res) => {
  if (!req.user) {
    return res.redirect("/studentRegistration/login");
  }
  let user = req.user;
  let college = await College.findOne({ college: user.college }).populate({
    path: "clubs",
    populate: { path: "events" }, // Populate events inside each club
  });

  res.render("studentDashboard/index", { college });
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
    console.log(redirectUrl);
  }
);

app.listen(8080, () => {
  console.log("Listening on port 8080");
});
