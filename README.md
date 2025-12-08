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
<img width="1919" height="858" alt="image" src="https://github.com/user-attachments/assets/50528849-eba4-4621-a473-d9674d8b4b53" />
<img width="1588" height="1135" alt="image" src="https://github.com/user-attachments/assets/4a3d0880-5b5f-4af6-a35f-dfc3d24867fa" />
<img width="1430" height="1536" alt="image" src="https://github.com/user-attachments/assets/9d75a825-14a3-49cc-9680-0900985d5ee0" />
<img width="1919" height="864" alt="image" src="https://github.com/user-attachments/assets/92e42daa-9f94-441e-a34f-19eb7458aac9" />
<img width="1588" height="1234" alt="image" src="https://github.com/user-attachments/assets/78c8075a-fd93-4f8a-86bb-5d6d622d3eb3" />
<img width="1280" height="2490" alt="image" src="https://github.com/user-attachments/assets/37d2a06d-cd60-407f-98b2-110e51166cfb" />
<img width="1280" height="1555" alt="image" src="https://github.com/user-attachments/assets/43622bad-1d9f-454f-b711-e68c7e40d00d" />
<img width="1606" height="869" alt="image" src="https://github.com/user-attachments/assets/7f00c170-fffd-478b-b27b-4a69b176a76f" />
<img width="1588" height="1135" alt="image" src="https://github.com/user-attachments/assets/5a33a23f-4da1-4951-b089-a9fbb3825e97" />
<img width="1919" height="867" alt="image" src="https://github.com/user-attachments/assets/98e1c109-9c45-4f15-ab5a-cab24bb70cc9" />
<img width="1588" height="900" alt="image" src="https://github.com/user-attachments/assets/62d5a206-af44-45bf-99e9-2b3f47f4375e" />
<img width="1606" height="869" alt="image" src="https://github.com/user-attachments/assets/b3e2a4db-4a9e-40ea-b051-8f8386b8580f" />
<img width="1919" height="869" alt="image" src="https://github.com/user-attachments/assets/fa44493a-6e14-48f8-bd2a-80cff46017a8" />


## 👨‍💻 Developers
Santhosh Charanthu, Nagasai Bole

📬 [Connect on LinkedIn](https://www.linkedin.com/in/santhosh-charanthu-bb6102300/)

📩 Feel free to reach out for collaboration!

## 📜 License

This project is licensed under the MIT License.
