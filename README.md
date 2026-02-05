# FinanceFlow - Personal Expense Tracker

A modern, serverless expense tracker MVP featuring a dynamic web dashboard and a low-code automation backend.

---

## ✨ Key Features

- **Dynamic Dashboard:** Real-time summary of balance, income, and expenses with interactive charts.
- **Full CRUD Operations:** Create, Read, Update, and Delete transactions easily.
- **Statistics Page:** In-depth spending analysis with a doughnut chart, detailed expense list, search, and pagination.
- **User Authentication:** Secure login, register, and password management powered by Supabase Auth.
- **PDF Export:** Download monthly expense reports directly from the statistics page.
- **Dynamic Theming:** A modern "Amber-Teal" color scheme for a fresh user experience.

---

## 🚀 Architecture Overview

- **Frontend:** Vanilla HTML5, JavaScript (ES6), Tailwind CSS, Chart.js, and jsPDF.
- **Backend (API Gateway):** A lightweight Node.js Express server acts as a secure proxy to validate JWTs and forward requests.
- **Automation (Logic Engine):** n8n handles all business logic, data aggregation, and integrations with Supabase.
- **Database & Auth:** Supabase (PostgreSQL) for data storage, user identity management, and Row Level Security (RLS).

---

## 🛠️ How to Run Locally

To develop and test this project on your local machine, you need to run two separate servers:

### 1. Start the Backend API (Proxy)
The backend validates user tokens and forwards requests to your n8n workflows.

- **Prerequisite:** Ensure you have a `.env` file in the root directory (see `.env.example` for required variables).
- **Port:** 3000
- **Commands:**
  ```bash
  # Install dependencies (first time only)
  npm install

  # Run with automatic restart on file changes
  npx nodemon api/index.js
  ```

### 2. Start the Frontend (Static Files)
The frontend serves the user interface.

- **Prerequisite:** Create `assets/js/config.js` with your Supabase credentials.
- **Port:** 5000
- **Commands:**
  ```bash
  # Run the static server on port 5000
  npx serve . -l 5000
  ```
- **Access:** Open [http://localhost:5000/login.html](http://localhost:5000/login.html) in your browser.

---

## ⚙️ Environment & Config

### `.env` (Backend)
This file is for your server-side secrets.

```env
# Supabase credentials (for backend validation)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# n8n Webhook URLs
N8N_WEBHOOK_ADD_TRANSACTION=...
N8N_WEBHOOK_GET_TRANSACTIONS=...
N8N_WEBHOOK_UPDATE_TRANSACTION=...
N8N_WEBHOOK_DELETE_TRANSACTION=...
N8N_WEBHOOK_GET_STATS=...
N8N_WEBHOOK_GET_CATEGORIES=...
N8N_WEBHOOK_GET_CATEGORY_STATS=...
```

### `assets/js/config.js` (Frontend)
This file is for your public client-side Supabase credentials.

```javascript
// assets/js/config.js
window.APP_CONFIG = {
    supabaseUrl: 'YOUR_SUPABASE_URL_HERE',
    supabaseKey: 'YOUR_SUPABASE_ANON_KEY_HERE'
};
```

---

## 📝 Technical Documentation

For a deeper understanding of the technical concepts and architectural decisions made in this project, please refer to the following documents:
- **`README.md`:** You are here!
- **`/.project-rules/CONCEPT-DICTIONARY.md`:** Simplified explanations of Proxy, RLS, Asynchronous JS, etc.
