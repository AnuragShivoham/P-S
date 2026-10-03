/**
 * labour_schema.js
 * 
 * Labour-Market Intelligence & Evidence-Driven Competency Alignment Database Schema
 * Integrated into SOCRATES SQLite persistence layer.
 */

function initLabourSchema(db) {
  db.exec(`
    -- 1. Industry Signal Layer
    CREATE TABLE IF NOT EXISTS industry_signals (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL, -- 'job_description', 'internship', 'employer_form', 'expert_input', 'hiring_drive', 'placement_outcome', 'college_feedback', 'mentor_feedback', 'student_feedback'
      source_name TEXT NOT NULL,
      source_url TEXT,
      organization TEXT,
      role_title TEXT,
      location TEXT,
      published_at TEXT,
      collected_at TEXT DEFAULT (datetime('now')),
      raw_content TEXT NOT NULL,
      parsed_content TEXT, -- JSON summary with sections, detected skills, confidence
      status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'reviewed', 'archived'
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 2. Canonical Roles Ontology
    CREATE TABLE IF NOT EXISTS roles_ontology (
      id TEXT PRIMARY KEY, -- e.g. 'software-engineering-intern', 'software-engineer', 'backend-engineer'
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Engineering',
      description TEXT,
      parent_role_id TEXT REFERENCES roles_ontology(id),
      version INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 3. Canonical Skills Ontology
    CREATE TABLE IF NOT EXISTS skills_ontology (
      id TEXT PRIMARY KEY, -- e.g. 'docker', 'oop', 'dsa', 'programming', 'observability', 'testing', 'monitoring', 'performance', 'rest-api'
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Core Engineering',
      description TEXT,
      proficiency_definitions TEXT, -- JSON: { beginner: "...", intermediate: "...", advanced: "..." }
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 4. Skill Aliases (Resolves variations to canonical skill_id)
    CREATE TABLE IF NOT EXISTS skill_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_id TEXT NOT NULL REFERENCES skills_ontology(id) ON DELETE CASCADE,
      alias TEXT UNIQUE NOT NULL
    );

    -- 5. Skill Relationships & Hierarchies
    CREATE TABLE IF NOT EXISTS skill_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_skill_id TEXT NOT NULL REFERENCES skills_ontology(id) ON DELETE CASCADE,
      child_skill_id TEXT NOT NULL REFERENCES skills_ontology(id) ON DELETE CASCADE,
      relationship_type TEXT DEFAULT 'contains' -- 'contains', 'prerequisite', 'related'
    );

    -- 6. Requirement Matrix
    CREATE TABLE IF NOT EXISTS labour_requirements (
      id TEXT PRIMARY KEY,
      signal_id TEXT REFERENCES industry_signals(id) ON DELETE SET NULL,
      role_id TEXT NOT NULL REFERENCES roles_ontology(id),
      skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
      requirement_type TEXT DEFAULT 'required', -- 'required', 'preferred', 'nice_to_have'
      proficiency TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced'
      experience_years REAL DEFAULT 0,
      source_reference TEXT,
      evidence_quote TEXT,
      extraction_method TEXT DEFAULT 'deterministic', -- 'deterministic', 'nlp', 'llm', 'manual'
      confidence REAL DEFAULT 1.0,
      status TEXT DEFAULT 'OBSERVED', -- 'OBSERVED', 'EMERGING', 'REVIEW_REQUIRED', 'EXPERT_VALIDATED', 'APPROVED', 'DECLINING', 'REJECTED'
      job_signal_count INTEGER DEFAULT 1,
      internship_signal_count INTEGER DEFAULT 0,
      employer_signal_count INTEGER DEFAULT 0,
      expert_signal_count INTEGER DEFAULT 0,
      trend_score REAL DEFAULT 0.0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 7. Human Validation & Review Log
    CREATE TABLE IF NOT EXISTS requirement_reviews (
      id TEXT PRIMARY KEY,
      requirement_id TEXT NOT NULL REFERENCES labour_requirements(id) ON DELETE CASCADE,
      reviewer_id TEXT NOT NULL REFERENCES users(id),
      reviewer_role TEXT NOT NULL, -- 'expert', 'employer', 'mentor', 'institution', 'admin'
      decision TEXT NOT NULL, -- 'APPROVE', 'MODIFY', 'REJECT', 'REQUEST_MORE_EVIDENCE'
      comments TEXT,
      suggested_proficiency TEXT,
      suggested_learning_outcomes TEXT, -- JSON array
      suggested_evidence_requirements TEXT, -- JSON array
      suggested_project_context TEXT,
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 8. AI / Human Course Authoring
    CREATE TABLE IF NOT EXISTS competency_courses (
      id TEXT PRIMARY KEY,
      requirement_id TEXT REFERENCES labour_requirements(id),
      skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
      role_id TEXT NOT NULL REFERENCES roles_ontology(id),
      title TEXT NOT NULL,
      description TEXT,
      proficiency TEXT DEFAULT 'intermediate',
      learning_outcomes TEXT DEFAULT '[]', -- JSON
      modules TEXT DEFAULT '[]', -- JSON
      prerequisites TEXT DEFAULT '[]', -- JSON
      status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'
      author_type TEXT DEFAULT 'AI', -- 'AI', 'HUMAN', 'HYBRID'
      reviewer_id TEXT REFERENCES users(id),
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 9. AI / Human Project Template Authoring
    CREATE TABLE IF NOT EXISTS competency_project_templates (
      id TEXT PRIMARY KEY,
      requirement_id TEXT REFERENCES labour_requirements(id),
      skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
      role_id TEXT NOT NULL REFERENCES roles_ontology(id),
      title TEXT NOT NULL,
      description TEXT,
      is_upgrade_template INTEGER DEFAULT 0, -- 1 if meant for existing repo upgrade
      target_base_project_type TEXT DEFAULT 'generic', -- 'rest-api', 'fullstack', 'cli', 'generic'
      milestones TEXT DEFAULT '[]', -- JSON
      rubric TEXT DEFAULT '{}', -- JSON assessment rubric
      evidence_criteria TEXT DEFAULT '[]', -- JSON
      status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'
      author_type TEXT DEFAULT 'AI',
      reviewer_id TEXT REFERENCES users(id),
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 10. Student Competency Profile (Multi-tier evidence states)
    CREATE TABLE IF NOT EXISTS student_competency_profiles (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id),
      skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
      status TEXT DEFAULT 'CLAIMED', -- 'CLAIMED', 'OBSERVED', 'ASSESSED', 'VERIFIED'
      claimed_source TEXT, -- 'CV / Resume'
      observed_source TEXT, -- 'GitHub Project Scan'
      assessed_source TEXT, -- 'Assessment Quiz Passed'
      verified_source TEXT, -- 'I.D.E. Build, Test & QA Validation + Mentor Review'
      proficiency_level TEXT DEFAULT 'beginner',
      confidence_score REAL DEFAULT 0.5,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, skill_id)
    );

    -- 11. Persistent Competency Evidence Store
    CREATE TABLE IF NOT EXISTS competency_evidence_store (
      id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL REFERENCES users(id),
      skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
      role_id TEXT REFERENCES roles_ontology(id),
      project_id TEXT REFERENCES projects(id),
      milestone_id TEXT REFERENCES milestones(id),
      task_id TEXT REFERENCES tasks(id),
      assessment_id TEXT,
      evidence_type TEXT NOT NULL, -- 'source_code', 'test_results', 'execution_result', 'project_artifact', 'technical_explanation', 'assessment', 'mentor_review', 'ide_validation'
      evidence_location TEXT, -- URI, file path, commit hash
      evidence_payload TEXT, -- JSON summary with test score, logs, artifact paths, verification signature
      reviewer_id TEXT REFERENCES users(id),
      rubric_version INTEGER DEFAULT 1,
      competency_version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'VERIFIED', -- 'CLAIMED', 'OBSERVED', 'ASSESSED', 'VERIFIED'
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 12. Existing Project Upgrades
    CREATE TABLE IF NOT EXISTS project_upgrades (
      id TEXT PRIMARY KEY,
      base_project_id TEXT NOT NULL REFERENCES projects(id),
      student_id TEXT NOT NULL REFERENCES users(id),
      target_skill_id TEXT NOT NULL REFERENCES skills_ontology(id),
      target_requirement_id TEXT REFERENCES labour_requirements(id),
      upgrade_title TEXT NOT NULL,
      upgrade_milestone_id TEXT REFERENCES milestones(id),
      status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'verified'
      generated_by TEXT DEFAULT 'AI_GAP_ENGINE',
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- 13. Employer Feedback & Outcome Store
    CREATE TABLE IF NOT EXISTS employer_feedback_records (
      id TEXT PRIMARY KEY,
      employer_id TEXT NOT NULL REFERENCES users(id),
      candidate_id TEXT NOT NULL REFERENCES users(id),
      role_id TEXT REFERENCES roles_ontology(id),
      hiring_status TEXT NOT NULL, -- 'hired', 'interviewed', 'rejected', 'placed', 'internship_completed'
      competency_feedback TEXT DEFAULT '{}', -- JSON: { skill_id: { rating: 5, notes: "..." } }
      gap_notes TEXT,
      readiness_rating INTEGER DEFAULT 4,
      communication_rating INTEGER DEFAULT 4,
      signals_generated INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 14. Institution Curriculum Reviews
    CREATE TABLE IF NOT EXISTS institution_curriculum_reviews (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL REFERENCES users(id),
      course_code TEXT,
      course_name TEXT NOT NULL,
      matched_role_id TEXT REFERENCES roles_ontology(id),
      missing_competencies TEXT DEFAULT '[]', -- JSON array of skill_ids
      student_coverage_pct REAL DEFAULT 0.0,
      recommendation_type TEXT DEFAULT 'Curriculum Review Candidate', -- 'Curriculum Review Candidate', 'Trainer Requirement', 'Lab/Equipment Update', 'New Practical Project'
      status TEXT DEFAULT 'pending_review',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed baseline ontology if empty
  seedOntology(db);
}

function seedOntology(db) {
  const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles_ontology').get().count;
  if (roleCount === 0) {
    console.log('[DB] Seeding canonical Roles & Skills Ontology...');
    
    // Seed Roles
    const roles = [
      { id: 'software-engineering-intern', title: 'Software Engineering Intern', category: 'Engineering', description: 'Entry-level engineering internship focusing on fundamentals, OOP, DSA, reliability and learning new methods.' },
      { id: 'software-engineer', title: 'Software Engineer', category: 'Engineering', description: 'Full lifecycle software development, architecture, testing and system scaling.' },
      { id: 'backend-engineer', title: 'Backend Engineer', category: 'Backend', description: 'Server-side systems, API development, databases, distributed architecture and containerization.' },
      { id: 'frontend-engineer', title: 'Frontend Engineer', category: 'Frontend', description: 'Modern UI/UX development, state management, client performance and responsive design.' },
      { id: 'devops-engineer', title: 'DevOps & Site Reliability Engineer', category: 'Infrastructure', description: 'CI/CD, container orchestration, cloud deployment, monitoring and observability.' },
      { id: 'data-engineer', title: 'Data Engineer', category: 'Data', description: 'Data pipelines, ETL, stream processing and large-scale data warehousing.' }
    ];

    const insertRole = db.prepare('INSERT OR IGNORE INTO roles_ontology (id, title, category, description) VALUES (?, ?, ?, ?)');
    roles.forEach(r => insertRole.run(r.id, r.title, r.category, r.description));

    // Seed Canonical Skills
    const skills = [
      { id: 'programming', name: 'Programming Fundamentals', category: 'Core Engineering', desc: 'Core programming constructs, control flow, functions, modularity and clean coding standards.' },
      { id: 'oop', name: 'Object-Oriented Programming (OOP)', category: 'Core Engineering', desc: 'Classes, encapsulation, inheritance, polymorphism, design patterns and abstraction.' },
      { id: 'dsa', name: 'Data Structures and Algorithms', category: 'Computer Science', desc: 'Arrays, trees, graphs, sorting, searching, time/space complexity analysis and problem solving.' },
      { id: 'docker', name: 'Docker Containerization', category: 'DevOps', desc: 'Containerizing applications, Dockerfile authoring, multi-stage builds, container networking and local orchestration.' },
      { id: 'rest-api', name: 'RESTful API Architecture', category: 'Backend', desc: 'Designing and building scalable HTTP REST APIs with routing, middleware, authentication and error handling.' },
      { id: 'testing', name: 'Automated Testing & QA', category: 'Quality', desc: 'Unit testing, integration testing, test automation, mocking and code coverage analysis.' },
      { id: 'observability', name: 'Observability & Telemetry', category: 'Production Engineering', desc: 'Application metrics, structured logging, distributed tracing and health probe endpoints.' },
      { id: 'monitoring', name: 'Production Monitoring', category: 'Production Engineering', desc: 'System telemetry dashboards, alerting rules, uptime checks and performance diagnostics at scale.' },
      { id: 'performance', name: 'Performance Optimization & Scaling', category: 'Production Engineering', desc: 'Profiling bottlenecks, memory optimization, caching strategies and high-throughput tuning.' },
      { id: 'software-engineering', name: 'Software Engineering Best Practices', category: 'Core Engineering', desc: 'Version control (Git), code reviews, documentation, CI/CD and agile engineering workflows.' },
      { id: 'database-design', name: 'Database Design & SQL', category: 'Data', desc: 'Relational database schema modeling, indexing, ACID transactions and query performance.' },
      { id: 'kubernetes', name: 'Kubernetes Orchestration', category: 'DevOps', desc: 'Deployments, services, ingress, configmaps and container cluster scaling.' }
    ];

    const insertSkill = db.prepare('INSERT OR IGNORE INTO skills_ontology (id, name, category, description, proficiency_definitions) VALUES (?, ?, ?, ?, ?)');
    skills.forEach(s => {
      const prof = JSON.stringify({
        beginner: `Understands foundational concepts of ${s.name} and can write simple working implementations.`,
        intermediate: `Applies ${s.name} autonomously in production-like projects with testing and configuration.`,
        advanced: `Architects, optimizes and diagnoses complex distributed scenarios using ${s.name}.`
      });
      insertSkill.run(s.id, s.name, s.category, s.desc, prof);
    });

    // Seed Aliases
    const aliases = [
      { skill_id: 'docker', alias: 'Docker' },
      { skill_id: 'docker', alias: 'Docker Containerization' },
      { skill_id: 'docker', alias: 'Docker containers' },
      { skill_id: 'docker', alias: 'Containerization using Docker' },
      { skill_id: 'docker', alias: 'Containerization' },
      { skill_id: 'docker', alias: 'Dockerfiles' },
      { skill_id: 'oop', alias: 'OOP' },
      { skill_id: 'oop', alias: 'Object-Oriented Programming' },
      { skill_id: 'oop', alias: 'Object-Oriented' },
      { skill_id: 'oop', alias: 'Object Oriented Language' },
      { skill_id: 'oop', alias: 'Object-Oriented Language' },
      { skill_id: 'oop', alias: 'Object oriented programming' },
      { skill_id: 'dsa', alias: 'DSA' },
      { skill_id: 'dsa', alias: 'Data Structures and Algorithms' },
      { skill_id: 'dsa', alias: 'Data Structures' },
      { skill_id: 'dsa', alias: 'Algorithms' },
      { skill_id: 'dsa', alias: 'CS Fundamentals' },
      { skill_id: 'dsa', alias: 'Computer science fundamentals' },
      { skill_id: 'programming', alias: 'Programming' },
      { skill_id: 'programming', alias: 'Coding' },
      { skill_id: 'programming', alias: 'Software Programming' },
      { skill_id: 'rest-api', alias: 'REST API' },
      { skill_id: 'rest-api', alias: 'RESTful API' },
      { skill_id: 'rest-api', alias: 'REST APIs' },
      { skill_id: 'rest-api', alias: 'Web APIs' },
      { skill_id: 'testing', alias: 'Testing' },
      { skill_id: 'testing', alias: 'Automated Testing' },
      { skill_id: 'testing', alias: 'Unit Testing' },
      { skill_id: 'testing', alias: 'QA' },
      { skill_id: 'observability', alias: 'Observability' },
      { skill_id: 'observability', alias: 'Telemetry' },
      { skill_id: 'observability', alias: 'Tracing' },
      { skill_id: 'monitoring', alias: 'Monitoring' },
      { skill_id: 'monitoring', alias: 'Monitoring at scale' },
      { skill_id: 'monitoring', alias: 'System Monitoring' },
      { skill_id: 'performance', alias: 'Performance' },
      { skill_id: 'performance', alias: 'Efficiency' },
      { skill_id: 'performance', alias: 'Reliability' },
      { skill_id: 'performance', alias: 'Availability' },
      { skill_id: 'software-engineering', alias: 'Software Engineering' },
      { skill_id: 'software-engineering', alias: 'Software Projects' },
      { skill_id: 'software-engineering', alias: 'Best Practices' },
      { skill_id: 'database-design', alias: 'SQL' },
      { skill_id: 'database-design', alias: 'Database Design' },
      { skill_id: 'database-design', alias: 'Relational Databases' }
    ];

    const insertAlias = db.prepare('INSERT OR IGNORE INTO skill_aliases (skill_id, alias) VALUES (?, ?)');
    aliases.forEach(a => insertAlias.run(a.skill_id, a.alias));

    // Seed Skill Relationships
    const rels = [
      { parent_id: 'software-engineering', child_id: 'programming', type: 'contains' },
      { parent_id: 'software-engineering', child_id: 'oop', type: 'contains' },
      { parent_id: 'software-engineering', child_id: 'dsa', type: 'contains' },
      { parent_id: 'software-engineering', child_id: 'testing', type: 'contains' },
      { parent_id: 'software-engineering', child_id: 'rest-api', type: 'contains' },
      { parent_id: 'software-engineering', child_id: 'observability', type: 'contains' },
      { parent_id: 'observability', child_id: 'monitoring', type: 'contains' },
      { parent_id: 'observability', child_id: 'performance', type: 'contains' }
    ];

    const insertRel = db.prepare('INSERT OR IGNORE INTO skill_relationships (parent_skill_id, child_skill_id, relationship_type) VALUES (?, ?, ?)');
    rels.forEach(r => insertRel.run(r.parent_id, r.child_id, r.type));

    console.log('[DB] Canonical Ontology successfully initialized.');
  }

  if (process.env.ENABLE_DEMO_SEED_DATA === 'true') {
  // Seed Demo Industry Signal: Microsoft SWE Intern JD 200041085 (if not exists)
  const demoSignal = db.prepare('SELECT id FROM industry_signals WHERE id = ?').get('sig_msft_200041085');
  if (!demoSignal) {
    console.log('[DB] Seeding Microsoft SWE Intern JD (Job: 200041085) Demo Signal...');
    const rawContent = `Job number: 200041085
Role: Software Engineering Intern
Organization: Microsoft Corporation
Posted: September 18, 2026
Location: Redmond, WA / Remote Eligible

Qualifications & Requirements:
- Currently pursuing Bachelor's or Master's degree in Computer Science, Engineering, or related technical field with at least one academic term remaining after internship.
- One year of programming experience in an object-oriented language (e.g., C++, Java, C#, Python).
- Strong foundation in computer science fundamentals, data structures, and algorithms.

Responsibilities & Core Engineering Expectations:
- Collaborate with engineering teams to solve complex problems and understand user requirements.
- Design, build, and test software projects using modern software engineering best practices.
- Learn new engineering methods, frameworks, and continuous delivery tools.
- Ensure system availability, reliability, efficiency, performance, and observability.
- Build and operate monitoring at scale to guarantee application health and diagnostic visibility.
- Actively participate in peer feedback, code reviews, and architectural discussions.`;

    const parsedJson = JSON.stringify({
      job_number: '200041085',
      role: 'Software Engineering Intern',
      organization: 'Microsoft Corporation',
      posted_date: '2026-09-18',
      extracted_skills: [
        { skill_id: 'oop', raw_text: 'One year of programming experience in an object-oriented language', type: 'required', exp_years: 1, confidence: 0.98 },
        { skill_id: 'programming', raw_text: 'programming experience in an object-oriented language', type: 'required', exp_years: 1, confidence: 0.99 },
        { skill_id: 'dsa', raw_text: 'Strong foundation in computer science fundamentals, data structures, and algorithms', type: 'preferred', exp_years: 0, confidence: 0.96 },
        { skill_id: 'software-engineering', raw_text: 'modern software engineering best practices', type: 'required', exp_years: 0, confidence: 0.95 },
        { skill_id: 'testing', raw_text: 'Design, build, and test software projects', type: 'required', exp_years: 0, confidence: 0.94 },
        { skill_id: 'observability', raw_text: 'Ensure system availability, reliability, efficiency, performance, and observability', type: 'required', exp_years: 0, confidence: 0.95 },
        { skill_id: 'monitoring', raw_text: 'Build and operate monitoring at scale to guarantee application health', type: 'required', exp_years: 0, confidence: 0.93 },
        { skill_id: 'performance', raw_text: 'Ensure system availability, reliability, efficiency, performance', type: 'required', exp_years: 0, confidence: 0.92 }
      ]
    });

    db.prepare(`
      INSERT INTO industry_signals (id, source_type, source_name, organization, role_title, location, published_at, raw_content, parsed_content, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'sig_msft_200041085',
      'job_description',
      'Microsoft SWE Internship Posting #200041085 (DEMO / SAMPLE SIGNAL)',
      'Microsoft Corporation',
      'Software Engineering Intern',
      'Redmond, WA / Remote Eligible',
      '2026-09-18',
      rawContent,
      parsedJson,
      'reviewed'
    );

    // Seed associated requirements in Requirement Matrix
    const reqs = [
      { id: 'req_msft_oop', skill: 'oop', type: 'required', exp: 1, quote: 'One year of programming experience in an object-oriented language.', conf: 0.98, status: 'APPROVED', job: 48, intern: 32, emp: 12, exp_sig: 8 },
      { id: 'req_msft_dsa', skill: 'dsa', type: 'preferred', exp: 0, quote: 'Strong foundation in computer science fundamentals, data structures, and algorithms.', conf: 0.96, status: 'APPROVED', job: 55, intern: 42, emp: 15, exp_sig: 10 },
      { id: 'req_msft_prog', skill: 'programming', type: 'required', exp: 1, quote: 'One year of programming experience in an object-oriented language.', conf: 0.99, status: 'APPROVED', job: 60, intern: 45, emp: 20, exp_sig: 12 },
      { id: 'req_msft_docker', skill: 'docker', type: 'required', exp: 0, quote: 'Learn new engineering methods, frameworks, and continuous delivery tools (Containerization).', conf: 0.92, status: 'APPROVED', job: 43, intern: 17, emp: 8, exp_sig: 5 },
      { id: 'req_msft_test', skill: 'testing', type: 'required', exp: 0, quote: 'Design, build, and test software projects using modern software engineering best practices.', conf: 0.94, status: 'APPROVED', job: 38, intern: 22, emp: 9, exp_sig: 6 },
      { id: 'req_msft_obs', skill: 'observability', type: 'required', exp: 0, quote: 'Ensure system availability, reliability, efficiency, performance, and observability.', conf: 0.95, status: 'APPROVED', job: 29, intern: 14, emp: 6, exp_sig: 5 },
      { id: 'req_msft_mon', skill: 'monitoring', type: 'required', exp: 0, quote: 'Build and operate monitoring at scale to guarantee application health and diagnostic visibility.', conf: 0.93, status: 'APPROVED', job: 25, intern: 11, emp: 5, exp_sig: 4 },
      { id: 'req_msft_perf', skill: 'performance', type: 'required', exp: 0, quote: 'Ensure system availability, reliability, efficiency, performance.', conf: 0.92, status: 'APPROVED', job: 31, intern: 16, emp: 7, exp_sig: 5 }
    ];

    const insertReq = db.prepare(`
      INSERT OR IGNORE INTO labour_requirements (
        id, signal_id, role_id, skill_id, requirement_type, proficiency, experience_years, 
        source_reference, evidence_quote, extraction_method, confidence, status,
        job_signal_count, internship_signal_count, employer_signal_count, expert_signal_count, trend_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    reqs.forEach(rq => {
      insertReq.run(
        rq.id,
        'sig_msft_200041085',
        'software-engineering-intern',
        rq.skill,
        rq.type,
        'intermediate',
        rq.exp,
        'Microsoft Job #200041085',
        rq.quote,
        'deterministic+llm',
        rq.conf,
        rq.status,
        rq.job,
        rq.intern,
        rq.emp,
        rq.exp_sig,
        0.85
      );
    });

    console.log('[DB] Demo Microsoft SWE Intern requirements matrix created.');
  }

  // Seed Demo Student Project & Competency States (Alex Johnson - demo_student)
  const demoProj = db.prepare('SELECT id FROM projects WHERE id = ?').get('proj_demo_rest_api');
  if (!demoProj) {
    console.log('[DB] Seeding Alex Johnson (demo_student) base REST API Project...');
    db.prepare(`
      INSERT OR IGNORE INTO projects (id, user_id, raw_goal, title, tech_stack, scope, deadline_days, skill_level, deliverables, status, progress_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'proj_demo_rest_api',
      'demo_student',
      'Build a production REST API microservice with Node.js, Express and SQLite',
      'REST API Microservice',
      JSON.stringify(['Node.js', 'Express', 'SQLite', 'Jest']),
      'REST API with CRUD, authentication, and database persistence',
      7,
      'intermediate',
      JSON.stringify(['Express HTTP server', 'SQLite database schema', 'JWT authentication middleware', 'Unit & integration test suite']),
      'active',
      85.0
    );

    // Milestones
    db.prepare(`
      INSERT OR IGNORE INTO milestones (id, project_id, ord, title, description, duration_days, measurable_output, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ms_demo_1', 'proj_demo_rest_api', 1, 'Express Server & SQLite Persistence', 'Initialize Express server and SQLite connection', 2, 'Working HTTP endpoints', 'completed');

    db.prepare(`
      INSERT OR IGNORE INTO milestones (id, project_id, ord, title, description, duration_days, measurable_output, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ms_demo_2', 'proj_demo_rest_api', 2, 'CRUD Endpoints & JWT Auth', 'Implement authenticated endpoints and input validation', 2, 'Passing test suite', 'completed');

    // Seed baseline Competency States for Alex Johnson
    const insertProfile = db.prepare(`
      INSERT OR IGNORE INTO student_competency_profiles (
        id, student_id, skill_id, status, claimed_source, observed_source, assessed_source, verified_source, proficiency_level, confidence_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProfile.run('prof_demo_prog', 'demo_student', 'programming', 'VERIFIED', 'CV / Resume', 'GitHub repo: socrates-rest-api', 'Assessment score: 92%', 'I.D.E. Build, Test & QA Validation', 'intermediate', 0.98);
    insertProfile.run('prof_demo_rest', 'demo_student', 'rest-api', 'VERIFIED', 'CV / Resume', 'GitHub repo: socrates-rest-api', 'Assessment score: 88%', 'REST API Microservice Project', 'intermediate', 0.95);
    insertProfile.run('prof_demo_db', 'demo_student', 'database-design', 'VERIFIED', 'CV / Resume', 'SQLite schema files', 'Assessment score: 90%', 'SQLite Database Migration & Models', 'intermediate', 0.94);
    insertProfile.run('prof_demo_oop', 'demo_student', 'oop', 'OBSERVED', 'CV / Resume', 'GitHub OOP design patterns', null, null, 'intermediate', 0.75);
    insertProfile.run('prof_demo_dsa', 'demo_student', 'dsa', 'ASSESSED', 'CV / Resume', 'LeetCode profile', 'CS Fundamentals Assessment: 85%', null, 'intermediate', 0.85);
    insertProfile.run('prof_demo_docker', 'demo_student', 'docker', 'CLAIMED', 'Not yet claimed on CV', 'No container files found', 'Not assessed', null, 'beginner', 0.20);
    insertProfile.run('prof_demo_obs', 'demo_student', 'observability', 'CLAIMED', 'Claimed basic logging', 'console.log statements', 'Not assessed', null, 'beginner', 0.30);

    // Seed initial verified evidence records in store for programming & rest-api
    db.prepare(`
      INSERT OR IGNORE INTO competency_evidence_store (
        id, learner_id, skill_id, role_id, project_id, milestone_id, evidence_type, evidence_location,
        evidence_payload, reviewer_id, rubric_version, competency_version, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'VERIFIED')
    `).run(
      'ev_demo_prog_01',
      'demo_student',
      'programming',
      'software-engineering-intern',
      'proj_demo_rest_api',
      'ms_demo_1',
      'ide_validation',
      'workspace/proj_demo_rest_api/src/server.js',
      JSON.stringify({ test_suite: 'Jest', passed: 14, failed: 0, coverage_pct: 92, verified_by: 'SOCRATES QA Engine' }),
      'demo_mentor'
    );

    db.prepare(`
      INSERT OR IGNORE INTO competency_evidence_store (
        id, learner_id, skill_id, role_id, project_id, milestone_id, evidence_type, evidence_location,
        evidence_payload, reviewer_id, rubric_version, competency_version, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'VERIFIED')
    `).run(
      'ev_demo_rest_01',
      'demo_student',
      'rest-api',
      'software-engineering-intern',
      'proj_demo_rest_api',
      'ms_demo_2',
      'source_code',
      'workspace/proj_demo_rest_api/src/routes/api.js',
      JSON.stringify({ endpoints_tested: ['GET /health', 'POST /auth/login', 'GET /items'], auth_scheme: 'Bearer JWT', status: '200 OK' }),
      'demo_mentor'
    );

    console.log('[DB] Demo student base project, profiles & verified evidence seeded.');
  }
  }
}

module.exports = { initLabourSchema };
