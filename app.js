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
const { type } = require("os");

app.engine("ejs", ejsMate); // Use ejs-mate for layouts
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "/public"))); // Serve static files like CSS
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

const collegeSchema = new Schema({
  college: {
    type: String,
    required: true,
    unique: true, // Ensure no duplicate colleges
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
});

collegeSchema.plugin(passportLocalMongoose, { usernameField: "college" });
let College = mongoose.model("College", collegeSchema);

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(College.authenticate()));

passport.serializeUser(College.serializeUser());
passport.deserializeUser(College.deserializeUser());

dbUrl = "mongodb+srv://santhosh:santhosh981@cluster0.whu02.mongodb.net/clubs";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

// Render the home page with the boilerplate layout
app.get("/", (req, res) => {
  res.render("users/login.ejs");
});

app.get("/signup", (req, res) => {
  res.render("users/signup.ejs");
});

app.post("/", async (req, res) => {
  console.log(res.locals);
  let redirectUrl = res.locals.redirectUrl || "/";
  res.redirect(redirectUrl);
  console.log(redirectUrl);
});

app.post("/signup", async (req, res) => {
  try {
    let { college, password, email } = req.body;
    const newCollege = new College({ email, college });
    const registeredCollege = await College.register(newCollege, password);
    req.login(registeredCollege, (err) => {
      if (err) {
        next(err);
      }
      req.flash("success", "Welcome to Club Managements!");
      res.redirect("/dashboard/dashboard.ejs");
    });
  } catch (e) {
    console.log("error: ", e);
    res.redirect("/signup");
  }
});

app.listen(8080, () => {
  console.log("Listening on port 8080");
});
