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

### 📌 Clone this repository
```bash
git clone <repo-url>
```

### Navigate into the project folder
```bash
cd ClubXplore
```

### Install dependencies
```bash
npm install
```

### 🔐 Environment Variables

| Variable Name      | Description |
|-------------------|-------------|
| `CLOUD_NAME`      | Cloudinary cloud name |
| `CLOUD_API_KEY`   | Cloudinary API key |
| `CLOUD_API_SECRET`| Cloudinary API secret |
| `DB_URL`          | MongoDB connection string |
| `SECRET`          | Session secret key |
| `EMAIL_USER`      | Gmail account for OTP verification |
| `EMAIL_PASS`      | App password for Gmail |

### Start the server
nodemon app.js

Server runs on:
👉 http://localhost:8080

## Screenshots


## 👨‍💻 Developers
Santhosh Charanthu, Nagasai Bole
📬 [Connect on LinkedIn](https://www.linkedin.com/in/santhosh-charanthu-bb6102300/)

📩 Feel free to reach out for collaboration!

## 📜 License

This project is licensed under the MIT License.
