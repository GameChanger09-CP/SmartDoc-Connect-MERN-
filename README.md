# 📂 SmartDoc Connect

SmartDoc Connect is an enterprise-grade document management system. It uses **Google Gemini 2.0 Flash** to analyze document contents and automatically route them to the correct department. It features a complete hierarchy (Client, Main Admin, Dept Admin, Faculty) and automated email notifications.

## 🚀 Tech Stack
* **Frontend:** React + Vite + Tailwind CSS
* **Backend:** Node.js + Express.js
* **Database:** MongoDB (Mongoose)
* **AI Engine:** Google Gemini 2.0 Flash (via API)
* **Notifications:** Nodemailer (SMTP)

---

## 🛠️ System Prerequisites
Before starting, ensure you have the following installed:

1.  **Node.js & npm:** (Download from [nodejs.org](https://nodejs.org/))
2.  **MongoDB:**
    * **Local:** Install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
    * **Cloud:** Or get a connection string from MongoDB Atlas.

---

## 📥 1. Setup the Project
Clone the repository to your local machine:

```bash
git clone <YOUR_GITHUB_REPO_URL_HERE>
cd SmartDoc-Connect
🐍 2. Backend Setup (Node.js)
Navigate to the backend folder and install the required packages.

Bash
cd node-backend

# 1. Install Dependencies
npm install
Configure Environment Variables
Create a .env file inside the node-backend/ folder and paste the following configuration:

Code snippet
# Server Config
PORT=8001
MONGODB_URI=mongodb://127.0.0.1:27017/smartdoc_db
JWT_SECRET=my_super_secret_secure_key_123

# Google AI (Get key from aistudio.google.com)
GEMINI_API_KEY=AIzaSyDxxxx_YOUR_REAL_API_KEY

# Email Notifications (Gmail requires an App Password)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_16_digit_app_password
Seed the Main Admin Account
Since there is no public sign-up for Admins, you must create the first Main Admin via the terminal. Run this command inside node-backend/:

Bash
node -e "require('mongoose').connect('mongodb://127.0.0.1:27017/smartdoc_db').then(() => { const bcrypt = require('bcryptjs'); const { User } = require('./models'); User.create({ username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'Main_Admin', kyc_status: 'Verified' }).then(() => { console.log('✅ Admin Created'); process.exit(); }); }).catch(e => { console.log('Error:', e.message); process.exit(); });"
Username: admin

Password: admin123

Start the Server
Bash
node server.js
✅ You should see: 🚀 Node API running on http://127.0.0.1:8001

⚛️ 3. Frontend Setup (React)
Open a new terminal window (keep the backend running) and navigate to the frontend folder.

Bash
cd src  # (Or wherever your React package.json is located, usually root or 'frontend')

# 1. Install Node Dependencies
npm install

# 2. Start the Development Server
npm run dev
✅ Frontend is now running at: http://localhost:5173/

🤖 4. How to Test the Workflow
Phase 1: Main Admin Setup
Login as Main Admin (admin / admin123).

Go to the Dashboard.

Use the "Provision User" tool to create a Department Admin (e.g., Role: Dept_Admin, Username: IT_Head).

Note: Creating a Dept Admin automatically creates the Department in the system.

Phase 2: Dept Admin Setup
Logout and Login as the new Dept Admin (IT_Head).

Use the "Add Faculty" tool to create a Faculty member (e.g., Role: Faculty, Username: Prof_Smith).

Phase 3: The Document Cycle (AI & Manual)
Register a Client: Go to the Landing Page -> Client -> Sign Up.

Upload: Login as Client -> Upload a Document.

Routing:

AI Mode: If enabled, the AI analyzes the doc and routes it to the correct Dept.

Manual Mode: If AI confidence is low, it goes to the Main Admin ("Review Required").

Processing:

Main Admin routes it to IT_Head.

IT_Head assigns it to Prof_Smith.

Prof_Smith reviews it, uploads a generic report PDF, and submits it back.

IT_Head approves the report.

Main Admin forwards the final report to the Client.

Completion: The Client receives an email and can download the final report from their dashboard.

📧 5. Troubleshooting Emails
If emails are not sending:

Ensure you are using an App Password for Gmail (not your login password).

Check that MAIL_PORT is 587.

Check the backend terminal for logs: ✉️ Automated Email sent to....