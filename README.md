# CareLink Health Platform

A cloud-native, microservices-based healthcare platform built with Node.js, React, MongoDB, RabbitMQ, and Kubernetes. It supports patient appointment booking, virtual telemedicine sessions (Jitsi/JaaS), AI-powered doctor matching, Stripe payments, SMS/email notifications, and digital prescription generation.

---

## Architecture Overview

All client requests flow through a single **API Gateway** which handles JWT verification and proxies to the appropriate backend service. Services communicate asynchronously via **RabbitMQ** (topic exchange `hc.platform.events`) for events such as appointment confirmations, cancellations, and payment refunds. Each service owns its own **MongoDB** database.

```
Client (React + Vite)
        │
        ▼
  API Gateway :5000
        │
  ┌─────┼──────────────────────────────────────────┐
  │     │                                          │
  ▼     ▼     ▼         ▼           ▼       ▼     ▼
Auth  Patient Doctor  Appt.    Telemedicine  Pay  AI
:5007  :5002  :5001   :5003       :5005     :5006 :5008
                        │
                   Notification
                      :5004
```

**Event bus (RabbitMQ):**
- `appointment-service` → publishes appointment lifecycle events
- `payment-service`     → publishes payment / refund events
- `notification-service`→ consumes all events, sends email + SMS
- `appointment-service` → consumes payment events (status sync)

---

## Services

| Service | Port | Responsibility |
|---|---|---|
| `api-gateway` | 5000 | JWT auth, rate limiting, reverse proxy |
| `auth-service` | 5007 | Registration, login, token refresh, admin user management |
| `patient-service` | 5002 | Patient profiles, medical reports |
| `doctor-service` | 5001 | Doctor profiles, availability slots, prescriptions (PDF) |
| `appointment-service` | 5003 | Booking, status lifecycle, doctor search |
| `telemedicine-service` | 5005 | JaaS/Jitsi session management |
| `payment-service` | 5006 | Stripe PaymentIntents, webhooks, refunds |
| `notification-service` | 5004 | Email (Nodemailer) + SMS (Twilio) |
| `ai-service` | 5008 | Gemini-powered symptom analysis & doctor matching |

---

## Frontend (Client)

React 19 + Vite + Tailwind CSS. Served by nginx in production, Vite dev server in development.

**Role-based dashboards:**

| Role | Pages |
|---|---|
| Patient | Overview, Appointments, Book, Prescriptions, Payments, Smart Match (AI), Settings |
| Doctor | Overview, Appointments, Availability, Prescription Form, Settings |
| Admin | Overview, Doctors (approval), Users, Analytics, Settings |

The client resolves the API base URL from `window.__HC_ENV__.VITE_API_BASE_URL` (injected at runtime by nginx) or `VITE_API_BASE_URL` env var. Falls back to `http://localhost:30500/api`.

---

## Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (for Kubernetes deployment)
- A running Kubernetes cluster (Minikube, Docker Desktop K8s, etc.)
- External accounts required for full functionality:
  - [Supabase](https://supabase.com) — patient file storage
  - [Stripe](https://stripe.com) — payments (`sk_test_…`, webhook secret)
  - [Twilio](https://twilio.com) — SMS notifications
  - [JaaS (8x8)](https://jaas.8x8.vc) — telemedicine video sessions
  - [Google AI Studio](https://aistudio.google.com) — Gemini API key

---

## Option 1 — Docker Compose (Local Development)

### Step 1 — Create .env files

Create a `.env` file in each service directory. Keys marked `(*)` are sensitive — never commit them.

**`services/auth-service/.env`**
```env
PORT=5007
MONGO_URI=mongodb://mongo:27017/auth-db
JWT_SECRET=                        # (*) strong random string, must match api-gateway
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
INTERNAL_SECRET=                   # (*) shared secret for service-to-service calls
PATIENT_SERVICE_URL=http://patient-service:5002
DOCTOR_SERVICE_URL=http://doctor-service:5001
ADMIN_DEFAULT_EMAIL=admin@system.com
ADMIN_DEFAULT_PASSWORD=            # (*) seeded on first boot if no admin exists
```

**`services/patient-service/.env`**
```env
PORT=5002
MONGO_URI=mongodb://mongo:27017/patient-db
INTERNAL_SECRET=                   # (*) must match auth-service
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=         # (*)
```

**`services/doctor-service/.env`**
```env
PORT=5001
MONGO_URI=mongodb://mongo:27017/doctor-db
INTERNAL_SECRET=                   # (*)
PATIENT_SERVICE_URL=http://patient-service:5002
APPOINTMENT_SERVICE_URL=http://appointment-service:5003
```

**`services/appointment-service/.env`**
```env
PORT=5003
MONGO_URI=mongodb://mongo:27017/appointment-db
RABBITMQ_URL=amqp://hcadmin:hcpassword@rabbitmq:5672
INTERNAL_SECRET=                   # (*)
DOCTOR_SERVICE_URL=http://doctor-service:5001
PATIENT_SERVICE_URL=http://patient-service:5002
TIMEZONE=Asia/Colombo
SLOT_DURATION_MINUTES=20
```

**`services/notification-service/.env`**
```env
PORT=5004
MONGO_URI=mongodb://mongo:27017/notification-db
RABBITMQ_URL=amqp://hcadmin:hcpassword@rabbitmq:5672
INTERNAL_SECRET=                   # (*)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=                        # (*) Gmail App Password
EMAIL_FROM=HC Platform <you@example.com>
TWILIO_ACCOUNT_SID=                # (*) starts with AC…
TWILIO_AUTH_TOKEN=                 # (*)
TWILIO_FROM_NUMBER=                # (*) e.g. +1234567890
```

> If Twilio credentials are absent the service boots normally and silently skips SMS — email still works.

**`services/telemedicine-service/.env`**
```env
PORT=5005
MONGO_URI=mongodb://mongo:27017/telemedicine-db
RABBITMQ_URL=amqp://hcadmin:hcpassword@rabbitmq:5672
INTERNAL_SECRET=                   # (*)
APPOINTMENT_SERVICE_URL=http://appointment-service:5003
JAAS_APP_ID=
JAAS_API_KEY_ID=
JAAS_PRIVATE_KEY=                  # (*) RS256 private key (newlines as \n)
```

**`services/payment-service/.env`**
```env
PORT=5006
MONGO_URI=mongodb://mongo:27017/payment-db
RABBITMQ_URL=amqp://hcadmin:hcpassword@rabbitmq:5672
INTERNAL_SECRET=                   # (*)
APPOINTMENT_SERVICE_URL=http://appointment-service:5003
STRIPE_SECRET_KEY=                 # (*) sk_test_…
STRIPE_WEBHOOK_SECRET=             # (*) whsec_… from Stripe dashboard
```

**`services/ai-service/.env`**
```env
PORT=5008
INTERNAL_SECRET=                   # (*)
GEMINI_API_KEY=                    # (*)
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/models
DOCTOR_SERVICE_URL=http://doctor-service:5001
```

**`services/api-gateway/.env`**
```env
PORT=5000
JWT_SECRET=                        # (*) must match auth-service
AUTH_SERVICE_URL=http://auth-service:5007
PATIENT_SERVICE_URL=http://patient-service:5002
DOCTOR_SERVICE_URL=http://doctor-service:5001
APPOINTMENT_SERVICE_URL=http://appointment-service:5003
NOTIFICATION_SERVICE_URL=http://notification-service:5004
TELEMEDICINE_SERVICE_URL=http://telemedicine-service:5005
PAYMENT_SERVICE_URL=http://payment-service:5006
AI_SERVICE_URL=http://ai-service:5008
```

### Step 2 — Start the stack

**Development mode** — nodemon hot-reload on all backend services + Vite HMR on the client:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
| Endpoint | URL |
|---|---|
| Client UI | http://localhost:5173 |
| API Gateway | http://localhost:5000/api |
| RabbitMQ Management | http://localhost:15672 |

**Production mode** — static nginx build, same image as Kubernetes:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```
| Endpoint | URL |
|---|---|
| Client UI | http://localhost:3000 |
| API Gateway | http://localhost:5000/api |

### Step 3 — Default admin account

On first boot, `auth-service` seeds a default admin using `ADMIN_DEFAULT_EMAIL` / `ADMIN_DEFAULT_PASSWORD` from the env. Use these credentials to log in to the admin dashboard.

### Step 4 — Stop the stack
```bash
docker-compose down          # stop containers
docker-compose down -v       # stop + delete volumes (wipes all data)
```

---

## Option 2 — Kubernetes

### Step 1 — Build Docker images

Run from the project root:

```bash
docker build -t hc-auth-service:latest         ./services/auth-service
docker build -t hc-patient-service:latest       ./services/patient-service
docker build -t hc-doctor-service:latest        ./services/doctor-service
docker build -t hc-appointment-service:latest   ./services/appointment-service
docker build -t hc-notification-service:latest  ./services/notification-service
docker build -t hc-telemedicine-service:latest  ./services/telemedicine-service
docker build -t hc-payment-service:latest       ./services/payment-service
docker build -t hc-ai-service:latest            ./services/ai-service
docker build -t hc-api-gateway:latest           ./services/api-gateway
docker build -t hc-client:latest                ./client
```

> **Minikube only:** run `eval $(minikube docker-env)` first, then re-run all build commands in that shell so images are available inside the cluster.

### Step 2 — Apply secrets

```bash
kubectl apply -f k8s/secrets.yml
```

This creates the `healthcare` namespace and all Kubernetes Secrets (Mongo URIs, JWT secret, API keys, etc.).

> **Before any real deployment:** replace every placeholder value in `k8s/secrets.yml` with strong credentials. Never commit real secrets to source control.

### Step 3 — Apply ConfigMap

```bash
kubectl apply -f k8s/configmap.yml
```

Sets internal service URLs, SMTP config, Twilio Messaging SID, Gemini model, and other non-sensitive shared config.

### Step 4 — Deploy infrastructure

```bash
kubectl apply -f k8s/infra.yml
```

Deploys MongoDB (StatefulSet + PVC) and RabbitMQ. Wait until pods are ready before proceeding:

```bash
kubectl get pods -n healthcare -w
```

### Step 5 — Deploy application services

```bash
kubectl apply -f k8s/services.yml
```

Deploys all 9 backend microservices. Each has readiness and liveness probes on its `/health` endpoint.

### Step 6 — Deploy the API Gateway and client

```bash
kubectl apply -f k8s/gateway.yml
```

The API Gateway is exposed as a **NodePort on port 30500**. The client is exposed on **NodePort 30080**.

### Step 7 — Access the application

```bash
kubectl get nodes -o wide          # find your node IP
# or for Minikube:
minikube ip
```

| Endpoint | URL |
|---|---|
| Client UI | `http://<node-ip>:30080` |
| API Gateway | `http://<node-ip>:30500/api` |

### Step 8 — Verify pods

```bash
kubectl get pods -n healthcare
kubectl get services -n healthcare
```

### Step 9 — Tear down

```bash
kubectl delete namespace healthcare
```

---

## Rebuilding a single service

After changing code in a service, rebuild only that image and restart the deployment:

```bash
docker build -t hc-<service-name>:latest ./services/<service-name>
kubectl rollout restart deployment/<service-name> -n healthcare
kubectl rollout status deployment/<service-name> -n healthcare
```

Example for the patient service:
```bash
docker build -t hc-patient-service:latest ./services/patient-service
kubectl rollout restart deployment/patient-service -n healthcare
```

---

## Port Reference

| Service | Internal Port | K8s NodePort |
|---|---|---|
| Client | 80 (nginx) | 30080 |
| API Gateway | 5000 | 30500 |
| Auth Service | 5007 | — |
| Patient Service | 5002 | — |
| Doctor Service | 5001 | — |
| Appointment Service | 5003 | — |
| Notification Service | 5004 | — |
| Telemedicine Service | 5005 | — |
| Payment Service | 5006 | — |
| AI Service | 5008 | — |
| MongoDB | 27017 | — |
| RabbitMQ (AMQP) | 5672 | — |
| RabbitMQ (Management) | 15672 | — |

---

## Key Design Notes

- **Internal secret:** All service-to-service calls include an `x-internal-secret` header. This header is never forwarded from the API Gateway to clients — it is only added by services when calling each other directly.
- **JWT flow:** The API Gateway verifies the JWT and injects `x-user-id`, `x-user-role`, and `x-user-email` headers before proxying. Downstream services read these headers instead of verifying tokens themselves.
- **Stripe webhooks:** The `/api/payments/webhook` route receives the raw request body (bypasses `express.json()`) for Stripe signature verification.
- **Telemedicine sessions:** Sessions are time-gated ±1 hour around the scheduled appointment time. A JaaS JWT is generated server-side and returned to the client as a signed join URL.
- **Prescription PDFs:** Generated on-demand by `doctor-service` using PDFKit. Returned as a binary stream — only accessible by the prescribing doctor or the patient named in the prescription.
- **AI Smart Match:** Accepts a free-text symptom description, calls the Gemini API, and returns a recommended specialty, urgency level, and a list of available matching doctors.

---

## RabbitMQ Event Reference

Exchange: `hc.platform.events` (topic, durable)

| Routing Key | Publisher | Consumer(s) |
|---|---|---|
| `appointment.booked` | appointment-service | notification-service |
| `appointment.confirmed` | appointment-service | notification-service |
| `appointment.cancelled` | appointment-service | notification-service, payment-service |
| `appointment.completed` | appointment-service | notification-service |
| `payment.succeeded` | payment-service | appointment-service |
| `payment.refunded` | payment-service | notification-service |
| `session.ended` | telemedicine-service | appointment-service |

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
