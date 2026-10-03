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

---

## 4. Labour-Market Intelligence & Competency Alignment

> **Source Code & Reference Branch:** [`feature/labour-intelligence`](https://github.com/AnuragShivoham/P-S/tree/feature/labour-intelligence)  
> All endpoints are mounted at `/api/v1/labour` and implemented in [`backend/src/routes/labourIntelligence.js`](file:///c:/Project-Skill/P-S/backend/src/routes/labourIntelligence.js).

### `POST /api/v1/labour/signals/ingest`
- **Auth**: Authenticated (Admin, Faculty, Employer, Mentor)
- **Request Body**:
  ```json
  {
    "source_type": "job_description",
    "source_name": "Microsoft SWE Intern 2026",
    "source_url": "https://careers.microsoft.com/us/en/job/200041085",
    "organization": "Microsoft",
    "role_title": "Software Engineering Intern",
    "location": "Redmond, WA",
    "published_at": "2026-03-01T00:00:00Z",
    "raw_content": "Qualifications: Experience with Docker containers, microservices..."
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "signal": {
      "id": "sig_1710779400123",
      "source_name": "Microsoft SWE Intern 2026",
      "extracted_skills": ["docker", "oop", "dsa"],
      "created_requirements": 3,
      "status": "processed"
    }
  }
  ```

---

### `GET /api/v1/labour/signals`
- **Auth**: Authenticated
- **Query Params**: `source_type`, `organization`, `status`, `limit`, `offset`
- **Response**:
  ```json
  {
    "signals": [
      {
        "id": "sig_1710779400123",
        "source_name": "Microsoft SWE Intern 2026",
        "organization": "Microsoft",
        "role_title": "Software Engineering Intern",
        "source_type": "job_description",
        "status": "processed",
        "extracted_skills_count": 3,
        "created_at": "2026-03-01T10:00:00Z"
      }
    ],
    "total": 14
  }
  ```

---

### `GET /api/v1/labour/ontology/skills`
- **Auth**: Public / Authenticated
- **Response**: List of canonical skills, categories, and proficiency definitions.
  ```json
  {
    "skills": [
      {
        "id": "docker",
        "name": "Docker & Containerization",
        "category": "devops_infrastructure",
        "aliases": ["Dockerfiles", "Docker Containerization", "docker-compose"],
        "proficiency_definitions": {
          "beginner": "Can write basic Dockerfile and run containers",
          "intermediate": "Multi-stage builds, non-root users, healthchecks",
          "advanced": "Optimized layering, minimal distroless base, vulnerability scanning"
        }
      }
    ]
  }
  ```

---

### `POST /api/v1/labour/ontology/normalize`
- **Auth**: Authenticated
- **Request Body**: `{ "raw_text": "Production Docker Containerization & Health Probes" }`
- **Response**:
  ```json
  {
    "canonical_skill_id": "docker",
    "canonical_name": "Docker & Containerization",
    "matched_alias": "docker containerization",
    "confidence": 0.98
  }
  ```

---

### `GET /api/v1/labour/requirements`
- **Auth**: Authenticated
- **Query Params**: `role_id`, `skill_id`, `status`, `search`, `limit`, `offset`
- **Response**: Multi-signal requirement matrix with aggregation counters:
  ```json
  {
    "requirements": [
      {
        "id": "req_doc_swe_2026",
        "role_id": "software-engineering-intern",
        "skill_id": "docker",
        "skill_name": "Docker & Containerization",
        "requirement_type": "preferred",
        "proficiency": "intermediate",
        "job_signal_count": 42,
        "internship_signal_count": 18,
        "employer_signal_count": 9,
        "expert_signal_count": 4,
        "trend_score": 8.7,
        "status": "APPROVED"
      }
    ]
  }
  ```

---

### `POST /api/v1/labour/requirements/:id/review`
- **Auth**: Faculty / Expert / Admin
- **Request Body**:
  ```json
  {
    "decision": "APPROVE",
    "comments": "Essential industry skill for modern backend deployments.",
    "suggested_proficiency": "intermediate",
    "suggested_evidence_requirements": "Multi-stage Dockerfile, docker-compose.yml, container healthcheck endpoint passing in IDE terminal"
  }
  ```
- **Response**: `200 OK` with review record and updated requirement status.

---

### `GET /api/v1/labour/students/:id/evidence`
- **Auth**: Student (self) / Mentor / Faculty / Employer
- **Response**: Multi-tier evidence profile breakdown:
  ```json
  {
    "student_id": "usr_student_01",
    "competencies": [
      {
        "skill_id": "docker",
        "skill_name": "Docker & Containerization",
        "status": "VERIFIED",
        "proficiency_level": "intermediate",
        "claimed_source": "Resume: 'Familiar with Docker'",
        "observed_source": "GitHub repo: Dockerfile committed",
        "assessed_source": "Quiz Score: 85%",
        "verified_source": "SOCRATES Cloud IDE: Project proj_rest_api passed container healthcheck test suite",
        "confidence_score": 0.96
      }
    ]
  }
  ```

---

### `POST /api/v1/labour/students/:id/gap-analysis`
- **Auth**: Authenticated
- **Request Body**: `{ "target_role_id": "software-engineering-intern", "target_skill_id": "docker" }`
- **Response**:
  ```json
  {
    "recommendation": "UPGRADE_EXISTING_PROJECT",
    "base_project_id": "proj_rest_api_01",
    "base_project_title": "Express REST API Microservice",
    "target_skill": "docker",
    "gap_reason": "Student possesses a working backend project but lacks verified containerization evidence."
  }
  ```

---

### `POST /api/v1/labour/projects/:id/upgrade-plan`
- **Auth**: Authenticated
- **Request Body**: `{ "target_skill_id": "docker", "target_requirement_id": "req_doc_swe_2026" }`
- **Response**: Non-destructive upgrade preview containing new milestone and daily tasks.

---

### `POST /api/v1/labour/projects/:id/apply-upgrade`
- **Auth**: Authenticated
- **Request Body**: `{ "target_skill_id": "docker", "target_requirement_id": "req_doc_swe_2026" }`
- **Response**: Injects the milestone & tasks into the active project in SQLite without modifying existing source code files.

---

### `POST /api/v1/labour/evidence/record`
- **Auth**: System / Mentor / QA Critic
- **Request Body**:
  ```json
  {
    "learner_id": "usr_student_01",
    "skill_id": "docker",
    "project_id": "proj_rest_api_01",
    "milestone_id": "m_docker_upgrade",
    "evidence_type": "ide_validation",
    "evidence_location": "workspace/proj_rest_api_01/Dockerfile",
    "evidence_payload": {
      "tests_passed": 4,
      "coverage": 94,
      "health_probe_status": 200,
      "qa_critic_score": 9.5
    }
  }
  ```
- **Response**: Commits immutable evidence record and updates student competency status to `VERIFIED`.

---

### `GET /api/v1/labour/employer/candidates`
- **Auth**: Employer / Admin
- **Query Params**: `skill_id`, `role_id`, `status`
- **Response**: Returns candidates with verifiable evidence payloads, project links, and test records.

---

### `POST /api/v1/labour/employer/feedback`
- **Auth**: Employer
- **Request Body**:
  ```json
  {
    "candidate_id": "usr_student_01",
    "role_id": "software-engineering-intern",
    "hiring_status": "hired",
    "readiness_rating": 5,
    "competency_feedback": {
      "docker": "Demonstrated excellent multi-stage Docker build comprehension in live technical round."
    }
  }
  ```
- **Response**: `200 OK` (increments employer signal counts and closes the feedback loop).

