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
const multer = require("multer");
const { storage } = require("./cloudconfig.js");
const upload = multer({ storage: storage });
const Joi = require("joi");
const methodoverride = require("method-override");
const collegeRouter = require("./routes/collegeRoutes.js");
const clubRouter = require("./routes/clubRoutes.js");
const studentRouter = require("./routes/studentRoutes.js");
const college = require("./models/college");

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
  res.locals.registrationLink = req.session.registrationLink || null;
  delete req.session.registrationLink; // remove it after use
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

dbUrl = process.env.DB_URL;

mongoose
  .connect(dbUrl)
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.log("DB Connection Error:", err));

app.use("/", collegeRouter);
app.use("/", clubRouter);
app.use("/", studentRouter);

app.get("/interface", async (req, res) => {
  res.render("profile/interface");
});

app.listen(8080, () => {
  console.log("Listening to port http://localhost:8080/interface");
});
