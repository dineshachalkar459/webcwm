# ⚡ WebCWM — ChargeWave Management Portal

A full-stack web application for managing EV (Electric Vehicle) charging services, appointments, file uploads, and admin operations. Built with **Node.js**, **Express**, and deployed on **Vercel**.

---

link : https://webcwm.vercel.app/

## 🚀 Features

- 📅 **Appointment Booking** — Users can schedule EV charging appointments
- 📁 **File Upload System** — Upload Excel sheets and track upload history
- 📧 **Email Notifications** — Automated emails via Nodemailer
- 🛠️ **Admin Panel** — Manage appointments, uploads, and content
- 🌐 **Vercel Ready** — Serverless deployment with `/tmp` storage support
- 🔒 **CORS & Env Config** — Secure API with environment variables

---

## 🛠️ Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Runtime    | Node.js                 |
| Framework  | Express.js v5           |
| File Upload| Multer                  |
| Email      | Nodemailer              |
| Deployment | Vercel (Serverless)     |
| Storage    | Local / `/tmp` (Vercel) |

---

## 📁 Project Structure

```
webcwm/
├── api/                  # Vercel serverless API routes
├── css/                  # Stylesheets
├── js/                   # Client-side JavaScript
├── uploads/              # Uploaded files directory
├── index.html            # Main landing page
├── admin.html            # Admin dashboard
├── server.js             # Express server entry point
├── package.json          # Project dependencies
├── vercel.json           # Vercel deployment config
├── .env                  # Environment variables (not committed)
└── .gitignore            # Git ignore rules
```

---

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/webcwm.git
cd webcwm

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Run Locally

```bash
npm start
```

The app will run at `http://localhost:3000`

---

## 🌍 Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

> [!NOTE]
> On Vercel, file storage uses `/tmp` which is ephemeral. For persistent storage, integrate a cloud database or object storage (e.g., AWS S3, Cloudinary).

---

## 📬 API Endpoints

| Method | Endpoint              | Description                  |
|--------|-----------------------|------------------------------|
| GET    | `/`                   | Serve main landing page      |
| POST   | `/api/appointments`   | Book a new appointment       |
| GET    | `/api/appointments`   | Get all appointments         |
| POST   | `/api/upload`         | Upload an Excel file         |
| GET    | `/api/upload-history` | Get upload history           |
| POST   | `/api/send-email`     | Send email notification      |

---

## 📄 License

ISC License © 2026 ChargeWave

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
