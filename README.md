# FinanceFlow - Personal Expense Tracker

A scalable, serverless expense tracker MVP built with a modern low-code architecture.

## 🚀 Project Architecture

- **Frontend:** Vanilla HTML5, JavaScript (ES6), and Tailwind CSS (Responsive Dashboard).
- **Backend (Proxy):** Node.js Express acting as a secure gateway (Deployed via Vercel).
- **Automation (Logic):** n8n (External engine handling database operations and business rules).
- **Database:** Supabase (PostgreSQL with Row Level Security).

---

## 🛠️ How to Run Locally

To develop and test this project on your local machine, you need to run two separate servers:

### 1. Start the Backend API (Proxy)
The backend handles requests and forwards them to n8n.
- **Port:** 3000
- **Commands:**
  ```bash
  # Install dependencies (first time only)
  npm install

  # Run with automatic restart
  npx nodemon api/index.js
  ```
- **Prerequisite:** Ensure you have a `.env` file in the root directory with your n8n Webhook URLs.

### 2. Start the Frontend (Static Files)
The frontend serves the user interface and connects to the backend.
- **Port:** 5000
- **Commands:**
  ```bash
  # Run the static server on port 5000
  npx serve . -l 5000
  ```
- **Access:** Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 📁 Key Directories

- `/api`: Backend logic (Express.js).
- `/assets`: Frontend assets (JavaScript, CSS).
- `/supabase`: Database schemas and migrations.
- `/ .project-rules`: Technical documentation and coding standards.
- `/ .ai-discussion`: Logs of the development progress and decisions.

---

## ⚙️ Environment Variables (.env)

Create a `.env` file in the root folder and add the following:

```env
# Supabase Credentials
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# n8n Webhook URLs
N8N_WEBHOOK_ADD_TRANSACTION=https://your-n8n-url/webhook/add-transaction
N8N_WEBHOOK_GET_TRANSACTIONS=https://your-n8n-url/webhook/get-transactions
N8N_WEBHOOK_GET_STATS=https://your-n8n-url/webhook/get-stats
```

---

## 📝 Concept Dictionary
If you are preparing for a presentation or exam, please refer to:
`/.project-rules/CONCEPT-DICTIONARY.md` for simplified explanations of Proxy, RLS, and Asynchronous JS.
