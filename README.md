#  TaskApp – Production-Ready Full Stack System with CI/CD

A **deployment-focused full stack application** designed to reflect how modern systems are built, containerized, and automatically deployed using CI/CD pipelines.

This project demonstrates **real-world DevOps engineering practices**, not just application development.

---

##  What This Project Demonstrates

This project goes beyond CRUD applications and includes:

*  Fully Dockerized multi-service architecture
*  Automated CI/CD pipeline (GitHub Actions)
*  AWS EC2 deployment
*  Nginx reverse proxy with SSL
*  Environment-based configuration
*  JWT authentication system

---

##  Tech Stack

### Frontend

* React (Vite)

### Backend

* ASP.NET Core (.NET 10)
* JWT Authentication
* SignalR (real-time features)
* REST APIs

### Database

* SQL Server (Dockerized)

### DevOps

* Docker & Docker Compose
* GitHub Actions (CI/CD)
* AWS EC2
* Docker Hub
* Nginx Reverse Proxy

---

## ⚙️ Prerequisites

Install:

* .NET SDK 10.0
* Node.js 18+
* Docker Desktop

---

##  Backend Setup

### 1. Clone Repository

```bash
git clone https://github.com/ShaiganH/TaskProject.git
cd TaskProject/Backend/Task_Backend
```

---

### 2. Install Dependencies

```bash
dotnet restore
```

---

### 3. Run Database (SQL Server)

then run:

```bash
docker compose up -d sqlserver
```

---

### 4. Run Backend

```bash
dotnet run
```

Backend runs at:
 http://localhost:5210
Swagger:
 http://localhost:5210/swagger

---

##  Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

Frontend runs at:
 http://localhost:5173

---

##  Application Flow

* Frontend (React) → calls API
* Backend (.NET) → processes logic
* SQL Server → stores data
* JWT → handles authentication

---

---
## Backend Tests

Navigate to test project

```bash
cd Backend/Task_Backend.Tests
```

Run all tests
```bash
dotnet test
```
---

##  CI/CD Pipeline (GitHub Actions)

### Workflow:

1. Push to `main`
2. GitHub Actions:

   * Builds Docker images
   * Pushes to Docker Hub
3. Connects to AWS EC2
4. Pulls latest images
5. Restarts containers automatically

---

##  API Testing

Use Swagger:

 http://localhost:5210/swagger

---

##  Architecture Summary

```text
React Frontend
      ↓
ASP.NET Core API
      ↓
SQL Server Database
```

---

##  Future Improvements

* Kubernetes migration
* Zero-downtime deployments
* Observability (Prometheus + Grafana)
* Centralized logging (ELK stack)

---

##  Author

**Shaigan Haider**
DevOps Engineer | .NET Developer

---

