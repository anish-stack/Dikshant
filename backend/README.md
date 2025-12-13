# Dikshant IAS - Monolithic Backend (Node.js + MySQL + Redis)

This is a runnable monolithic backend scaffold that implements the requested features:
Auth, Courses, PDF Notes, Tests (MCQ + Subjective), Notifications, Payments (basic), Scholarships.

## Quick start

1. Copy `.env.example` to `.env` and fill values.
2. Build and run with Docker:
   ```
   docker-compose up --build
   ```
   Or run locally:
   ```
   npm install
   npm start
   ```

3. APIs are available on port defined in `.env` (default 5000).

## Postman collection
See `postman_collection.json` for sample requests.

## Notes
- Uses Sequelize `sync({ alter: true })` to create/update tables automatically.
- OTPs are returned in the response for development (remove in production).
- S3/Payments/Razorpay parts are simplified placeholders — integrate real providers for production.
