# DataVal.ai 🚀

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple.svg)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)](https://www.docker.com/)

**DataVal.ai** is an ultra-high performance, enterprise-grade AI dataset analytics, validation, and augmentation platform. It allows machine learning and data science teams to detect latency, find leakage, validate data streams, and automatically resolve potential dataset issues in real-time. Whether you are dealing with computer vision image inputs or rich tabular data, DataVal.ai automatically understands the structure and scales the processing dynamically using High-Performance Computing (HPC) patterns.

---

## 🔥 Key Features

- **High-Performance HPC Augmentation Pipeline:** Processes thousands of images (e.g., 3000+ files) in under 15 seconds. Designed via SIMD LUT-based vectorized OpenCV operations to bypass GIL performance limits utilizing the absolute maximum of your Physical CPU Cores.
- **Smart Data Analysis:** Detects data leakage, handles missing values, and visualizes accurate class distribution logic for both image clusters and tabular structures. 
- **Automated Memory Safety:** Advanced garbage collector utilizing `threading.Lock` task-based mutex implementations to prevent Race Conditions and disk read/write constraints during user ZIP export operations. 
- **Parallel Chunk ZIP Streaming:** Zero-downtime, non-blocking asynchronous generator streaming to directly tunnel the final processed ZIP streams.
- **Secure End-to-End Authentication:** Enterprise authentication flow featuring Bearer Token systems along with automatic OAuth2 SSO configuration via modern providers (Google and GitHub).
- **Stunning User Interface:** Powered by React, framed with modern dark Glassmorphism semantics, Framer Motion animations, and beautiful diagnostic Recharts. Tailored UX focusing on enterprise SaaS identity.

---

## 🏗️ Architecture

### Frontend (Client-side)
- **Framework:** React 19, Vite
- **Styling & UI:** Tailwind CSS v4, Lucide React Icons
- **Animation:** Framer Motion
- **Charting & Reports:** Recharts, HTML2Canvas, JSPdf, React-PDF 
- **State & Routing:** React Context API, React Router v7, Axios

### Backend (Server-side)
- **Framework:** FastAPI, Uvicorn, Pydantic
- **ML & CV Engine:** Pandas, Scikit-Learn, OpenCV (`cv2`), NumPy
- **Concurrency Setup:** `ThreadPoolExecutor` (GIL-Free OpenCV executions), Multi-Thread Producer-Consumer flow.
- **Database Architecture:** SQLAlchemy ORM, SQLite / PostgreSQL Support
- **Security:** Authlib, PyJWT, Passlib

---

## 🛠️ Folder Structure

```text
📦 DataVal.ai
├── 📂 dataval_frontend/      # React & Vite client codebase
│   ├── 📂 src/               # React components, pages, lib, animations
│   ├── 📜 package.json       # Frontend dependencies and scripts
│   └── 📜 tailwind.config.js # Tailwind system styling configs
│
├── 📂 dataval_backend/       # Python & FastAPI server codebase
│   ├── 📜 main.py            # Primary HTTP server, parallel pipelines & garbage collection
│   ├── 📜 analyzer.py        # ML analytics validation & leakage assessment
│   ├── 📜 detector.py        # ZIP extraction strategy schema mapping logic
│   ├── 📜 models.py          # Database Entity Mappers
│   └── 📜 requirements.txt   # Backend runtime dependencies
│
└── 📜 docker-compose.yml     # Multi-container orchestration configurations
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js (18+)](https://nodejs.org/) and [Python (3.10+)](https://www.python.org/) installed on your machine.

### 1. Setup Backend
```bash
# Navigate to backend directory
cd dataval_backend

# Install python dependencies
pip install -r requirements.txt

# Configure your environmental file
cp .env.example .env

# Start the uvicorn development server
uvicorn main:app --reload --port 8000
```
> The API interactive documentation (Swagger UI) will run at `http://localhost:8000/docs`.

### 2. Setup Frontend
```bash
# Navigate to frontend directory
cd dataval_frontend

# Install node dependencies
npm install

# Start the vite development server
npm run dev
```
> The development frontend client will be available at `http://localhost:5173`.

### 3. Docker Deployments
For production grade deployments, you can spin up the environment effortlessly:
```bash
# Compile and run the integrated full-stack
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 🛡️ License

This project is open-sourced under the MIT License. Developed and optimized for advanced ML tooling and pipelines.
