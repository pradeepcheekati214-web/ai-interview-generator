# 🤖 PrepAI – AI Interview Question Generator

A production-ready, full-stack web application that generates personalized interview questions using **Google Gemini AI**. Built for students, freshers, and professionals targeting roles in software development, cloud engineering, and more.

---

## 🌟 Live Demo

- **Frontend:** [https://your-app.vercel.app](https://your-app.vercel.app)  
- **Backend API:** [https://your-backend.onrender.com](https://your-backend.onrender.com)

---

## 🚀 Features

| Feature | Description |
|---|---|
| ✨ AI Question Generation | Gemini-powered questions tailored to role, skills & difficulty |
| 🎯 Mock Interview Scoring | AI rates your answer on accuracy, communication & completeness |
| 📚 4 Question Categories | Technical, HR, Behavioral, Scenario-Based |
| 🎚️ Difficulty Levels | Easy / Medium / Hard |
| 📄 Export | Download questions as PDF or TXT |
| 📂 Interview History | SQLite-backed history with reopen & delete |
| 📎 Resume Upload | Generate questions from your resume (.txt / .pdf) |
| 🎤 Voice Input | Web Speech API for spoken answers |
| 🌙 Dark / Light Mode | Persistent theme toggle |
| 📱 Responsive | Works on desktop, tablet, and mobile |

---

## 🛠️ Tech Stack

```
Frontend   → HTML5, CSS3, Vanilla JavaScript
Backend    → Python Flask
AI         → Google Gemini 1.5 Flash
Database   → SQLite (via Python sqlite3)
Deployment → Vercel (frontend) + Render (backend)
```

---

## 📁 Project Structure

```
project/
├── frontend/
│   ├── index.html        # Full landing page + app UI
│   ├── style.css         # Glassmorphism design system
│   └── script.js         # All frontend logic
│
├── backend/
│   ├── app.py            # Flask app factory & entry point
│   ├── routes.py         # All API route handlers
│   ├── models.py         # Input validation models
│   ├── database.py       # SQLite helpers
│   ├── gemini_service.py # Gemini API integration
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment variable template
│
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.10+
- A Google Gemini API key (get it at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### 1. Clone & Install Backend

```bash
# Navigate to backend folder
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy the template
copy .env.example .env        # Windows
cp .env.example .env          # macOS/Linux

# Edit .env and add your Gemini API key
```

Your `.env` file should look like:
```env
GEMINI_API_KEY=AIzaSy...your_key_here
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=change-this-to-a-random-string
CORS_ORIGINS=http://localhost:5500
RATE_LIMIT=20 per minute
```

### 3. Run the Backend

```bash
python app.py
# Server starts at http://localhost:5000
```

### 4. Open the Frontend

Open `frontend/index.html` in your browser using a local server:

```bash
# Using Python:
cd frontend
python -m http.server 5500

# Or use VS Code Live Server extension
```

Then visit: `http://localhost:5500`

---

## 🌐 Deployment

### Backend → Render

1. Push your `backend/` folder to a GitHub repository.
2. Go to [render.com](https://render.com) → **New Web Service**.
3. Connect your GitHub repo.
4. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Add **Environment Variables** in Render dashboard:
   - `GEMINI_API_KEY` = your key
   - `SECRET_KEY` = random secure string
   - `CORS_ORIGINS` = your Vercel URL (e.g., `https://prepai.vercel.app`)
   - `FLASK_ENV` = `production`
6. Deploy. Note your Render URL.

> **Tip:** Add `gunicorn==22.0.0` to `requirements.txt` before deploying.

### Frontend → Vercel

1. Push your `frontend/` folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → **New Project**.
3. Import your repo.
4. Set **Root Directory** to `frontend`.
5. Before deploying, update `script.js` line 10:
   ```js
   : "https://your-render-backend.onrender.com"
   ```
6. Deploy. Done!

---

## 📡 API Reference

### POST `/generate`
Generate interview questions.

**Request:**
```json
{
  "role": "AWS Cloud Engineer",
  "experience": "fresher",
  "skills": "AWS, Linux, Networking",
  "difficulty": "medium",
  "category": "mixed",
  "num_questions": 10
}
```

**Response:**
```json
{
  "id": 1,
  "questions": [
    {
      "id": 1,
      "type": "Technical",
      "question": "What is AWS VPC?",
      "answer": "A Virtual Private Cloud is...",
      "difficulty": "Medium",
      "tags": ["AWS", "Networking"]
    }
  ],
  "meta": { "role": "AWS Cloud Engineer", ... }
}
```

---

### POST `/evaluate`
Score a candidate's mock interview answer.

**Request:**
```json
{
  "question": "What is AWS VPC?",
  "user_answer": "VPC is a virtual network...",
  "expected_answer": "A Virtual Private Cloud is..."
}
```

**Response:**
```json
{
  "accuracy": 8,
  "communication": 7,
  "completeness": 6,
  "total": 7.0,
  "feedback": "Good understanding but...",
  "strengths": ["Correct definition"],
  "improvements": ["Add more detail about subnets"]
}
```

---

### GET `/history`
List all saved interviews.

### GET `/history/<id>`
Get a single interview with full questions.

### DELETE `/history/<id>`
Delete a saved interview.

### POST `/download/pdf`
Generate and stream a PDF download.

### POST `/download/txt`
Generate and stream a TXT download.

### POST `/resume`
Generate questions from resume text.

### GET `/health`
Health check endpoint.

---

## 🧪 Testing the API

Using `curl`:
```bash
# Health check
curl http://localhost:5000/health

# Generate questions
curl -X POST http://localhost:5000/generate \
  -H "Content-Type: application/json" \
  -d '{"role":"Frontend Developer","experience":"fresher","skills":"React,JavaScript,CSS","difficulty":"easy","category":"mixed","num_questions":5}'

# Evaluate an answer
curl -X POST http://localhost:5000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"question":"What is React?","user_answer":"React is a JavaScript library.","expected_answer":"React is a JavaScript library for building UIs."}'
```

---

## 🔒 Security Notes

- API key is stored in `.env`, never committed to git.
- Input validation rejects malformed or oversized requests.
- Rate limiting (20 req/min by default) protects the API.
- CORS locked to your Vercel domain in production.
- XSS prevention via `escHtml()` in the frontend.

---

## 📦 Sample `.env` (Production)

```env
GEMINI_API_KEY=AIzaSy_your_actual_key
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=a-long-random-secure-string-here
CORS_ORIGINS=https://prepai.vercel.app
RATE_LIMIT=20 per minute
PORT=10000
```

---

## 🎯 Target Roles Supported

- Software Developers (Java, Python, JavaScript)
- Frontend Developers (React, Angular, Vue)
- AWS / Cloud Engineers
- DevOps / SRE Engineers
- Data Engineers / Analysts
- Freshers & Students (any domain)

---

## 📝 License

MIT License – free to use, modify, and distribute.

---

**Built with ❤️ using Python Flask + Google Gemini AI**
