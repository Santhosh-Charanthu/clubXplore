# 🎓 ClubXplore – Centralized College Club & Event Management Platform

ClubXplore is a full-stack web application designed to streamline the way colleges manage clubs, events, and participants. It enables students, club admins, and college officials to interact seamlessly — from discovering events to managing registrations and sending team invitations!

---

## 🚀 Tech Stack

| Area | Technologies |
|------|--------------|
| Backend | Node.js, Express.js |
| Frontend | EJS |
| Database | MongoDB |
| Authentication | Passport.js (Session-Based Auth), OTP Verification via Gmail |
| Others | Multer (Image Uploads), Nodemailer |
---

## 🔐 Role-based Access

- **College**
  - Manage college information
  - View & verify clubs affiliated with the college
- **Club**
  - Create & manage club profile
  - Create events, handle registrations, and manage invitations
- **Student**
  - Register for events
  - Receive and manage invitations from teammates

---

## ✨ Features

### 🔹 Authentication & Security
- OTP verification via Gmail at signup
- Secure login with session handling
- Role-based authorization to control access

### 🔹 Event Management
- Clubs can **create, update, and manage events**
- **Custom registration form fields** for each event (e.g., name, roll no, etc.)
- **Real-time participant tracking** in a tabular view

### 🔹 Event Visibility Modes
| Mode | Who Can Participate |
|------|--------------------|
| **College Exclusive** | Only students from that college |
| **Open to All** | Students from other colleges too |

### 🔹 Team Management & Invitations
- Students can **invite teammates** after registering for an event
- Teammates can **Accept / Reject** invitations
- If rejected by mistake → **“Invite Again”** button to resend invites
- Invitation status is always visible and trackable

### 🔹 Discoverability
- Students can **search other colleges**
- View their clubs and **events that are Open to All**
- Register directly for those events

### 📸 Media Support
- Event & club **image uploads** using Multer

---

## 🎯 Why ClubXplore?

> A realistic event and club management ecosystem — just like major college fests operate!

It simplifies:

✔ Communication  
✔ Collaboration  
✔ Participation  
✔ Management  

---

## 🧩 Project Structure

```bash
ClubXplore/
│
├── models/        # Mongoose Models
├── routes/        # Express Routes
├── views/         # EJS Templates
├── public/        # Static Files (CSS, Images, JS)
├── controllers/   # Business Logic
└── app.js         # Main Application File

```

---
## 🛠️ Installation & Setup

### Clone this repository
git clone <repo-url>

### Navigate into the project folder
cd ClubXplore

### Install dependencies
npm install

### Setup environment file (.env)
CLOUD_NAME=<your_cloud_name>

CLOUD_API_KEY=<cloud_api_key>

CLOUD_API_SECRET=<cloud_api_secret>

DB_URL=<your_mongodb_uri>

SECRET=<your_secret>

EMAIL_USER=<your_gmail>

EMAIL_PASS=<your_app_password>


### Start the server
nodemon app.js

Server runs on:
👉 http://localhost:8080
