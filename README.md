# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment variables

Create a `.env.local` in the project root and add the following:

```
# Google AI / Genkit (required for Genkit flows)
GOOGLE_API_KEY=your_google_api_key_here

# SerpAPI (required for search tooling)
SERPAPI_API_KEY=your_serpapi_key_here
SERPAPI_DEFAULT_GL=us
SERPAPI_DEFAULT_HL=en

# Optional: External ADK microservice endpoint (if you deploy an ADK planner)
ADK_URL=http://localhost:7070

# Optional: FlightRadar microservice for flight suggestions (Flask service)
FLIGHTRADAR_URL=http://127.0.0.1:7070
```

Notes:
- Keep keys server-side only. Do not expose them to client components.
- If `ADK_URL` is set, the app will call the ADK planner first and fall back to the built-in Genkit orchestration if unavailable.
- If `FLIGHTRADAR_URL` is set, the app will prefer FlightRadar-backed flight options.

## Mock Checkout, Payment, and Email

You can now perform a mock checkout for Flights, Hotels, and Car rentals:

- After generating an itinerary (Form or Conversational mode), scroll to the "Checkout (Mock Payment)" card.
- Enter your email, add/edit items for Flights/Hotels/Car, and click "Pay & Email Confirmation".
- Payment is simulated with a mock transaction ID; fees and taxes are calculated locally.
- Email delivery:
	- If SMTP is configured, an actual email is sent.
	- Otherwise, a `.eml` file is written to the `outbox/` folder for inspection.

### SMTP configuration (optional)

Set these environment variables (e.g., in `.env.local`) to enable real email:

```
SMTP_HOST=your.smtp.host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
MAIL_FROM="TripEase <no-reply@tripease.example>"
```

Without SMTP, emails are saved under `outbox/` as `.eml` files in development.