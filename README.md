# HC Platform — Setup Instructions

## Prerequisites

- [Docker](https://www.docker.com/get-started) & Docker Compose
- [Node.js](https://nodejs.org/) v18+ (for running the client locally)

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd DS-Assignment-To-Commit
```

---

## 2. Configure Environment Variables

Each service has an `.env.example` file. Copy it to `.env` and update values as needed.

```bash
cp services/api-gateway/.env.example services/api-gateway/.env
cp services/auth-service/.env.example services/auth-service/.env
cp services/patient-service/.env.example services/patient-service/.env
cp services/doctor-service/.env.example services/doctor-service/.env
```

> **Important:** Set a strong `JWT_SECRET` in both `api-gateway/.env` and `auth-service/.env`. The value must match across both files.

---

## 3. Start the Backend (Docker)

From the project root, run:

```bash
docker compose up --build
```

This starts the following services:

| Service          | Port  | Description                  |
|------------------|-------|------------------------------|
| `api-gateway`    | 5000  | Public entry point           |
| `auth-service`   | —     | Internal auth microservice   |
| `patient-service`| —     | Internal patient microservice|
| `doctor-service` | —     | Internal doctor microservice |
| `mongo`          | 27017 | MongoDB (internal + Compass) |

To stop all services:

```bash
docker compose down
```

---

## 4. Start the Frontend (Client)

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

The client will be available at `http://localhost:5173` by default.

---

## Service Port Reference

| Service          | Internal Port |
|------------------|---------------|
| api-gateway      | 5000          |
| auth-service     | 5007          |
| patient-service  | 5002          |
| doctor-service   | 5001          |
| MongoDB          | 27017         |
