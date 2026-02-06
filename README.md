# FinanceFlow - Personal Expense Tracker

A modern, serverless expense tracker MVP featuring a dynamic web dashboard, secure authentication, and a low-code automation backend.

## ✨ Key Features

- **Dynamic Dashboard:** Real-time summary of balance, income, and expenses with interactive charts.
- **Full CRUD Operations:** Create, Read, Update, and Delete transactions easily.
- **Statistics Page:** In-depth spending analysis with doughnut charts, detailed expense lists, search, and pagination.
- **User Authentication:** Secure login, registration, and profile management powered by Supabase Auth.
- **PDF Export:** Generate and download monthly expense reports instantly.
- **Automated Logic:** Business logic handled by n8n workflows for flexibility and scalability.

---

## 🚀 Tech Stack & Architecture

- **Frontend:** Vanilla HTML5, JavaScript (ES6+), Tailwind CSS (CDN), Chart.js.
- **Backend Proxy:** Node.js + Express (Acts as a secure gateway to validate JWTs).
- **Logic Engine:** n8n (Webhooks handle data processing and DB interactions).
- **Database:** Supabase PostgreSQL (with Row Level Security enabled).
- **Auth:** Supabase Auth (Email/Password).

---

## 🛠️ Setup Guide

Follow these steps to set up the project locally.

### 1. Prerequisites
- Node.js (v18 or higher)
- A Supabase account (Free tier is sufficient)
- An n8n instance (Self-hosted or Cloud)

### 2. Database Setup (Supabase)
1. Create a new project in Supabase.
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open the file `supabase/setup.sql` from this repository.
4. Copy the content and paste it into the SQL Editor.
5. Click **Run** to generate the necessary tables, triggers, and security policies.

### 3. Automation Setup (n8n)
1. Open your n8n dashboard.
2. Create new workflows for each JSON file located in the `n8n-workflows/` folder:
   - `FinanceFlow_Add-Transactions.json`
   - `FinanceFlow_Get-Transactions.json`
   - ...and others.
3. **Important:** In each workflow, update the **Supabase Node** and **Postgres Node** credentials to connect to your specific Supabase project.
4. Activate the workflows and copy their **Production Webhook URLs**.

### 4. Configuration

**Backend (`.env`)**
Create a `.env` file in the root directory and fill it with your credentials:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# n8n Webhook URLs (Paste the URLs from Step 3)
N8N_WEBHOOK_ADD_TRANSACTION=https://your-n8n.com/webhook/...
N8N_WEBHOOK_GET_TRANSACTIONS=https://your-n8n.com/webhook/...
N8N_WEBHOOK_UPDATE_TRANSACTION=https://your-n8n.com/webhook/...
N8N_WEBHOOK_DELETE_TRANSACTION=https://your-n8n.com/webhook/...
N8N_WEBHOOK_GET_STATS=https://your-n8n.com/webhook/...
N8N_WEBHOOK_GET_CATEGORIES=https://your-n8n.com/webhook/...
N8N_WEBHOOK_GET_CATEGORY_STATS=https://your-n8n.com/webhook/...
```

**Frontend (`assets/js/config.js`)**
Create a file at `assets/js/config.js`:
```javascript
window.APP_CONFIG = {
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key-here'
};
```

---

## ▶️ How to Run

You need to run the backend and frontend servers simultaneously.

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Backend API
This runs the Express proxy on port 3000.
```bash
node api/index.js
# Or for development with auto-restart:
npx nodemon api/index.js
```

### 3. Start Frontend
This serves the static files on port 5000.
```bash
npx serve . -l 5000
# Or:
npx live-server --port=5000
```

### 4. Access the App
Open your browser and navigate to:
**http://localhost:5000/login.html**

---

## 📂 Project Structure

```
.
├── api/                  # Express Backend (Proxy)
│   └── index.js          # Main entry point
├── assets/               # Static Assets
│   ├── js/               # Frontend Logic
│   └── css/              # Styles
├── n8n-workflows/        # JSON Workflow exports
├── supabase/             # Database Schemas & Triggers
│   └── setup.sql         # All-in-one DB setup script
└── index.html            # Main Dashboard
```
