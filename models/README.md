# 🎓 ClubXplore – College Club Management System

**ClubXplore** is a full-featured, centralized platform that simplifies the management and promotion of college clubs and their events. Built for colleges, clubs, and students, it enables seamless creation, editing, and registration of events, while supporting media uploads, user authentication, and detailed club profiles.

## 🚀 Features

### 🔐 Authentication
- College & Club-based login system
- Secure password storage and session handling with `express-session` & `passport.js`

### 🏫 College Module
- Register/Login as a college
- View and edit college profile
- Manage registered clubs and events

### 🎉 Club Module
- Register/Login as a club
- Create, edit, or delete club profile
- Add/edit:
  - Faculty & student coordinators
  - Social media links
  - Club descriptions, logos, and files

### 📅 Event Management
- Club can:
  - Create new events
  - Edit/update event details
  - Delete events
  - View event registrations
- Events include:
  - Title, description, poster/image, date & time, visibility (public/private)

### 🧾 Event Registration
- Public users can view and register for visible events
- Event data is securely stored and viewable by respective club owners

### 📂 File Uploads
- Poster & logo upload with `Multer`
- Upload validations for size and type

### 📑 Pages
- Over 10 dynamic pages (EJS templating)
- Forms for login, club/event registration, profile editing
- Error handling and success messages

### 💾 Backend
- Node.js + Express
- MongoDB with Mongoose
- Structured using Routers and Controllers

---

## 🛠 Tech Stack

| Layer       | Technology                          |
|-------------|--------------------------------------|
| **Frontend**| HTML, CSS, EJS                       |
| **Backend** | Node.js, Express.js                 |
| **Database**| MongoDB Atlas + Mongoose            |
| **Authentication** | Passport.js + express-session |
| **File Uploads**| Multer                           |
| **Templating**| EJS                               |

---

## ⚙️ Setup Instructions

### 1. Clone the repo

```bash
git clone https: https://github.com/Santhosh-Charanthu/Clubs

```

## Install dependencies

npm install

## Add .env file

MONGO_URI=your_mongodb_connection

SESSION_SECRET=your_secret

## Run the app

node app.js
App runs on http://localhost:8080 by default

## 🧠 Future Enhancements

- 🧾 Admin dashboard with analytics  
- 📧 Notification/email system for event reminders  
- ⚛️ React.js frontend version  
- 🎟️ QR-based event check-in system  

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change or improve.

---

## 👨‍💻 Author

**Santhosh Charanthu**  
Full-Stack Developer | Passionate about building scalable college platforms  
📬 [Connect on LinkedIn](https://www.linkedin.com/in/santhosh-charanthu-bb6102300/)
