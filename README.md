# EduKno 🎓
## Unified Knowledge Management Portal for Educational Institutions

EduKno is an AI-powered knowledge management platform that aggregates educational resources from multiple sources into a single, intelligent, and gamified portal.

## 🚀 Features

### Core
- **Unified Knowledge Repository** – Aggregates content from LMS, libraries, Google Drive, and internal uploads
- **Role-Based Dashboards** – Personalized views for students, faculty, staff, alumni, parents, and admins
- **JWT Authentication** – Secure login with role-based access control (RBAC)

### AI-Powered
- **Semantic Search** – TF-IDF relevance scoring with keyword + contextual matching
- **EduBot (RAG Chatbot)** – AI chatbot that retrieves institutional knowledge and provides contextual answers with source citations
- **Personalized Recommendations** – Hybrid collaborative + content-based filtering engine

### Gamification
- **Badge System** – 12 achievement badges with progress tracking (Common → Epic rarity)
- **Reputation Points** – Activity-based scoring for uploads, views, upvotes, and engagement
- **Leaderboard** – Community rankings with podium display

### Analytics
- **Real-time Dashboard** – Charts for content distribution, user activity, search trends
- **Popular Searches** – Word cloud visualization
- **Top Contributors** – Community engagement metrics

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | FastAPI (Python) |
| **Database** | SQLite (SQLAlchemy ORM) |
| **Charts** | Chart.js + react-chartjs-2 |
| **Icons** | Lucide React |
| **Animations** | Framer Motion + CSS |
| **Auth** | JWT + bcrypt |
| **AI/Search** | TF-IDF (scikit-learn) |

## ⚡ Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
py -m uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Demo Accounts
| Username | Password | Role |
|----------|----------|------|
| student1 | password123 | Student |
| faculty1 | password123 | Faculty |
| admin1 | password123 | Admin |

## 📁 Project Structure
```
edukno/
├── backend/
│   ├── main.py              # FastAPI entrypoint
│   ├── database.py           # SQLAlchemy setup
│   ├── models.py             # ORM models
│   ├── schemas.py            # Pydantic schemas
│   ├── seed_data.py          # Demo data generator
│   └── routers/
│       ├── auth.py           # JWT authentication
│       ├── content.py        # Content CRUD
│       ├── search.py         # Unified search
│       ├── recommendations.py # Recommendation engine
│       ├── chatbot.py        # EduBot RAG
│       ├── gamification.py   # Badges & leaderboard
│       └── analytics.py      # Analytics aggregation
├── frontend/
│   └── src/
│       ├── App.tsx           # Root with routing
│       ├── context/          # Auth state
│       ├── services/         # API client
│       ├── components/       # Sidebar, etc.
│       └── pages/            # All page components
└── README.md
```

## 👥 Team
Built for the 36-hour hackathon challenge.
