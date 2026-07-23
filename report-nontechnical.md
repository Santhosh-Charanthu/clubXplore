# Non-Technical Report — ClubXplore

## What Is This Project?

ClubXplore is a web platform that helps colleges manage their student clubs and events. It connects three types of users — colleges, clubs, and students — on a single platform, making it easier to organize events, handle registrations, and coordinate teams.

---

## Who Uses It?

**Colleges**
Register their institution, manage their list of clubs, and generate signup links for students.

**Clubs**
Create and manage events, view who has registered, and announce winners after events conclude.

**Students**
Browse events at their college (or open events from other colleges), register individually or as a team, and respond to team invitations from other students.

---

## Core Features

**Club Management**
Colleges can register clubs under their institution. Each club has a profile page with a logo, description, coordinators, social media links, and a list of events.

**Event Management**
Clubs can create events with rich details — dates, venue or meeting link, participation type (individual or team), custom registration forms, eligibility rules, and reward descriptions. Events can be restricted to the college's own students or open to everyone.

**Student Registration**
Students can register for events directly from the platform. For team events, the team leader fills in the registration and invites teammates by email. Teammates receive an invitation they can accept or reject.

**Team Invitations**
When a student registers a team, invitations are sent to each teammate. The team leader can later edit the team — adding or removing members. Removed members who had already accepted are notified.

**Student Dashboard**
Students can view all events they've registered for, check the status of their teammates, edit their registrations, and manage incoming invitations.

**OTP Verification**
Email-based one-time password verification is available during signup flows to confirm identity.

---

## Current State

The platform is functional and deployed. The core workflows — college registration, club creation, event management, and student registration — all work end to end.

---

## Areas That Need Attention

**No automated tests**
There is currently no test suite. This means changes to the codebase carry a risk of breaking existing functionality without any safety net. Adding tests should be a priority before the platform scales.

**OTP codes are stored in server memory**
If the server restarts, any pending OTP verifications are lost. This is fine for a small deployment but will cause issues as the platform grows or if multiple servers are running.

**Incomplete admin controls**
Events have an "approval status" field (pending / approved / rejected), but there is no admin interface to actually review and approve events. This feature appears to be planned but not yet built.

**AI features are disabled**
There is an AI integration in the codebase that has been turned off. It's unclear whether this is intentional or a work in progress.

**Club login works differently from other logins**
Colleges and students log in through a standard unified login page. Clubs have a separate login flow that works slightly differently under the hood. This inconsistency could cause confusion and makes the codebase harder to maintain.

---

## Deployment

The platform is hosted on a cloud service (Render). Because the free tier shuts down idle servers, the app pings itself every 14 minutes to stay awake. Images are stored on Cloudinary. The database runs on MongoDB Atlas.

---

## Summary

ClubXplore is a well-scoped platform with a clear purpose and a working feature set. The main gaps are around test coverage, a few incomplete features (event approval, AI), and some inconsistencies in how different user types are handled. These are all addressable and the foundation is solid.
