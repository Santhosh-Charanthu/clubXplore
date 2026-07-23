# Technical Report — ClubXplore

## Overview

ClubXplore is a Node.js/Express web application for managing college clubs, events, and student registrations. It follows an MVC architecture with server-side rendering via EJS templates.

---

## Stack

| Layer        | Technology                             |
| ------------ | -------------------------------------- |
| Runtime      | Node.js                                |
| Framework    | Express 4.x                            |
| Database     | MongoDB (Mongoose 8.x)                 |
| Auth         | Passport.js (passport-local-mongoose)  |
| Sessions     | express-session + connect-mongo        |
| Cache        | Redis (ioredis/redis 5.x)              |
| File Storage | Cloudinary (multer-storage-cloudinary) |
| Templating   | EJS + ejs-mate                         |
| Validation   | Joi 17.x                               |
| Email        | Nodemailer                             |
| Scheduler    | node-cron                              |

---

## Architecture

```
app.js (entry point)
├── routes/
│   ├── collegeRoutes.js
│   ├── clubRoutes.js
│   ├── studentRoutes.js
│   ├── auth.js          (OTP)
│   └── authenticateRoutes.js (unified login)
├── controllers/
│   ├── collegeController.js
│   ├── clubController.js
│   └── studentController.js
├── models/
│   ├── college.js
│   ├── club.js
│   ├── Event.js
│   ├── student.js
│   ├── registration.js
│   └── invitation.js
├── middleware.js
├── schema.js (Joi validation)
├── config/
│   ├── redis.js
│   └── email.js
└── cloudconfig.js
```

---

## Data Models

### College

- Fields: `college`, `collegeId`, `email`, `principalName`, `establishedYear`, `address`, `collegeType`, `affiliatedUniversity`, `collegeLogo`, `clubs[]`, `students[]`, `role`
- Auth: passport-local-mongoose (username = email)

### Club

- Fields: `ClubName`, `branchName`, `clubDescription`, `ClubLogo`, `facultyCoordinators[]`, `studentCoordinators[]`, `socialMediaLink[]`, `Achievements`, `establishedYear`, `author (→College)`, `events[]`, `role`
- Auth: passport-local-mongoose (username = ClubName)

### Student

- Fields: `studentName`, `email`, `regNo`, `author (→College)`, `role`, `registeredEvents[]`
- Auth: passport-local-mongoose (username = email)

### Event

- Fields: `eventName`, `eventDetails`, `image`, `visibility` (collegeExclusive | openToAll), `branchVisibility`, `startDate`, `endDate`, `registrationDeadline`, `mode` (online | offline | hybrid), `venue`, `meetingLink`, `coordinators[]`, `participationType` (individual | team), `teamSize {min, max}`, `formFields[]`, `approvalStatus`, `winners`, `registeredStudents[]`, `author (→Club)`

### Registration

- Fields: `eventId`, `studentId`, `teamName`, `teamMembers[]` (id, email, fields Map, status), `submittedAt`
- Unique index on `{eventId, studentId}`

### Invitation

- Fields: `eventId`, `registrationId`, `senderId`, `receiverId`, `receiverEmail`, `status` (pending | accepted | rejected | removed), `removalNote`

---

## Authentication

Three separate Passport strategies run in parallel:

- `college` — LocalStrategy with `usernameField: email`
- `club` — LocalStrategy with `usernameField: ClubName`
- `student` — LocalStrategy with `usernameField: email`

Custom `serializeUser`/`deserializeUser` encode a `{ id, type }` object to support multi-model sessions. Club login additionally stores the club object in `req.session.club` (bypasses Passport for club-specific auth checks).

---

## Caching Strategy

Redis is used for read-through caching with a 5-minute TTL:

- `club:profile:<ClubName>` — club document with populated events
- `college:profile:<id>` — college document with populated clubs
- `event:<eventId>` — individual event document

Cache is invalidated on update and delete operations via `redisClient.del(cacheKey)`.

---

## OTP Flow

- In-memory `otpStore` object (not Redis-backed)
- OTP expires after 5 minutes
- Routes: `POST /send-otp`, `POST /verify-otp`
- Sent via Nodemailer

---

## File Uploads

All uploads go through Multer → Cloudinary. Images are stored in the `club_DEV` folder. Allowed formats: `png`, `jpg`, `jpeg`. Cloudinary public IDs are stored in the DB for deletion.

---

## Self-Ping (Keep-Alive)

A `node-cron` job runs every 14 minutes hitting `GET /ping` on the app's own `BACKEND_URL`. This is a workaround for free-tier hosting (e.g., Render) that spins down idle instances.

---

## Endpoints

### Auth & Unified Login (`authenticateRoutes.js`, `auth.js`)

---

**`GET /login`**
Renders the unified login page (`views/users/login.ejs`). All three user types (college, club, student) log in from this single page.

---

**`POST /login`**
Reads `role` from the request body to decide which Passport strategy to invoke (`college`, `club`, or `student`). Calls `passport.authenticate(role, ...)` dynamically. On success, redirects based on role:

- `student` → `/index`
- `college` → `/collegeProfile/:id`
- `club` → `/clubProfile/:id`

On failure, flashes an error and redirects back to `/login`.

---

**`POST /send-otp`**
Generates a random OTP via `utils/otp.js`, stores it in the in-memory `otpStore` object keyed by email with a 5-minute expiry, then sends it via Nodemailer. Returns JSON `{ success, message }`.

---

**`POST /verify-otp`**
Looks up the email in `otpStore`, checks expiry, and compares the submitted OTP. Deletes the entry on success. Returns JSON `{ success, message }`.

---

### College Endpoints (`collegeRoutes.js`)

---

**`GET /collegeRegistration/signup`**
Renders the college signup form (`views/users/signup.ejs`).

---

**`POST /collegeRegistration/signup`**
Multer processes the `collegeLogo` file upload to Cloudinary. Validates that `college`, `email`, and `password` are present. Constructs a new `College` document with all form fields and the Cloudinary URL/filename. Calls `College.register(newCollege, password)` (passport-local-mongoose) to hash the password and save. Calls `req.login()` to establish a session immediately after registration, then redirects to `/collegeProfile/:id`.

---

**`GET /logout`**
Reads `req.session.passport.user` to determine the user type before destroying the session. Calls `req.session.destroy()`, clears the `connect.sid` cookie, and redirects to `/login` for colleges/students or `/clubRegistration/login` for clubs.

---

**`GET /collegeProfile/:id`** _(requires `isUserLoggedIn`)_
Checks Redis for `college:profile:<id>`. On cache miss, queries MongoDB with `.populate("clubs")` and caches the result for 300 seconds. Verifies that `req.user._id` matches the profile `id` to prevent cross-account access. Reads flash messages (success, error, registrationLink) and renders `views/profile/collegeIndex.ejs`.

---

**`POST /collegeProfile/:id/get-link`**
Verifies the logged-in user owns the college. Constructs a student signup URL in the format `https://clubxplore.onrender.com/college/:id/studentRegistration/signup`. Stores it in flash under the key `registrationLink` and redirects back to the college profile.

---

**`GET /college/edit/:id`**
Fetches the college by ID and renders the edit form (`views/users/collegeEdit.ejs`).

---

**`PUT /college/edit/:id`** _(requires `isUserLoggedIn`, Multer)_
Validates required fields. Fetches the college document, updates all fields directly on the document object. If a new logo file is present, destroys the old Cloudinary asset using the stored filename, then sets the new URL and filename. Saves the document, invalidates `college:profile:<id>` in Redis, and redirects to the profile page.

---

**`DELETE /colleges/:id`**
Fetches the college with populated `clubs` and `students`. Bulk-deletes all associated clubs via `Club.deleteMany` and all students via `Student.deleteMany`. Deletes the college document with `findByIdAndDelete`. Invalidates the Redis cache key and redirects to `/login`.

---

### Club Endpoints (`clubRoutes.js`)

---

**`GET /clubRegistration`**
Renders the club registration form (`views/club/clubForm.ejs`).

---

**`POST /clubRegistration`** _(Multer, `validateClub` Joi middleware)_
`validateClub` runs the Joi schema from `schema.js` against `req.body` before the controller is reached — invalid data is rejected with a flash error and redirect. In the controller, verifies the logged-in user is a college. Processes the Cloudinary upload. Constructs a `Club` document and calls `Club.register(newClub, password)`. Pushes the new club ID into `college.clubs[]` and saves. Stores the club in `req.session.club` and redirects to `/:ClubName/profile`.

---

**`GET /clubRegistration/login`**
Renders the club login form (`views/club/clubFormLogin.ejs`), passing a `clubName` query param if present (pre-fills the field).

---

**`POST /clubRegistration/login`**
Finds the club by `ClubName`. Calls `club.authenticate(password)` (passport-local-mongoose instance method) to verify credentials without going through Passport middleware. On success, stores the full club document in `req.session.club` (not `req.user`). Redirects to the saved `redirectUrl` or `/:ClubName/profile`.

---

**`GET /:clubName/profile`** _(requires `isCorrectClub`)_
`isCorrectClub` middleware allows students through unconditionally but blocks clubs from accessing other clubs' profiles. Checks Redis for `club:profile:<clubName>`. On miss, queries with `.populate("author").populate({ path: "events", populate: { path: "author" } })` and caches for 300s. For student users, additionally fetches their college and filters the events array — only `openToAll` events or `collegeExclusive` events from the same college are shown. Renders `views/profile/profile.ejs`.

---

**`POST /club/verify-password`**
Runs `passport.authenticate("club")` inline. On success, calls `handleClubPassword` which just flashes a welcome message and redirects to the club profile. This is a legacy route that predates the current session-based club login.

---

**`GET /:clubName/createpost`**
Guards against non-club users by checking `req.session.club`. Fetches the club and renders the event creation form (`views/profile/createpost.ejs`).

---

**`POST /:clubName/createpost`** _(Multer)_
Validates visibility value. Parses the dynamic `formFields` from the request body — labels, types, and isRequired flags are submitted as parallel arrays and zipped into an array of objects. Constructs and saves a new `Event` document. Pushes the event ID into `club.events[]` and saves the club. Redirects to the club profile.

---

**`GET /:clubName/edit`**
Fetches the club by name and renders the edit form (`views/club/edit.ejs`).

---

**`PUT /:clubName/edit`** _(Multer)_
Fetches the existing club document by `ClubName` from the URL param. Updates all fields directly. If a new logo is uploaded, replaces `ClubLogo` with the new Cloudinary URL and filename. Saves, invalidates `club:profile:<ClubName>` in Redis, and redirects to the profile.

---

**`DELETE /:ClubName/delete`**
Fetches the club with populated events. Iterates over events and attempts to delete their images from the local `uploads/` directory (bug: should use Cloudinary). Bulk-deletes all event documents. Removes the club reference from the parent college via `$pull`. Deletes the club document. Invalidates the Redis cache and redirects to `/clubRegistration`.

---

**`GET /:clubName/event/:eventId`**
Requires `req.user` to be set. Checks Redis for `event:<eventId>`. On miss, queries `Event.findById(eventId).populate("author", "ClubName").lean()` and caches for 300s. Renders `views/profile/event.ejs`.

---

**`GET /:clubName/event/:eventId/edit`**
Fetches the club with populated events, finds the specific event by ID within the array, and renders the edit form (`views/profile/eventedit.ejs`).

---

**`PUT /:clubName/event/:eventId/edit`** _(Multer)_
Fetches club and event separately. If a new image is uploaded, destroys the old Cloudinary asset and replaces the image fields. Normalises `mode` to lowercase. Parses the `formFields` arrays the same way as creation. Handles a `deletedFields` comma-separated string to filter out removed fields. Saves the event, invalidates `event:<eventId>` in Redis, and redirects to the club profile.

---

**`DELETE /:clubName/event/:eventId/delete`**
Deletes the event document. Removes the event ID from `club.events[]` using `$pull` with a case-insensitive club name match. Destroys the Cloudinary image using the stored public ID. Invalidates `event:<eventId>` in Redis and redirects to the club profile.

---

**`GET /:clubName/event/:eventId/viewRegistration`**
Requires `req.session.club`. Verifies the logged-in club is the event author by comparing `event.author._id` to `req.session.club._id`. Fetches all `Registration` documents for the event with populated `studentId`. Fetches all `Invitation` documents and builds a lookup map keyed by `registrationId|receiverEmail` → `status`. Renders `views/profile/viewRegistrations.ejs` with both datasets so the view can show invitation status per team member.

---

**`POST /:clubName/event/:eventId/announce-winners`**
Fetches the event, sets `event.winners = { first, second, third, announcedAt: new Date() }`, saves, and redirects to the event page. Note: `clubName` is read after the null check on `event`, which would throw if the event is not found before `clubName` is assigned.

---

### Student Endpoints (`studentRoutes.js`)

---

**`GET /college/:id/studentRegistration/signup`**
Renders the student signup form (`views/student/signup.ejs`), passing the `collegeId` from the URL so the form knows which college to associate the student with.

---

**`POST /college/:id/studentRegistration/signup`**
Constructs a `Student` document with `role: "student"` and `author: collegeId`. Calls `Student.register(newStudent, password)`. Pushes the student ID into `college.students[]` and saves the college. Calls `req.login()` to establish a session and redirects to `/index`.

---

**`GET /logout`**
Calls `req.logout()` (Passport), flashes a success message, and redirects to `/login`.

---

**`GET /index`**
Requires `req.user`. Accepts an optional `searchedCollege` query param. If provided, does a case-insensitive regex match on `College.college` field with populated clubs and events. If not provided, fetches the college linked to `req.user.author`. Renders `views/studentDashboard/index.ejs`.

---

**`GET /edit-profile`** _(requires `isLoggedIn`)_
Fetches the student by `req.user._id` and renders `views/studentDashboard/studentDetailsEdit.ejs`.

---

**`POST /edit-profile`** _(requires `isLoggedIn`)_
Checks if the new `regNo` is already taken by a different student. Updates `studentName`, `email`, `regNo`, and `username` (the passport-local-mongoose username field) via `findByIdAndUpdate`. Redirects to `/index`.

---

**`GET /search-colleges`**
Accepts query param `q`. Runs a case-insensitive partial regex match on `College.college`, limits to 5 results, and returns a JSON array of `{ name }` objects. Used for autocomplete in the student dashboard search.

---

**`GET /:clubName/event/:eventId/register`**
Requires `req.user`. Decodes URL-encoded params. Finds the club and locates the event within `club.events`. Checks if `registrationDeadline` has passed — if so, flashes an error and redirects. Renders `views/profile/register.ejs` with the event and encoded URL params for form submission.

---

**`POST /:clubName/event/:eventId/register`**
Checks deadline again. Checks for duplicate registration by querying `Registration` for `{ eventId, "teamMembers.email": req.user.email }`.

For **individual** events: creates a `Registration` with a single team member (the student, status `accepted`). Pushes the student into `event.registeredStudents[]` and `student.registeredEvents[]`.

For **team** events: reads `teamName` and the `teamMembers` array from the body. Iterates members — index 0 is always the leader (status `accepted`, id set to `req.user._id`); subsequent members with a different email get status `pending` and `id: null`. Validates total member count against `event.teamSize.min/max`. Saves the registration. For each non-leader email, looks up the student by email and creates an `Invitation` document linking `eventId`, `registrationId`, `senderId`, and `receiverEmail`.

---

**`GET /:clubName/event/:eventId/edit-registration/:registrationId`**
Verifies the logged-in student is the team leader (`registration.studentId.equals(req.user._id)`). Converts each team member's `fields` Map to a plain object (required for EJS rendering). Renders `views/studentDashboard/editRegistrations.ejs`.

---

**`POST /:clubName/event/:eventId/edit-registration/:registrationId`**
Allows both the leader and existing members to submit. Finds the email field label by scanning `event.formFields` for a label containing "email". Iterates the submitted `teamMembers` array, normalises emails, looks up student IDs, and builds a `newMembers` array — preserving the existing `status` for members who were already in the team.

For **removed members**: if their invitation was `pending`, it is deleted; if `accepted`, the invitation is updated to `removed` with a `removalNote`, and the student is pulled from `event.registeredStudents[]` and `student.registeredEvents[]`.

For **newly added members**: checks for an existing invitation (e.g., previously removed/rejected) and reactivates it by setting status back to `pending`, or creates a new `Invitation` document.

---

**`GET /event-registrations`**
Fetches the student with `registeredEvents` populated (including `author.ClubName`). Fetches all `Registration` documents for the student and builds two maps keyed by `eventId`: one for team names, one for the full registration object. Renders `views/studentDashboard/studentEvents.ejs`.

---

**`GET /invitations`**
Queries `Invitation` where `receiverEmail` or `receiverId` matches the current user. Populates `eventId` (with nested `author.ClubName`), `registrationId` (teamName only), and `senderId` (studentName, email). Maps to a flat array of formatted invite objects and renders `views/studentDashboard/invitations.ejs`.

---

**`POST /invitation/:invitationId/accept`**
Validates the invitation is `pending` and addressed to `req.user.email`. Checks for a conflicting registration on the same event (either as leader or as an already-accepted team member in a different registration) — blocks acceptance if found. Sets `invitation.status = "accepted"` (via both `updateOne` and `save`, which is redundant). Finds the matching entry in `registration.teamMembers` by email and sets its `id` and `status`. Adds the student to `event.registeredStudents[]` and `student.registeredEvents[]`.

---

**`POST /invitation/:invitationId/reject`**
Validates the invitation is `pending` and addressed to `req.user.email`. Finds the matching team member in the registration and sets their `status` to `rejected`. Sets `invitation.status = "rejected"` and saves both documents.

---

**`GET /:club/event/:eventId/friends`** _(requires `isLoggedIn`)_
Finds the `Registration` for the current student and event. Fetches the event. Renders `views/studentDashboard/friendsStatus.ejs` showing the team member statuses.

---

**`POST /invite-again/:registrationId/:email`** _(requires `isLoggedIn`)_
Verifies the current user is the team leader. Finds the member in `registration.teamMembers` and resets their status to `pending`. Finds the existing `Invitation` for that member and reactivates it (sets status to `pending`, clears `removalNote`). Saves both documents and redirects back.

---

## Known Issues & Technical Debt

1. **OTP store is in-memory** — lost on server restart, not suitable for multi-instance deployments. Should be moved to Redis.

2. **Club auth is split** — clubs are authenticated via a custom session key (`req.session.club`) rather than Passport's `req.user`. This creates inconsistency in middleware and access control checks.

3. **`isCorrectClub` middleware is incomplete** — it checks `req.session.club` but the route-level auth for clubs is not consistently applied across all club routes.

4. **Unused variables in controllers** — `req`, `registrationRequired`, `clubName`, `json` are imported/declared but never used (flagged by linter).

5. **`studentLogOut` is defined twice** in `studentController.js` — the second definition silently overrides the first.

6. **`teamMembers.push(...).then()`** in `acceptInvitation` — `Array.push()` returns a number, not a Promise. The `.then()` call is a no-op and will never execute.

7. **No test suite** — `package.json` has `"test": "echo \"Error: no test specified\" && exit 1"`. Zero test coverage.

8. **`approvalStatus` field exists on Event** but there is no admin interface or approval workflow implemented.

9. **Cloudinary image deletion on club delete** attempts to read from local `uploads/` directory instead of using the Cloudinary public ID stored in the DB.

10. **`openai` package is installed** but the AI routes (`aiRoutes.js`) are commented out — dead dependency.

11. **`cookie-parser` is imported** in `app.js` but never registered with `app.use()`.

12. **`express.urlencoded` is registered twice** in `app.js`.

---

## Environment Variables Required

```
NODE_ENV
PORT
DB_URL
SECRET
REDIS_URL
CLOUD_NAME
CLOUD_API_KEY
CLOUD_API_SECRET
EMAIL_USER
BACKEND_URL
```
