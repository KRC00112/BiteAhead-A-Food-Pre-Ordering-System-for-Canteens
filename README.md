# Canteen App

Canteen App is a mobile pre-ordering system for a college canteen. Students and faculty can
browse the menu, place orders, and pay before collecting their food. Canteen staff manage the
orders and stock, while administrators manage the menu, users, and reports.

The project has two parts:

- `frontend` is an Expo and React Native application.
- `backend` is a FastAPI service with PostgreSQL and SQLAlchemy.

## What has been implemented

### Customer

- Student and faculty registration
- Login and logout with role-based access
- Forgot-password and password-reset flow
- Profile viewing and email updates
- Menu browsing with categories, search, vegetarian/non-vegetarian labels, prices, cooking
  times, ingredients, availability, and food images
- Cart management
- Stock-aware ordering
- Order history and order details
- Order cancellation where allowed
- Order status updates as the canteen prepares the order
- Pickup codes for collecting orders
- Razorpay payments
- Cash payment at the counter
- Ratings and feedback for completed orders
- In-app notifications
- Alerts for items that are out of stock

### Staff tools

Canteen staff have their own screens for:

- Viewing incoming orders
- Moving orders through the preparation process
- Marking cash orders as paid
- Serving, cancelling, and refunding orders
- Viewing the current inventory
- Restocking or updating item quantities
- Viewing customer carts
- Reviewing customer feedback

Staff registration is supported, but a new staff account must be approved by an administrator
before it can be used.

### Admin tools

Administrators can:

- View students, faculty, and staff
- Approve or deactivate staff accounts
- Add, edit, and remove menu items
- Upload or remove food images
- View all orders and payments
- View active sessions, notifications, and stock alerts
- View sales reports for different time periods
- Monitor live canteen activity


## Technology

The frontend uses Expo SDK 58, React Native, React Navigation and
React Native Razorpay.

The backend uses Python, FastAPI, Uvicorn, PostgreSQL, SQLAlchemy, Pydantic, JWT, Argon2,
and `python-multipart` for image uploads. Password recovery can use Brevo or SMTP.

## Running the backend locally

You need Python 3.9 or newer and PostgreSQL. From the repository root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS or Linux
source .venv/bin/activate
```

Install the requirements and create the local environment file:

```bash
pip install -r requirements.txt
copy .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead of `copy`.

Set `DATABASE_URL` and a strong `JWT_SECRET` in `.env`, create a PostgreSQL database called
`canteen`, and then run:

```bash
python seed.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. FastAPI's interactive documentation is
available at `http://localhost:8000/docs`.

## Running with Docker

The backend includes a Docker Compose setup for PostgreSQL and the API:

```bash
cd backend
copy .env.example .env
docker compose up --build
```

The API will be available at `http://localhost:8000`.

## Running the mobile app

Install Node.js, then install the frontend dependencies:

```bash
cd frontend
npm install
npm start
```

Expo can run the app on a connected Android device, iOS device, emulator, or in a browser:

```bash
npx expo run
```

The frontend currently uses the deployed backend:

```text
https://canteen-backend-xzko.onrender.com
```

## Backend routes

The API is organised around these areas:

- `/auth` for registration, login, logout, and password recovery
- `/users` for profiles
- `/menu` and `/items` for food items and categories
- `/cart` for customer carts
- `/orders` for placing and viewing orders
- `/payments` for Razorpay order creation and verification
- `/staff` for staff operations
- `/admin` for administration and reports
- `/notifications` for in-app notifications and stock alerts
- `/feedback` for ratings and comments

Protected requests use the token returned by login:

```http
Authorization: Bearer <access_token>
```

## Deployment

The backend includes `backend/render.yaml` for deployment to Render. The service runs the seed script before starting Uvicorn and exposes:

- `/` for the health check
- `/docs` for the Swagger documentation
- `/openapi.json` for the OpenAPI specification


## Current limitations

The application has in-app notifications, but push notifications through FCM have not been
added yet.

UPI payments through Razorpay were subject to KYC-related requirements during implementation,
which limited the availability of the UPI payment flow for this project. Wallet payments and
cash payment at the counter remain supported.
