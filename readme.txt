================================================================================
DEPLOYMENT GUIDE
================================================================================

PREREQUISITES
-------------
  - Docker & Docker Compose installed
  - kubectl installed and configured (for Kubernetes deployment)
  - A running Kubernetes cluster (e.g., Minikube, Docker Desktop K8s)

================================================================================
  OPTION 1: DOCKER COMPOSE (Local Development)
================================================================================

STEP 1 - Create .env files for each service
  Create a .env file in each service directory using the templates below.
  Fill in the values before running. Keys marked with (*) are sensitive -
  use strong secrets in production.

  ── services/auth-service/.env ──────────────────────────────────────────────
    PORT=
    MONGO_URI=
    JWT_SECRET=                   (*)
    JWT_EXPIRES_IN=
    JWT_REFRESH_EXPIRES_IN=
    INTERNAL_SECRET=              (*)
    PATIENT_SERVICE_URL=
    DOCTOR_SERVICE_URL=
    ADMIN_DEFAULT_EMAIL=
    ADMIN_DEFAULT_PASSWORD=       (*)

  ── services/patient-service/.env ───────────────────────────────────────────
    PORT=
    MONGO_URI=
    INTERNAL_SECRET=              (*)
    SUPABASE_URL=
    SUPABASE_SERVICE_ROLE_KEY=    (*)

  ── services/doctor-service/.env ────────────────────────────────────────────
    PORT=
    MONGO_URI=
    INTERNAL_SECRET=              (*)
    PATIENT_SERVICE_URL=
    APPOINTMENT_SERVICE_URL=

  ── services/appointment-service/.env ───────────────────────────────────────
    PORT=
    MONGO_URI=
    RABBITMQ_URL=
    INTERNAL_SECRET=              (*)
    DOCTOR_SERVICE_URL=
    PATIENT_SERVICE_URL=
    TIMEZONE=
    SLOT_DURATION_MINUTES=

  ── services/notification-service/.env ──────────────────────────────────────
    PORT=
    MONGO_URI=
    RABBITMQ_URL=
    INTERNAL_SECRET=              (*)
    EMAIL_HOST=
    EMAIL_PORT=
    EMAIL_USER=
    EMAIL_PASS=                   (*)
    EMAIL_FROM=
    TWILIO_ACCOUNT_SID=           (*)
    TWILIO_AUTH_TOKEN=            (*)
    TWILIO_FROM_NUMBER=           (*) e.g. +1234567890 (your Twilio sender number)

  ── services/telemedicine-service/.env ──────────────────────────────────────
    PORT=
    MONGO_URI=
    RABBITMQ_URL=
    INTERNAL_SECRET=              (*)
    APPOINTMENT_SERVICE_URL=
    JAAS_APP_ID=
    JAAS_API_KEY_ID=
    JAAS_PRIVATE_KEY=             (*)

  ── services/payment-service/.env ───────────────────────────────────────────
    PORT=
    MONGO_URI=
    RABBITMQ_URL=
    INTERNAL_SECRET=              (*)
    APPOINTMENT_SERVICE_URL=
    STRIPE_SECRET_KEY=            (*)
    STRIPE_WEBHOOK_SECRET=        (*)

  ── services/ai-service/.env ────────────────────────────────────────────────
    PORT=
    INTERNAL_SECRET=              (*)
    GEMINI_API_KEY=               (*)
    GEMINI_MODEL=
    GEMINI_BASE_URL=
    DOCTOR_SERVICE_URL=

  ── services/api-gateway/.env ───────────────────────────────────────────────
    PORT=
    JWT_SECRET=                   (*)
    AUTH_SERVICE_URL=
    PATIENT_SERVICE_URL=
    DOCTOR_SERVICE_URL=
    APPOINTMENT_SERVICE_URL=
    NOTIFICATION_SERVICE_URL=
    TELEMEDICINE_SERVICE_URL=
    PAYMENT_SERVICE_URL=
    AI_SERVICE_URL=

STEP 2 - Start the stack

  Choose one of two modes:

  [A] DEVELOPMENT MODE (recommended during active development)
      Uses nodemon (hot-reload) for all backend services and Vite HMR for
      the client. File changes reflect immediately without restarting.

      docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

      Client UI  : http://localhost:5173   (Vite dev server)
      API Gateway: http://localhost:5000/api

  [B] STANDARD MODE (production build, same image as K8s)
      Runs compiled/static builds. Use this to verify production behaviour
      locally before pushing to Kubernetes.

      docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

      Client UI  : http://localhost:3000   (nginx)
      API Gateway: http://localhost:5000/api

  Both modes start:
    - MongoDB          (port 27017)
    - RabbitMQ         (port 5672, management UI at port 15672)
    - All 8 backend microservices
    - API Gateway      (port 5000)

STEP 3 - Verify services are running
  docker-compose ps

STEP 4 - Access RabbitMQ management UI
  http://localhost:15672  (user: hcadmin / pass: hcpassword)

STEP 5 - Stop the application
  docker-compose down

  To also remove persistent volumes:
  docker-compose down -v

  NOTE: docker-compose down works regardless of which overlay was used to start.

================================================================================
  OPTION 2: KUBERNETES
================================================================================

STEP 1 - Build Docker images locally
  Run the following from the project root:

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

  NOTE: If using Minikube, load images into it first:
    eval $(minikube docker-env)
  Then re-run all build commands above inside that shell.

STEP 2 - Apply the Namespace and Secrets
  kubectl apply -f k8s/secrets.yml

  This creates the "healthcare" namespace and all required Kubernetes Secrets.

  IMPORTANT: Before deploying to production, replace all sensitive values in
  k8s/secrets.yml (JWT_SECRET, INTERNAL_SECRET, API keys, passwords, etc.)
  with secure credentials.

STEP 3 - Apply the ConfigMap
  kubectl apply -f k8s/configmap.yml

  This sets service URLs and shared non-sensitive configuration.

STEP 4 - Deploy infrastructure (MongoDB + RabbitMQ)
  kubectl apply -f k8s/infra.yml

  Wait for pods to be ready before proceeding:
  kubectl get pods -n healthcare -w

STEP 5 - Deploy application services
  kubectl apply -f k8s/services.yml

STEP 6 - Deploy the API Gateway
  kubectl apply -f k8s/gateway.yml

  The API Gateway is exposed as a NodePort service on port 30500.

STEP 7 - Verify all pods are running
  kubectl get pods -n healthcare
  kubectl get services -n healthcare

STEP 8 - Access the application
  API Gateway: http://<node-ip>:30500/api

  Get node IP with:
    kubectl get nodes -o wide
  Or for Minikube:
    minikube service api-gateway -n healthcare --url

STEP 9 - Tear down
  kubectl delete namespace healthcare

================================================================================
  SERVICE PORT REFERENCE
================================================================================

  Service                Port
  -----------------------+------
  API Gateway            5000  (NodePort: 30500 in K8s)
  Doctor Service         5001
  Patient Service        5002
  Appointment Service    5003
  Notification Service   5004
  Telemedicine Service   5005
  Payment Service        5006
  Auth Service           5007
  AI Service             5008
  MongoDB                27017
  RabbitMQ (AMQP)        5672
  RabbitMQ (Management)  15672
  Client (Docker)        3000

================================================================================
