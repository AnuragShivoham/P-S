# API Contract Specification (R0)

All new endpoints follow the `/api/v1/...` REST convention with JWT Bearer authentication and role-based access control.

---

## 1. Problem Submission & Lifecycle

### `POST /api/v1/problems`
- **Auth**: Required (Citizen, Student, Mentor, Admin)
- **Request Body**:
  ```json
  {
    "title": "Overflowing drainage near primary school",
    "description": "Raw sewage overflowing into access road for 3 weeks...",
    "problem_type": "Sanitation",
    "category_id": "sanitation",
    "urgency": "high",
    "severity": "severe",
    "people_affected": "800+ students and residents",
    "geographic_scope": "local",
    "privacy_level": "locality",
    "expected_impact": "Prevents waterborne illness and restores safe school access",
    "structured_impact": {
      "social_benefit": "Safe pedestrian path to school",
      "environmental_impact": "Eliminates stagnant sewage pool",
      "accessibility_impact": "Disabled ramp unblocked"
    },
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "formatted_address": "School Road, Village X",
      "district": "New Delhi",
      "state": "Delhi",
      "country": "India"
    },
    "media": [
      {
        "media_type": "image",
        "file_name": "photo1.jpg",
        "mime_type": "image/jpeg",
        "data_base64": "..."
      }
    ]
  }
  ```
- **Response**: `201 Created` with created problem record.

---

### `GET /api/v1/problems`
- **Auth**: Optional / Authenticated
- **Query Params**: `category`, `problem_type`, `district`, `urgency`, `severity`, `status`, `search`, `limit`, `offset`
- **Response**:
  ```json
  {
    "problems": [
      {
        "id": "prob-123",
        "title": "...",
        "description": "...",
        "problem_type": "Sanitation",
        "category_name": "Sanitation",
        "status": "PUBLISHED",
        "urgency": "high",
        "severity": "severe",
        "people_affected": "800+",
        "location": { "district": "New Delhi", "state": "Delhi" },
        "ai_confidence": 0.92,
        "required_skills": ["IoT", "Node.js", "GIS"],
        "has_adopted_project": false,
        "created_at": "..."
      }
    ],
    "total": 45
  }
  ```

---

### `GET /api/v1/problems/:id`
- **Auth**: Authenticated
- **Response**: Full problem payload including:
  - Raw citizen submission
  - Media list with safe download URLs
  - Privacy-filtered location
  - Structured AI analysis (if completed)
  - Duplicate candidates (if reviewer/admin)
  - Linked project status

---

### `POST /api/v1/problems/:id/analyze`
- **Auth**: Admin / System / Triggered on submit
- **Response**: Returns structured output from `problemIntelligence.js`.

---

### `POST /api/v1/problems/:id/review`
- **Auth**: Admin / University
- **Request Body**: `{ "verdict": "approved" | "rejected" | "needs_clarification", "notes": "..." }`

---

### `POST /api/v1/problems/:id/publish`
- **Auth**: Admin / University
- **Response**: Sets status to `PUBLISHED`, making it visible on the public marketplace.

---

### `POST /api/v1/problems/:id/create-project`
- **Auth**: Mentor / University / Admin
- **Description**: Converts the approved societal problem into an active P-S project. Pre-populates goal, requirements, constraints, stakeholders, and required skills.
- **Response**: Returns newly created P-S project with `project.problem_id` populated.

---

## 2. Project Architecture & Solution Planning

### `GET /api/v1/projects/:id/architecture`
- **Auth**: Project members / Mentor / Admin
- **Response**: Returns active architecture and historical versions (`v1`, `v2`...).

### `POST /api/v1/projects/:id/architecture/generate`
- **Auth**: Mentor / University / Admin
- **Response**: Generates new architecture version from problem intelligence and project context.

### `POST /api/v1/projects/:id/architecture/approve`
- **Auth**: Mentor / University / Admin
- **Request Body**: `{ "version": 1 }`

---

## 3. Media Service Endpoints

### `GET /api/v1/media/:id`
- **Auth**: Stream media safely (handles byte ranges, MIME headers, caching).
