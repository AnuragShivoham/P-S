import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Briefcase, Award, CheckCircle2, AlertTriangle, 
  Sparkles, FileText, ArrowRight, ShieldCheck, RefreshCw, 
  TrendingUp, Users, BookOpen, Layers, CheckCircle, Clock, 
  Search, Filter, ExternalLink, HelpCircle, UserCheck, MessageSquare,
  GraduationCap, Lightbulb, Rocket, Sliders
} from 'lucide-react';
import { api } from '../api/client';
import { useStore } from '../store';
import { Spinner, StatusBadge } from '../components/UI';

const isStaffRole = role => ['mentor', 'admin', 'university'].includes(role);

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: 'var(--bg-d, #0d1117)', border: '1px solid var(--border, #30363d)',
        borderRadius: 12, width: '100%', maxWidth: 560, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', borderBottom: '1px solid var(--border, #30363d)', background: 'var(--bg-o, #161b22)'
        }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--tx, #c9d1d9)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--tx-m, #8b949e)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 18 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LabourMarketPage() {
  const navigate = useNavigate();
  const { role, userId } = useStore();

  const [activeTab, setActiveTab] = useState('signals'); // 'signals' | 'matrix' | 'readiness' | 'evidence' | 'employer' | 'institution'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Data states
  const [signals, setSignals] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [skills, setSkills] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(userId || '');
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentEvidence, setStudentEvidence] = useState(null);
  const [gapResult, setGapResult] = useState(null);
  const [upgradePlan, setUpgradePlan] = useState(null);
  const [evidenceRecords, setEvidenceRecords] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [curriculumReport, setCurriculumReport] = useState(null);

  // Ingestion Form State per Signal Type
  const [signalType, setSignalType] = useState('job_description'); // 'job_description' | 'internship' | 'employer_form' | 'expert_input' | 'hiring_drive'

  const [jdForm, setJdForm] = useState({
    organization: 'Microsoft Corporation',
    role_title: 'Software Engineering Intern',
    experience_level: 'Junior / Intern (0-2 yrs)',
    work_mode: 'Hybrid',
    location: 'Redmond, WA / Remote Eligible',
    salary_band: '$50 - $65 / hr ($8,500/mo)',
    source_name: 'Microsoft Software Engineering Internship #200041085',
    tech_stack: 'Python, TypeScript, Docker, Azure, Git, Automated Testing',
    responsibilities: `Collaborate with engineering teams to design, build, and test software projects using modern engineering best practices.
Learn new engineering methods, frameworks, and continuous delivery tools (Containerization & Deployment).
Ensure system availability, reliability, efficiency, performance, and observability.
Build and operate monitoring at scale to guarantee application health and diagnostic visibility.`,
    qualifications: `Required Qualifications:
- Currently pursuing Bachelor's or Master's in Computer Science, Engineering, or related field.
- One year of programming experience in an object-oriented language.
- At least one academic term remaining after completion of internship.

Preferred Qualifications:
- Strong foundation in computer science fundamentals, data structures, and algorithms.
- Hands-on experience with containerization (Docker) and automated unit testing.`,
    raw_content: ''
  });

  const [internshipForm, setInternshipForm] = useState({
    organization: 'Google LLC',
    role_title: 'Summer 2026 Software Engineering Intern',
    duration: '12-14 Weeks (May - August 2026)',
    target_degree: '2nd or 3rd Year B.Tech / BS in CS or related technical discipline',
    stipend: '₹1,00,000 / month ($9,200/mo) + Relocation Allowance',
    work_mode: 'Hybrid (Campus Hub)',
    location: 'Bengaluru / Hyderabad / Sunnyvale, CA',
    source_name: 'Google Summer 2026 SWE Internship Posting #G-SWE-2026',
    prerequisites: 'Data Structures, Algorithms, Operating Systems, Database Management, Computer Networks',
    learning_scope: 'Interns will design and deploy a microservice module, write production unit/integration tests with >85% code coverage, and integrate containerized health monitoring probes.',
    project_brief: 'Develop an automated telemetry metric aggregator service in Node.js/Go, package it into a multi-stage Docker container, and verify automated CI/CD execution.',
    raw_content: ''
  });

  const [employerFormState, setEmployerFormState] = useState({
    organization: 'Razorpay / Stripe Partner Team',
    reviewer_name: 'Vikram Joshi (Principal Platform Engineer)',
    reviewer_title: 'VP of Engineering & University Hiring Lead',
    target_role: 'Associate Platform / Backend Engineer',
    urgency: '15 High-Priority Openings (Q3 2026)',
    source_name: 'Razorpay Platform Advisory & Hiring Rubric 2026',
    mandatory_skills: 'Docker Containerization, Automated Testing & QA, RESTful APIs, Git Branching',
    observed_gaps: `Fresh engineering graduates understand algorithmic DSA on LeetCode, but struggle severely to:
1. Write automated unit & integration tests with assertion frameworks
2. Create clean multi-stage Dockerfiles adhering to non-root security
3. Diagnose application logs and health probe failures in live containers
4. Architect structured modular repositories with clean dependency management`,
    desired_proof_artifacts: `1. Production Dockerfile in repository root
2. Passing test runner report with >80% coverage
3. /health probe telemetry endpoint returning 200 OK
4. Clean Git commit history with meaningful commit messages`,
    collaboration_standards: 'Demonstrated experience with Git feature branches, PR reviews, and writing brief engineering design RFCs.',
    raw_content: ''
  });

  const [expertFormState, setExpertFormState] = useState({
    expert_name: 'Dr. Sarah Chen',
    expert_title: 'VP of Systems Architecture & CNCF Technical Steering Member',
    organization: 'Cloud Native Computing Foundation (CNCF)',
    domain: 'Cloud Native Infrastructure & Distributed Microservices',
    forecast_horizon: '1-2 Years Strategic Horizon',
    source_name: 'CNCF 2026 Systems Architecture Radar & Competency Advisory',
    trend_title: 'Evolution towards Observable Containers, Ephemeral Environments, and Automated Test Proofs',
    emerging_skills: 'Docker Containerization, Kubernetes Orchestration, OpenTelemetry, Rust, eBPF, Automated Contract Testing',
    deprecated_skills: 'Manual SSH server deployment, uncontainerized monoliths, untested push-to-prod code, monolithic synchronous batches',
    technical_rationale: 'Enterprises across cloud and fintech are rejecting candidates who only possess academic textbook knowledge. By 2026, every junior engineer must be able to prove containerized deployment, test automation, and runtime observability directly in an IDE before their first day on the job.',
    raw_content: ''
  });

  const [hiringDriveFormState, setHiringDriveFormState] = useState({
    drive_title: 'Tier-1 Tech Consortium Pooled Campus Drive 2026',
    organizer: 'National Engineering Placement Consortium & FinTech Alliance',
    participating_companies: 'Atlassian, Swiggy, Razorpay, Cisco, Microsoft Partners',
    target_batch: '2026 Engineering Batch (B.Tech / M.Tech / MCA, Min 7.0 CGPA)',
    target_headcount: '150+ Full-Time Offers across Backend, DevOps & Platform Engineering',
    source_name: 'Consortium Pooled Hiring Drive Specification 2026-v2',
    evaluation_rounds: `Round 1: Online CS Fundamentals, Data Structures & System Concepts
Round 2: Architecture & Database Design Verification
Round 3: Live SOCRATES I.D.E. Practical Implementation & Automated Test Verification
Round 4: Technical Bar Raiser & Engineering Leadership Review`,
    benchmark_deliverables: 'Students must execute in the SOCRATES IDE, produce a working containerized service, pass automated unit tests, and generate verified competency evidence.',
    instructions: 'All shortlisted candidates will receive real-world problem statements inside SOCRATES IDE. Code will be compiled, executed, and benchmarked against industry rubrics.',
    raw_content: ''
  });

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    decision: 'APPROVE',
    comments: '',
    suggested_proficiency: 'intermediate'
  });

  // Employer Feedback Form state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    hiring_status: 'hired',
    readiness_rating: 5,
    communication_rating: 4,
    gap_notes: 'Candidate demonstrated practical containerization competency and rigorous automated testing.',
    docker_rating: 5,
    oop_rating: 5
  });

  const notify = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use allSettled so one failure doesn't block all data from loading
      const [sigsRes, reqsRes, skillsRes, rolesRes, evidRes, candRes, currRes, studentsRes] = await Promise.allSettled([
        ['mentor', 'admin', 'university'].includes(role) ? api.getLabourSignals() : Promise.resolve({ signals: [] }),
        api.getLabourRequirements(),
        api.getSkillsOntology(),
        api.getRolesOntology(),
        api.getCompetencyEvidence(userId ? { learner_id: userId } : {}),
        ['admin'].includes(role) ? api.getEmployerCandidates() : Promise.resolve({ candidates: [] }),
        ['admin', 'university'].includes(role) ? api.getInstitutionCurriculumAnalysis() : Promise.resolve(null),
        isStaffRole(role) ? api.getLabourStudents() : Promise.resolve({ students: [] })
      ]);

      const val = (r, fallback) => (r.status === 'fulfilled' ? r.value : fallback);
      const errs = [sigsRes, reqsRes, skillsRes, rolesRes, evidRes, candRes, currRes]
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message || 'Unknown error');
      if (errs.length) console.warn('[Labour] Some endpoints had errors:', errs);

      setSignals(val(sigsRes, {}).signals || []);
      setRequirements(val(reqsRes, {}).requirements || []);
      setSkills(val(skillsRes, {}).skills || []);
      setRoles(val(rolesRes, {}).roles || []);
      setEvidenceRecords(val(evidRes, {}).evidence || []);
      // Ensure candidates competencies are always arrays
      const rawCands = val(candRes, {}).candidates || [];
      setCandidates(rawCands.map(c => ({
        ...c,
        competencies: Array.isArray(c.competencies) ? c.competencies : [],
        verified_evidence: Array.isArray(c.verified_evidence) ? c.verified_evidence : []
      })));
      setCurriculumReport(val(currRes, null));
      const students = val(studentsRes, {}).students || [];
      setStudentOptions(students);
      if (isStaffRole(role) && !students.some(student => student.id === selectedStudentId)) {
        setSelectedStudentId(students[0]?.id || '');
      }

      // Load student evidence independently (won't kill page if it fails)
      const learnerId = isStaffRole(role) ? (students.some(student => student.id === selectedStudentId) ? selectedStudentId : students[0]?.id) : userId;
      if (learnerId) await loadStudent(learnerId);
    } catch (err) {
      console.error('[Labour Page Load Error]', err);
      setError(err.message || 'Failed to load labour market data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudent = async (studentId) => {
    if (role === 'student' && studentId !== userId) return;
    try {
      const ev = await api.getStudentEvidence(studentId);
      setStudentEvidence(ev);
      setGapResult(null);
      setUpgradePlan(null);
    } catch (e) {
      console.error('Failed to load student evidence:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, role]);

  // ── Preset Loaders for each signal type ──
  const handleLoadJdPreset = (presetKey) => {
    if (presetKey === 'msft_intern') {
      setJdForm({
        organization: 'Microsoft Corporation',
        role_title: 'Software Engineering Intern',
        experience_level: 'Junior / Intern (0-2 yrs)',
        work_mode: 'Hybrid',
        location: 'Redmond, WA / Remote Eligible',
        salary_band: '$50 - $65 / hr ($8,500/mo)',
        source_name: 'Microsoft SWE Internship Job #200041085',
        tech_stack: 'Python, TypeScript, Docker, Azure, Git, Automated Testing',
        responsibilities: `Collaborate with engineering teams to design, build, and test software projects using modern engineering best practices.
Learn new engineering methods, frameworks, and continuous delivery tools (Containerization & Deployment).
Ensure system availability, reliability, efficiency, performance, and observability.
Build and operate monitoring at scale to guarantee application health and diagnostic visibility.`,
        qualifications: `Required Qualifications:
- Currently pursuing Bachelor's or Master's in Computer Science, Engineering, or related field.
- One year of programming experience in an object-oriented language.
- At least one academic term remaining after completion of internship.

Preferred Qualifications:
- Strong foundation in computer science fundamentals, data structures, and algorithms.
- Hands-on experience with containerization (Docker) and automated unit testing.`,
        raw_content: ''
      });
      notify('Loaded Microsoft SWE Intern Job #200041085 preset.');
    } else if (presetKey === 'stripe_infra') {
      setJdForm({
        organization: 'Stripe',
        role_title: 'Infrastructure & Backend Systems Engineer',
        experience_level: 'Mid (2-5 yrs)',
        work_mode: 'Remote Eligible',
        location: 'San Francisco, CA / Remote',
        salary_band: '$160,000 - $210,000 + Equity',
        source_name: 'Stripe Core Infrastructure Engineer Posting #STR-INFRA-2026',
        tech_stack: 'Go, Node.js, Kubernetes, Docker, PostgreSQL, Distributed Systems, Telemetry',
        responsibilities: `Architect and maintain high-throughput distributed payment settlement pipelines.
Design containerized microservices running on Kubernetes with zero-downtime rolling deploys.
Implement comprehensive distributed tracing, metrics, and alerting using Prometheus and OpenTelemetry.
Enforce rigorous automated testing gates with >85% code coverage.`,
        qualifications: `Required Qualifications:
- 2+ years of professional backend software engineering experience.
- Proficiency in containerization with Docker and container orchestration with Kubernetes.
- Deep understanding of relational databases, transactions, and indexing in PostgreSQL.

Preferred Qualifications:
- Experience building financial or low-latency transactional architectures.
- Experience with infrastructure-as-code (Terraform) and health probe monitoring.`,
        raw_content: ''
      });
      notify('Loaded Stripe Infrastructure Engineer preset.');
    }
  };

  const handleLoadInternPreset = (presetKey) => {
    if (presetKey === 'google_summer') {
      setInternshipForm({
        organization: 'Google LLC',
        role_title: 'Summer 2026 Software Engineering Intern',
        duration: '12-14 Weeks (May - August 2026)',
        target_degree: '2nd or 3rd Year B.Tech / BS in CS or related technical discipline',
        stipend: '₹1,00,000 / month ($9,200/mo) + Relocation Allowance',
        work_mode: 'Hybrid (Campus Hub)',
        location: 'Bengaluru / Hyderabad / Sunnyvale, CA',
        source_name: 'Google Summer 2026 SWE Internship Posting #G-SWE-2026',
        prerequisites: 'Data Structures, Algorithms, Operating Systems, Database Management, Computer Networks',
        learning_scope: 'Interns will design and deploy a microservice module, write production unit/integration tests with >85% code coverage, and integrate containerized health monitoring probes.',
        project_brief: 'Develop an automated telemetry metric aggregator service in Node.js/Go, package it into a multi-stage Docker container, and verify automated CI/CD execution.',
        raw_content: ''
      });
      notify('Loaded Google Summer 2026 SWE Intern preset.');
    } else if (presetKey === 'uber_coop') {
      setInternshipForm({
        organization: 'Uber Technologies',
        role_title: 'Distributed Systems Engineering Co-op',
        duration: '6 Months Co-op (July - December 2026)',
        target_degree: 'Pre-final Year B.Tech / Dual Degree CSE/IT',
        stipend: '₹85,000 / month + Uber Credits & Housing',
        work_mode: 'On-site / Hybrid',
        location: 'Bengaluru / Hyderabad, India',
        source_name: 'Uber Co-op Program 2026 #UBER-COOP-889',
        prerequisites: 'Object-Oriented Programming, Concurrent Programming, Distributed Systems Basics, Linux Shell',
        learning_scope: 'Real-time telemetry event streaming, writing resilient microservice endpoints, container orchestration, and chaos testing.',
        project_brief: 'Build a distributed dispatch simulator endpoint that tests concurrency under simulated network partitions, verified through automated test suites in Docker.',
        raw_content: ''
      });
      notify('Loaded Uber Distributed Systems Co-op preset.');
    }
  };

  const handleLoadEmployerPreset = (presetKey) => {
    if (presetKey === 'razorpay') {
      setEmployerFormState({
        organization: 'Razorpay / Stripe Partner Team',
        reviewer_name: 'Vikram Joshi (Principal Platform Engineer)',
        reviewer_title: 'VP of Engineering & University Hiring Lead',
        target_role: 'Associate Platform / Backend Engineer',
        urgency: '15 High-Priority Openings (Q3 2026)',
        source_name: 'Razorpay Platform Advisory & Hiring Rubric 2026',
        mandatory_skills: 'Docker Containerization, Automated Testing & QA, RESTful APIs, Git Branching',
        observed_gaps: `Fresh engineering graduates understand algorithmic DSA on LeetCode, but struggle severely to:
1. Write automated unit & integration tests with assertion frameworks
2. Create clean multi-stage Dockerfiles adhering to non-root security
3. Diagnose application logs and health probe failures in live containers
4. Architect structured modular repositories with clean dependency management`,
        desired_proof_artifacts: `1. Production Dockerfile in repository root
2. Passing test runner report with >80% coverage
3. /health probe telemetry endpoint returning 200 OK
4. Clean Git commit history with meaningful commit messages`,
        collaboration_standards: 'Demonstrated experience with Git feature branches, PR reviews, and writing brief engineering design RFCs.',
        raw_content: ''
      });
      notify('Loaded Razorpay Platform Advisory preset.');
    } else if (presetKey === 'saas_reliability') {
      setEmployerFormState({
        organization: 'Postman / SaaS Platform Team',
        reviewer_name: 'Ananya Sharma (Senior Engineering Director)',
        reviewer_title: 'Core Architecture Review Board',
        target_role: 'Cloud Reliability & Developer Experience Engineer',
        urgency: '10 Openings for Immediate Onboarding',
        source_name: 'Cloud SaaS Engineering Reliability Requirements 2026',
        mandatory_skills: 'API Contract Testing, Docker, Observability & Telemetry, CI/CD GitHub Actions',
        observed_gaps: `Graduates struggle with API idempotency, structured error handling, writing contract tests before writing code, and dockerizing multi-container workflows.`,
        desired_proof_artifacts: `Automated Postman/Newman or Jest test suite, multi-stage Dockerfile, and OpenTelemetry instrumentation with structured JSON logging.`,
        collaboration_standards: 'Clean PR descriptions, semver releases, and automated PR checks before merging.',
        raw_content: ''
      });
      notify('Loaded SaaS Reliability Advisory preset.');
    }
  };

  const handleLoadExpertPreset = (presetKey) => {
    if (presetKey === 'cncf_radar') {
      setExpertFormState({
        expert_name: 'Dr. Sarah Chen',
        expert_title: 'VP of Systems Architecture & CNCF Technical Steering Member',
        organization: 'Cloud Native Computing Foundation (CNCF)',
        domain: 'Cloud Native Infrastructure & Distributed Microservices',
        forecast_horizon: '1-2 Years Strategic Horizon',
        source_name: 'CNCF 2026 Systems Architecture Radar & Competency Advisory',
        trend_title: 'Evolution towards Observable Containers, Ephemeral Environments, and Automated Test Proofs',
        emerging_skills: 'Docker Containerization, Kubernetes Orchestration, OpenTelemetry, Rust, eBPF, Automated Contract Testing',
        deprecated_skills: 'Manual SSH server deployment, uncontainerized monoliths, untested push-to-prod code, monolithic synchronous batches',
        technical_rationale: 'Enterprises across cloud and fintech are rejecting candidates who only possess academic textbook knowledge. By 2026, every junior engineer must be able to prove containerized deployment, test automation, and runtime observability directly in an IDE before their first day on the job.',
        raw_content: ''
      });
      notify('Loaded CNCF 2026 Cloud-Native Radar preset.');
    } else if (presetKey === 'genai_mlops') {
      setExpertFormState({
        expert_name: 'Marcus Vance',
        expert_title: 'Principal AI Infrastructure Architect',
        organization: 'OpenML Foundation',
        domain: 'Applied Generative AI & MLOps Infrastructure',
        forecast_horizon: 'Next 6-12 Months',
        source_name: '2026 Production GenAI Systems Engineering Advisory',
        trend_title: 'Transition from Prompt Engineering to Grounded LLM Pipelines, Vector Stores & Deterministic QA',
        emerging_skills: 'LLM Orchestration, Vector Databases (pgvector), Automated LLM Evals, Dockerized Microservices, Streaming Protocols',
        deprecated_skills: 'Unvalidated prompt pasting, monolithic notebook models without test suites, manual model inference servers',
        technical_rationale: 'Companies need software engineers who can integrate LLM APIs safely with deterministic guardrails, structured JSON outputs, streaming WebSockets, and containerized test execution.',
        raw_content: ''
      });
      notify('Loaded Production GenAI Systems Advisory preset.');
    }
  };

  const handleLoadDrivePreset = (presetKey) => {
    if (presetKey === 'tier1_consortium') {
      setHiringDriveFormState({
        drive_title: 'Tier-1 Tech Consortium Pooled Campus Drive 2026',
        organizer: 'National Engineering Placement Consortium & FinTech Alliance',
        participating_companies: 'Atlassian, Swiggy, Razorpay, Cisco, Microsoft Partners',
        target_batch: '2026 Engineering Batch (B.Tech / M.Tech / MCA, Min 7.0 CGPA)',
        target_headcount: '150+ Full-Time Offers across Backend, DevOps & Platform Engineering',
        source_name: 'Consortium Pooled Hiring Drive Specification 2026-v2',
        evaluation_rounds: `Round 1: Online CS Fundamentals, Data Structures & System Concepts
Round 2: Architecture & Database Design Verification
Round 3: Live SOCRATES I.D.E. Practical Implementation & Automated Test Verification
Round 4: Technical Bar Raiser & Engineering Leadership Review`,
        benchmark_deliverables: 'Students must execute in the SOCRATES IDE, produce a working containerized service, pass automated unit tests, and generate verified competency evidence.',
        instructions: 'All shortlisted candidates will receive real-world problem statements inside SOCRATES IDE. Code will be compiled, executed, and benchmarked against industry rubrics.',
        raw_content: ''
      });
      notify('Loaded Tier-1 Tech Consortium Pooled Campus Drive preset.');
    } else if (presetKey === 'fintech_blitz') {
      setHiringDriveFormState({
        drive_title: 'National FinTech & Distributed Systems Placement Blitz',
        organizer: 'All-India FinTech Engineering Association',
        participating_companies: '18 FinTech Startups & Tier-1 Payments Infrastructure Firms',
        target_batch: '2026 Graduating Cohort (CS / IT / Software Eng)',
        target_headcount: '90 High-Compensation Core Engineering Roles',
        source_name: 'FinTech Engineering Placement Blitz Rubric 2026',
        evaluation_rounds: `Round 1: Data Structures, Transaction Isolation & Concurrency
Round 2: System Architecture & RESTful API Contract Design
Round 3: Practical Code Challenge in SOCRATES IDE: Docker Containerization, Health Check, Test Suite
Round 4: Live Founder / Tech Lead Discussion`,
        benchmark_deliverables: 'Candidates must demonstrate verified competency records in Docker, Automated Testing, and System Reliability.',
        instructions: 'Evaluation is based on verified artifacts stored in SOCRATES Competency Evidence Store rather than resume keywords.',
        raw_content: ''
      });
      notify('Loaded FinTech Placement Blitz preset.');
    }
  };

  // Unified Multi-Signal Submission Handler (Compiles specialized fields into rich markdown)
  const handleIngestActiveSignal = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let payload = {};

      if (signalType === 'job_description') {
        const fullContent = `Role: ${jdForm.role_title}
Organization: ${jdForm.organization}
Level: ${jdForm.experience_level}
Location: ${jdForm.location} (${jdForm.work_mode})
Salary Band: ${jdForm.salary_band || 'Standard Industry Band'}
Key Tech Stack: ${jdForm.tech_stack}

### Responsibilities:
${jdForm.responsibilities}

### Qualifications:
${jdForm.qualifications}

${jdForm.raw_content ? `### Additional Details:\n${jdForm.raw_content}` : ''}`;

        payload = {
          source_type: 'job_description',
          source_name: jdForm.source_name || `${jdForm.organization} - ${jdForm.role_title}`,
          organization: jdForm.organization,
          role_title: jdForm.role_title,
          location: jdForm.location,
          raw_content: fullContent
        };
      } else if (signalType === 'internship') {
        const fullContent = `Internship Role: ${internshipForm.role_title}
Host Organization: ${internshipForm.organization}
Term & Duration: ${internshipForm.duration}
Target Academic Degree: ${internshipForm.target_degree}
Stipend: ${internshipForm.stipend}
Location: ${internshipForm.location} (${internshipForm.work_mode})

### Academic Prerequisites & Coursework:
${internshipForm.prerequisites}

### Mentorship Scope & Learning Objectives:
${internshipForm.learning_scope}

### Project Assignment / Deliverable:
${internshipForm.project_brief}

${internshipForm.raw_content ? `### Notes:\n${internshipForm.raw_content}` : ''}`;

        payload = {
          source_type: 'internship',
          source_name: internshipForm.source_name || `${internshipForm.organization} - ${internshipForm.role_title}`,
          organization: internshipForm.organization,
          role_title: internshipForm.role_title,
          location: internshipForm.location,
          raw_content: fullContent
        };
      } else if (signalType === 'employer_form') {
        const fullContent = `Direct Employer: ${employerFormState.organization}
Technical Reviewer: ${employerFormState.reviewer_name} (${employerFormState.reviewer_title})
Target Role: ${employerFormState.target_role}
Hiring Urgency: ${employerFormState.urgency}

### Mandatory Technical Competencies:
${employerFormState.mandatory_skills}

### Observed Skill Gaps in Recent Graduates:
${employerFormState.observed_gaps}

### Required Practical Proof Artifacts in IDE:
${employerFormState.desired_proof_artifacts}

### Team Collaboration & Standards:
${employerFormState.collaboration_standards}

${employerFormState.raw_content ? `### Additional Specifications:\n${employerFormState.raw_content}` : ''}`;

        payload = {
          source_type: 'employer_form',
          source_name: employerFormState.source_name || `${employerFormState.organization} Advisory`,
          organization: employerFormState.organization,
          role_title: employerFormState.target_role,
          location: 'Industry Partner Site / Remote',
          raw_content: fullContent
        };
      } else if (signalType === 'expert_input') {
        const fullContent = `Subject Matter Expert: ${expertFormState.expert_name} (${expertFormState.expert_title})
Organization: ${expertFormState.organization}
Domain: ${expertFormState.domain}
Forecast Horizon: ${expertFormState.forecast_horizon}
Trend Thesis: ${expertFormState.trend_title}

### Emerging High-Demand Competencies:
${expertFormState.emerging_skills}

### Deprecated / Declining Practices:
${expertFormState.deprecated_skills}

### Technical Rationale & Verification Criteria:
${expertFormState.technical_rationale}

${expertFormState.raw_content ? `### Reference Material:\n${expertFormState.raw_content}` : ''}`;

        payload = {
          source_type: 'expert_input',
          source_name: expertFormState.source_name || `${expertFormState.organization} - ${expertFormState.trend_title}`,
          organization: expertFormState.organization,
          role_title: `${expertFormState.domain} Specialist`,
          location: 'Global Industry',
          raw_content: fullContent
        };
      } else if (signalType === 'hiring_drive') {
        const fullContent = `Campus / Pooled Drive: ${hiringDriveFormState.drive_title}
Organizing Consortium: ${hiringDriveFormState.organizer}
Participating Employers: ${hiringDriveFormState.participating_companies}
Target Batch & Eligibility: ${hiringDriveFormState.target_batch}
Intake Headcount Target: ${hiringDriveFormState.target_headcount}

### Round-by-Round Evaluation Process:
${hiringDriveFormState.evaluation_rounds}

### Benchmark IDE Deliverable Bar:
${hiringDriveFormState.benchmark_deliverables}

### Instructions & Rubrics:
${hiringDriveFormState.instructions}

${hiringDriveFormState.raw_content ? `### Additional Details:\n${hiringDriveFormState.raw_content}` : ''}`;

        payload = {
          source_type: 'hiring_drive',
          source_name: hiringDriveFormState.source_name || hiringDriveFormState.drive_title,
          organization: hiringDriveFormState.organizer,
          role_title: 'Associate Software Engineer (Campus Drive)',
          location: 'Pan-India / Regional Placement Hubs',
          raw_content: fullContent
        };
      }

      if (!payload.raw_content || !payload.source_name) {
        alert('Please fill in the required fields before submitting.');
        setLoading(false);
        return;
      }

      const res = await api.ingestLabourSignal(payload);
      notify(`Signal ingested! AI Semantic Engine extracted ${res.data?.extracted_count || 0} competencies.`);
      await loadData();
      setActiveTab('matrix');
    } catch (err) {
      alert('Ingestion error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (req) => {
    setSelectedReq(req);
    setReviewForm({
      decision: 'APPROVE',
      comments: 'Validated against 2026 industry standards and production role rubric.',
      suggested_proficiency: req.proficiency || 'intermediate'
    });
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReq) return;
    setLoading(true);
    try {
      await api.submitRequirementReview(selectedReq.id, reviewForm);
      notify(`Requirement "${selectedReq.skill_name}" review submitted (${reviewForm.decision}).`);
      setReviewModalOpen(false);
      await loadData();
    } catch (err) {
      alert('Review failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateGap = async (skillId) => {
    setLoading(true);
    try {
      const res = await api.evaluateStudentGap(selectedStudentId, {
        skill_id: skillId,
        role_id: 'software-engineering-intern'
      });
      setGapResult(res);

      if (res.decision === 'UPGRADE_EXISTING_PROJECT' && res.target_project) {
        const plan = await api.getProjectUpgradePlan(res.target_project.id, {
          target_skill_id: skillId
        });
        setUpgradePlan(plan.upgradePlan);
      }
    } catch (err) {
      alert('Gap evaluation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUpgrade = async () => {
    if (!gapResult?.target_project || !upgradePlan) return;
    setLoading(true);
    try {
      const res = await api.applyProjectUpgrade(gapResult.target_project.id, {
        student_id: selectedStudentId,
        upgrade_plan: upgradePlan,
        target_requirement_id: 'req_msft_' + gapResult.skill_id
      });
      notify(`Project "${gapResult.target_project.title}" upgraded! Added Docker milestone & tasks.`);
      await loadStudent(selectedStudentId);
      await loadData();
    } catch (err) {
      alert('Upgrade error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEmployerFeedback = (candidate) => {
    setSelectedCandidate(candidate);
    setFeedbackForm({
      hiring_status: 'hired',
      readiness_rating: 5,
      communication_rating: 5,
      gap_notes: 'Candidate completed verified containerization milestone on existing REST API repo. Production ready.',
      docker_rating: 5,
      oop_rating: 5
    });
    setFeedbackModalOpen(true);
  };

  const handleSubmitEmployerFeedback = async () => {
    if (!selectedCandidate) return;
    setLoading(true);
    try {
      const res = await api.submitEmployerFeedback({
        candidate_id: selectedCandidate.student_id,
        role_id: 'software-engineering-intern',
        hiring_status: feedbackForm.hiring_status,
        readiness_rating: feedbackForm.readiness_rating,
        communication_rating: feedbackForm.communication_rating,
        gap_notes: feedbackForm.gap_notes,
        competency_feedback: {
          docker: { rating: feedbackForm.docker_rating, notes: 'Demonstrated verified Docker containerization' },
          oop: { rating: feedbackForm.oop_rating, notes: 'Solid object-oriented design patterns' }
        }
      });
      notify('Employer feedback recorded! Closed the loop back into Labour Intelligence signal counts.');
      setFeedbackModalOpen(false);
      await loadData();
    } catch (err) {
      alert('Failed to submit employer feedback: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isReviewer = ['mentor', 'admin', 'university'].includes(role);
  const canViewCandidates = role === 'admin';

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return <span style={{ background: 'rgba(46, 160, 67, 0.2)', color: '#3fb950', border: '1px solid rgba(46, 160, 67, 0.4)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>🛡️ VERIFIED</span>;
      case 'ASSESSED':
        return <span style={{ background: 'rgba(210, 153, 34, 0.2)', color: '#d29922', border: '1px solid rgba(210, 153, 34, 0.4)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>📝 ASSESSED</span>;
      case 'OBSERVED':
        return <span style={{ background: 'rgba(88, 166, 255, 0.2)', color: '#58a6ff', border: '1px solid rgba(88, 166, 255, 0.4)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>🔍 OBSERVED</span>;
      case 'CLAIMED':
      default:
        return <span style={{ background: 'rgba(139, 148, 158, 0.2)', color: '#8b949e', border: '1px solid rgba(139, 148, 158, 0.4)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>📄 CLAIMED</span>;
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px', fontFamily: 'var(--sans)', color: 'var(--tx)' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(88,166,255,0.08) 0%, rgba(139,92,246,0.08) 100%)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={24} color="#58a6ff" />
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Labour-Market Intelligence & Competency Alignment</h1>
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--tx-m)', fontSize: 13 }}>
              Evidence-Driven Signals → Canonical Ontology → Requirement Matrix → Gap Engine → Project Upgrade → I.D.E. Execution → Verified Competency → Closed Loop Feedback
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isReviewer && <button 
              onClick={loadData}
              style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx-m)', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} /> Refresh
            </button>}
            <button 
              onClick={() => navigate('/ide')}
              style={{ background: 'linear-gradient(180deg, #238636 0%, #2ea043 100%)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Open I.D.E. <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {successMsg && (
          <div style={{ marginTop: 14, background: 'rgba(46,160,67,0.15)', border: '1px solid rgba(46,160,67,0.4)', color: '#3fb950', padding: '8px 14px', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
        {[
          { id: 'signals', label: '1. Industry Signals (JD Ingestion)', icon: Briefcase },
          { id: 'matrix', label: '2. Requirement Matrix & Expert Review', icon: TrendingUp },
          { id: 'readiness', label: '3. Student Readiness & Gap Engine', icon: Award },
          { id: 'evidence', label: '4. Competency Evidence Store', icon: ShieldCheck },
          { id: 'employer', label: '5. Employer View & Feedback Loop', icon: Users },
          { id: 'institution', label: '6. Institutional Analytics', icon: BookOpen },
        ].filter(t => {
          if (t.id === 'signals' || t.id === 'matrix') return isReviewer;
          if (t.id === 'employer') return canViewCandidates;
          if (t.id === 'institution') return ['admin', 'university'].includes(role);
          return true;
        }).map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: active ? 'rgba(88,166,255,0.12)' : 'transparent',
                border: active ? '1px solid rgba(88,166,255,0.35)' : '1px solid transparent',
                borderBottom: active ? '2px solid #58a6ff' : '1px solid transparent',
                color: active ? '#58a6ff' : 'var(--tx-m)',
                padding: '10px 14px',
                borderRadius: '8px 8px 0 0',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ background: 'rgba(248,81,73,0.12)', border: '1px solid rgba(248,81,73,0.4)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f85149', fontSize: 13 }}>
            <AlertTriangle size={16} />
            <span><b>Load Error:</b> {error}</span>
          </div>
          <button onClick={loadData} style={{ background: 'rgba(248,81,73,0.2)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149', padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: INDUSTRY SIGNALS & JD INGESTION */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'signals' && isReviewer && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 20 }}>
          {/* Signal Ingestion Container */}
          <div style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>📡 Ingest Industry Signal</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--tx-m)' }}>
                  Each signal type provides tailored inputs to capture accurate competencies, requirements, and evidence standards.
                </p>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#3fb950', background: 'rgba(63,185,80,0.1)', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(63,185,80,0.25)' }}>
                <Sparkles size={13} /> Root LLM API Active
              </span>
            </div>

            {/* Signal Type Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 18, background: 'var(--bg-o)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
              {[
                { id: 'job_description', label: 'Job Description', sub: 'Full-time JD', icon: Briefcase, color: '#58a6ff' },
                { id: 'internship', label: 'Internship', sub: 'University / Co-op', icon: GraduationCap, color: '#bc8cff' },
                { id: 'employer_form', label: 'Employer Advisory', sub: 'Hiring Manager', icon: Building2, color: '#3fb950' },
                { id: 'expert_input', label: 'Expert Trend', sub: 'Industry Radar', icon: Lightbulb, color: '#d29922' },
                { id: 'hiring_drive', label: 'Campus Drive', sub: 'Consortium Pool', icon: Rocket, color: '#f85149' }
              ].map(t => {
                const Icon = t.icon;
                const active = signalType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSignalType(t.id)}
                    style={{
                      background: active ? 'var(--bg-d)' : 'transparent',
                      border: active ? `1px solid ${t.color}` : '1px solid transparent',
                      borderRadius: 6,
                      padding: '8px 4px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={16} color={active ? t.color : 'var(--tx-m)'} />
                    <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'var(--tx)' : 'var(--tx-m)' }}>
                      {t.label}
                    </span>
                    <span style={{ fontSize: 9, color: active ? t.color : 'var(--tx-2)' }}>
                      {t.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Form Renderer based on signalType */}
            <form onSubmit={handleIngestActiveSignal}>
              {/* ──────────────────────────────────────────────────────────── */}
              {/* 1. JOB DESCRIPTION FORM */}
              {/* ──────────────────────────────────────────────────────────── */}
              {signalType === 'job_description' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#58a6ff' }}>💼 Full-Time Job Description Schema</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleLoadJdPreset('msft_intern')}
                        style={{ background: 'rgba(88,166,255,0.15)', border: '1px solid rgba(88,166,255,0.3)', color: '#58a6ff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ Microsoft SWE Intern JD
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadJdPreset('stripe_infra')}
                        style={{ background: 'rgba(88,166,255,0.15)', border: '1px solid rgba(88,166,255,0.3)', color: '#58a6ff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ Stripe Core Infra JD
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Organization / Company</label>
                      <input
                        type="text"
                        value={jdForm.organization}
                        onChange={e => setJdForm({ ...jdForm, organization: e.target.value })}
                        placeholder="e.g. Microsoft Corporation"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Role Title</label>
                      <input
                        type="text"
                        value={jdForm.role_title}
                        onChange={e => setJdForm({ ...jdForm, role_title: e.target.value })}
                        placeholder="e.g. Software Engineer II"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Experience Level</label>
                      <select
                        value={jdForm.experience_level}
                        onChange={e => setJdForm({ ...jdForm, experience_level: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      >
                        <option>Junior / Intern (0-2 yrs)</option>
                        <option>Mid-Level (2-5 yrs)</option>
                        <option>Senior Engineer (5-8 yrs)</option>
                        <option>Staff / Principal (8+ yrs)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Work Mode</label>
                      <select
                        value={jdForm.work_mode}
                        onChange={e => setJdForm({ ...jdForm, work_mode: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      >
                        <option>Hybrid</option>
                        <option>Remote Eligible</option>
                        <option>On-site</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Location</label>
                      <input
                        type="text"
                        value={jdForm.location}
                        onChange={e => setJdForm({ ...jdForm, location: e.target.value })}
                        placeholder="e.g. Redmond, WA / Remote"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Primary Tech Stack Keywords</label>
                      <input
                        type="text"
                        value={jdForm.tech_stack}
                        onChange={e => setJdForm({ ...jdForm, tech_stack: e.target.value })}
                        placeholder="e.g. Docker, TypeScript, Azure, Kubernetes, Testing"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Posting Title / ID Reference</label>
                      <input
                        type="text"
                        value={jdForm.source_name}
                        onChange={e => setJdForm({ ...jdForm, source_name: e.target.value })}
                        placeholder="e.g. Microsoft Job #200041085"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Core Responsibilities & Deliverables</label>
                    <textarea
                      rows={3}
                      value={jdForm.responsibilities}
                      onChange={e => setJdForm({ ...jdForm, responsibilities: e.target.value })}
                      placeholder="Daily duties, system scope, architecture responsibilities..."
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono)' }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Required & Preferred Qualifications</label>
                    <textarea
                      rows={5}
                      value={jdForm.qualifications}
                      onChange={e => setJdForm({ ...jdForm, qualifications: e.target.value })}
                      placeholder="Paste minimum qualifications, degrees, required tools, and preferred skills..."
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono)' }}
                    />
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* 2. INTERNSHIP FORM */}
              {/* ──────────────────────────────────────────────────────────── */}
              {signalType === 'internship' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#bc8cff' }}>🎓 University Internship & Co-op Schema</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleLoadInternPreset('google_summer')}
                        style={{ background: 'rgba(188,140,255,0.15)', border: '1px solid rgba(188,140,255,0.3)', color: '#bc8cff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ Google Summer Intern
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadInternPreset('uber_coop')}
                        style={{ background: 'rgba(188,140,255,0.15)', border: '1px solid rgba(188,140,255,0.3)', color: '#bc8cff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ Uber Systems Co-op
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Host Company / Research Lab</label>
                      <input
                        type="text"
                        value={internshipForm.organization}
                        onChange={e => setInternshipForm({ ...internshipForm, organization: e.target.value })}
                        placeholder="e.g. Google LLC"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Internship Program Title</label>
                      <input
                        type="text"
                        value={internshipForm.role_title}
                        onChange={e => setInternshipForm({ ...internshipForm, role_title: e.target.value })}
                        placeholder="e.g. Summer 2026 SWE Intern"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Term & Duration</label>
                      <input
                        type="text"
                        value={internshipForm.duration}
                        onChange={e => setInternshipForm({ ...internshipForm, duration: e.target.value })}
                        placeholder="e.g. 12 Weeks (Summer 2026)"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Monthly Stipend / Allowance</label>
                      <input
                        type="text"
                        value={internshipForm.stipend}
                        onChange={e => setInternshipForm({ ...internshipForm, stipend: e.target.value })}
                        placeholder="e.g. ₹80,000/mo or $8,500/mo"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Location & Mode</label>
                      <input
                        type="text"
                        value={internshipForm.location}
                        onChange={e => setInternshipForm({ ...internshipForm, location: e.target.value })}
                        placeholder="e.g. Bengaluru / Remote"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Prerequisite Academic Coursework</label>
                    <input
                      type="text"
                      value={internshipForm.prerequisites}
                      onChange={e => setInternshipForm({ ...internshipForm, prerequisites: e.target.value })}
                      placeholder="e.g. Data Structures, OS, DBMS, Computer Networks"
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Mentorship Scope & Learning Objectives</label>
                    <textarea
                      rows={3}
                      value={internshipForm.learning_scope}
                      onChange={e => setInternshipForm({ ...internshipForm, learning_scope: e.target.value })}
                      placeholder="What engineering skills will the intern acquire under mentorship?"
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Project Assignment & Practical Deliverables</label>
                    <textarea
                      rows={3}
                      value={internshipForm.project_brief}
                      onChange={e => setInternshipForm({ ...internshipForm, project_brief: e.target.value })}
                      placeholder="Actual technical problem statement or intern deliverable..."
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono)' }}
                    />
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* 3. EMPLOYER REQUIREMENT FORM */}
              {/* ──────────────────────────────────────────────────────────── */}
              {signalType === 'employer_form' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#3fb950' }}>🏢 Direct Employer Advisory & Gap Report Schema</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleLoadEmployerPreset('razorpay')}
                        style={{ background: 'rgba(63,185,80,0.15)', border: '1px solid rgba(63,185,80,0.3)', color: '#3fb950', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ Razorpay Platform Advisory
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadEmployerPreset('saas_reliability')}
                        style={{ background: 'rgba(63,185,80,0.15)', border: '1px solid rgba(63,185,80,0.3)', color: '#3fb950', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ SaaS Reliability Advisory
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Employer / Company</label>
                      <input
                        type="text"
                        value={employerFormState.organization}
                        onChange={e => setEmployerFormState({ ...employerFormState, organization: e.target.value })}
                        placeholder="e.g. Razorpay Technologies"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Technical Reviewer (Name & Title)</label>
                      <input
                        type="text"
                        value={employerFormState.reviewer_name}
                        onChange={e => setEmployerFormState({ ...employerFormState, reviewer_name: e.target.value })}
                        placeholder="e.g. Vikram Joshi (Principal Platform Engineer)"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Target Hiring Role</label>
                      <input
                        type="text"
                        value={employerFormState.target_role}
                        onChange={e => setEmployerFormState({ ...employerFormState, target_role: e.target.value })}
                        placeholder="e.g. Associate Backend Engineer"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Immediate Hiring Urgency / Openings</label>
                      <input
                        type="text"
                        value={employerFormState.urgency}
                        onChange={e => setEmployerFormState({ ...employerFormState, urgency: e.target.value })}
                        placeholder="e.g. 15 Immediate Positions (Q3 2026)"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Mandatory Technical Competencies</label>
                    <input
                      type="text"
                      value={employerFormState.mandatory_skills}
                      onChange={e => setEmployerFormState({ ...employerFormState, mandatory_skills: e.target.value })}
                      placeholder="e.g. Docker Containerization, Automated Testing & QA, RESTful APIs"
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: '#f85149', display: 'block', marginBottom: 4, fontWeight: 600 }}>⚠️ Observed Skill Gaps in Recent Fresh Graduates</label>
                    <textarea
                      rows={3}
                      value={employerFormState.observed_gaps}
                      onChange={e => setEmployerFormState({ ...employerFormState, observed_gaps: e.target.value })}
                      placeholder="What critical skills do recent college graduates consistently lack when joining production teams?"
                      style={{ width: '100%', background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.3)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: '#3fb950', display: 'block', marginBottom: 4, fontWeight: 600 }}>✅ Required Practical Proof Artifacts in SOCRATES IDE</label>
                    <textarea
                      rows={3}
                      value={employerFormState.desired_proof_artifacts}
                      onChange={e => setEmployerFormState({ ...employerFormState, desired_proof_artifacts: e.target.value })}
                      placeholder="Exact files or test outputs that prove mastery (e.g. Dockerfile, passing test runner log, /health endpoint)"
                      style={{ width: '100%', background: 'rgba(63,185,80,0.06)', border: '1px solid rgba(63,185,80,0.3)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono)' }}
                    />
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* 4. EXPERT INPUT / TREND ADVISORY FORM */}
              {/* ──────────────────────────────────────────────────────────── */}
              {signalType === 'expert_input' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#d29922' }}>💡 Industry Expert & Market Trend Advisory Schema</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleLoadExpertPreset('cncf_radar')}
                        style={{ background: 'rgba(210,153,34,0.15)', border: '1px solid rgba(210,153,34,0.3)', color: '#d29922', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ CNCF 2026 Cloud Radar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadExpertPreset('genai_mlops')}
                        style={{ background: 'rgba(210,153,34,0.15)', border: '1px solid rgba(210,153,34,0.3)', color: '#d29922', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ GenAI & MLOps Advisory
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Subject Matter Expert Name</label>
                      <input
                        type="text"
                        value={expertFormState.expert_name}
                        onChange={e => setExpertFormState({ ...expertFormState, expert_name: e.target.value })}
                        placeholder="e.g. Dr. Sarah Chen"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Organization / Research Body</label>
                      <input
                        type="text"
                        value={expertFormState.organization}
                        onChange={e => setExpertFormState({ ...expertFormState, organization: e.target.value })}
                        placeholder="e.g. Cloud Native Computing Foundation"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Technology Domain / Discipline</label>
                      <input
                        type="text"
                        value={expertFormState.domain}
                        onChange={e => setExpertFormState({ ...expertFormState, domain: e.target.value })}
                        placeholder="e.g. Cloud Native & Distributed Systems"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Forecast Horizon</label>
                      <select
                        value={expertFormState.forecast_horizon}
                        onChange={e => setExpertFormState({ ...expertFormState, forecast_horizon: e.target.value })}
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      >
                        <option>Next 6-12 Months (Immediate Market Adoption)</option>
                        <option>1-2 Years Strategic Horizon</option>
                        <option>3-5 Years Transformative Research</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Trend / Advisory Title</label>
                    <input
                      type="text"
                      value={expertFormState.trend_title}
                      onChange={e => setExpertFormState({ ...expertFormState, trend_title: e.target.value })}
                      placeholder="e.g. Transition to Observable Containers & Automated QA Gates"
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#3fb950', display: 'block', marginBottom: 4, fontWeight: 600 }}>🚀 Emerging High-Demand Competencies</label>
                      <textarea
                        rows={2}
                        value={expertFormState.emerging_skills}
                        onChange={e => setExpertFormState({ ...expertFormState, emerging_skills: e.target.value })}
                        placeholder="Skills gaining rapid adoption across modern teams..."
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#f85149', display: 'block', marginBottom: 4, fontWeight: 600 }}>📉 Declining / Deprecated Practices</label>
                      <textarea
                        rows={2}
                        value={expertFormState.deprecated_skills}
                        onChange={e => setExpertFormState({ ...expertFormState, deprecated_skills: e.target.value })}
                        placeholder="Practices phasing out or no longer considered production-ready..."
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Technical Rationale & Verification Criteria</label>
                    <textarea
                      rows={3}
                      value={expertFormState.technical_rationale}
                      onChange={e => setExpertFormState({ ...expertFormState, technical_rationale: e.target.value })}
                      placeholder="Explain why this skill shift is mandatory and what practical evidence verifies candidate competence..."
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}
                    />
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────── */}
              {/* 5. HIRING DRIVE BRIEF FORM */}
              {/* ──────────────────────────────────────────────────────────── */}
              {signalType === 'hiring_drive' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f85149' }}>🚀 Campus / Pooled Hiring Drive Brief Schema</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleLoadDrivePreset('tier1_consortium')}
                        style={{ background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ Tier-1 Campus Drive
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadDrivePreset('fintech_blitz')}
                        style={{ background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        ⚡ FinTech Placement Blitz
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Drive Title & Name</label>
                      <input
                        type="text"
                        value={hiringDriveFormState.drive_title}
                        onChange={e => setHiringDriveFormState({ ...hiringDriveFormState, drive_title: e.target.value })}
                        placeholder="e.g. National Tech Consortium 2026 Drive"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Consortium Organizer / Placement Cell</label>
                      <input
                        type="text"
                        value={hiringDriveFormState.organizer}
                        onChange={e => setHiringDriveFormState({ ...hiringDriveFormState, organizer: e.target.value })}
                        placeholder="e.g. National Engineering Consortium"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Target Graduating Batch</label>
                      <input
                        type="text"
                        value={hiringDriveFormState.target_batch}
                        onChange={e => setHiringDriveFormState({ ...hiringDriveFormState, target_batch: e.target.value })}
                        placeholder="e.g. 2026 Batch (B.Tech / MCA)"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Intake Headcount Target</label>
                      <input
                        type="text"
                        value={hiringDriveFormState.target_headcount}
                        onChange={e => setHiringDriveFormState({ ...hiringDriveFormState, target_headcount: e.target.value })}
                        placeholder="e.g. 150+ Offers"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Participating Companies</label>
                      <input
                        type="text"
                        value={hiringDriveFormState.participating_companies}
                        onChange={e => setHiringDriveFormState({ ...hiringDriveFormState, participating_companies: e.target.value })}
                        placeholder="e.g. Atlassian, Razorpay, Swiggy"
                        style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '7px 10px', borderRadius: 6, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Round-by-Round Assessment Architecture</label>
                    <textarea
                      rows={3}
                      value={hiringDriveFormState.evaluation_rounds}
                      onChange={e => setHiringDriveFormState({ ...hiringDriveFormState, evaluation_rounds: e.target.value })}
                      placeholder="Outline rounds: Online Assessment -> Architecture Design -> Live SOCRATES IDE Execution"
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Benchmark IDE Deliverable Bar (Code Verification Standard)</label>
                    <textarea
                      rows={3}
                      value={hiringDriveFormState.benchmark_deliverables}
                      onChange={e => setHiringDriveFormState({ ...hiringDriveFormState, benchmark_deliverables: e.target.value })}
                      placeholder="What measurable code artifacts must execute in the IDE to clear the bar?"
                      style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono)' }}
                    />
                  </div>
                </div>
              )}

              {/* Submit & AI Indicator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tx-m)' }}>
                  <Sparkles size={14} color="#58a6ff" />
                  <span>Real LLM extraction parses skills, evidence quotes, and updates Requirement Matrix.</span>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: '#238636',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                >
                  <Sparkles size={16} /> Run AI Layered Extraction & Ingest Signal
                </button>
              </div>
            </form>
          </div>

          {/* Ingested Signals List */}
          <div style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Active Ingested Signals ({signals.length})</h3>
              <span style={{ fontSize: 11, color: 'var(--tx-m)' }}>Continuous Labour Radar</span>
            </div>

            {signals.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--tx-m)', padding: '40px 0', fontSize: 13 }}>
                No signals ingested yet. Select a signal type on the left and run AI extraction.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 600, overflowY: 'auto' }}>
              {signals.map(s => {
                let parsed = {};
                try {
                  parsed = JSON.parse(s.parsed_content || '{}');
                } catch (e) {}

                const typeColorMap = {
                  job_description: { bg: 'rgba(88,166,255,0.15)', text: '#58a6ff', label: 'Job Description' },
                  internship: { bg: 'rgba(188,140,255,0.15)', text: '#bc8cff', label: 'Internship' },
                  employer_form: { bg: 'rgba(63,185,80,0.15)', text: '#3fb950', label: 'Employer Form' },
                  expert_input: { bg: 'rgba(210,153,34,0.15)', text: '#d29922', label: 'Expert Input' },
                  hiring_drive: { bg: 'rgba(248,81,73,0.15)', text: '#f85149', label: 'Hiring Drive' }
                };
                const styleMeta = typeColorMap[s.source_type] || typeColorMap.job_description;
                const skillCount = parsed.extracted_skills?.length || 0;

                return (
                  <div key={s.id} style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, paddingRight: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{s.source_name}</div>
                        <div style={{ fontSize: 11, color: '#58a6ff', marginTop: 2 }}>{s.organization} • {s.role_title}</div>
                      </div>
                      <span style={{ background: styleMeta.bg, color: styleMeta.text, fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {styleMeta.label}
                      </span>
                    </div>

                    {parsed.ai_summary && (
                      <div style={{ fontSize: 11, color: '#3fb950', marginTop: 6, fontStyle: 'italic', background: 'rgba(63,185,80,0.06)', padding: '4px 8px', borderRadius: 4 }}>
                        ✨ AI Synthesis: {parsed.ai_summary}
                      </div>
                    )}

                    <p style={{ fontSize: 11, color: 'var(--tx-m)', margin: '8px 0 0', lineHeight: 1.4, maxHeight: 44, overflow: 'hidden' }}>
                      {s.raw_content.substring(0, 140)}...
                    </p>

                    <div style={{ fontSize: 10, color: 'var(--tx-2)', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6 }}>
                      <span>Collected: {s.collected_at ? s.collected_at.split(' ')[0] : 'N/A'}</span>
                      <span style={{ color: '#58a6ff', fontWeight: 600 }}>{skillCount} Competencies Extracted</span>
                      <span style={{ color: '#3fb950' }}>● {s.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: REQUIREMENT MATRIX & EXPERT REVIEW */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'matrix' && !loading && (
        <div>
          <div style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Multi-Signal Labour Requirement Matrix</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--tx-m)', fontSize: 12 }}>
                  Aggregates industry demand across multiple job descriptions, internships, employer forms and expert reviews. Individual signals are maintained separately — no opaque AI blackbox score.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--tx-m)' }}>
                    <th style={{ padding: '8px 10px' }}>Canonical Competency</th>
                    <th style={{ padding: '8px 10px' }}>Category</th>
                    <th style={{ padding: '8px 10px' }}>Role</th>
                    <th style={{ padding: '8px 10px' }}>Multi-Signal Demand</th>
                    <th style={{ padding: '8px 10px' }}>Proficiency</th>
                    <th style={{ padding: '8px 10px' }}>Source Evidence Quote</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    <th style={{ padding: '8px 10px' }}>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--tx-m)', fontSize: 13 }}>
                      No requirements in matrix yet. Ingest a JD signal in Tab 1 first.
                    </td></tr>
                  )}
                  {requirements.map(req => {
                    const totalSignals = (req.job_signal_count || 0) + (req.internship_signal_count || 0) + (req.employer_signal_count || 0) + (req.expert_signal_count || 0);
                    const isApproved = req.status === 'APPROVED';
                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--tx)' }}>
                          {req.skill_name}
                          <div style={{ fontSize: 10, color: 'var(--tx-2)', fontFamily: 'var(--mono)' }}>id: {req.skill_id}</div>
                        </td>
                        <td style={{ padding: '10px 10px', color: 'var(--tx-m)' }}>{req.skill_category}</td>
                        <td style={{ padding: '10px 10px', color: '#58a6ff' }}>{req.role_title}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <span title="Job Postings" style={{ background: 'rgba(88,166,255,0.15)', color: '#58a6ff', padding: '2px 5px', borderRadius: 4, fontSize: 10 }}>💼 {req.job_signal_count} JDs</span>
                            <span title="Internships" style={{ background: 'rgba(163,113,247,0.15)', color: '#bc8cff', padding: '2px 5px', borderRadius: 4, fontSize: 10 }}>🎓 {req.internship_signal_count} Intern</span>
                            <span title="Employer Forms" style={{ background: 'rgba(46,160,67,0.15)', color: '#3fb950', padding: '2px 5px', borderRadius: 4, fontSize: 10 }}>🏢 {req.employer_signal_count} Emp</span>
                            <span title="Expert Inputs" style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922', padding: '2px 5px', borderRadius: 4, fontSize: 10 }}>⭐ {req.expert_signal_count} Exp</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 10px', textTransform: 'capitalize' }}>{req.proficiency}</td>
                        <td style={{ padding: '10px 10px', color: 'var(--tx-m)', maxWidth: 220, fontSize: 11, fontStyle: 'italic' }}>
                          "{req.evidence_quote || 'Stated in job requirements'}"
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{
                            background: isApproved ? 'rgba(46,160,67,0.2)' : 'rgba(210,153,34,0.2)',
                            color: isApproved ? '#3fb950' : '#d29922',
                            border: isApproved ? '1px solid rgba(46,160,67,0.4)' : '1px solid rgba(210,153,34,0.4)',
                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700
                          }}>
                            {req.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 10px' }}>
                          <button
                            onClick={() => handleOpenReview(req)}
                            style={{
                              background: 'var(--bg-o)', border: '1px solid var(--border)',
                              color: '#58a6ff', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600
                            }}
                          >
                            Review / Validate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: STUDENT READINESS & GAP DECISION ENGINE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'readiness' && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
          {/* Left Column: Student Competency Profile */}
          <div style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>🎓 Student Evidence Profile</h3>
              {isReviewer && <select
                value={selectedStudentId}
                onChange={e => { setSelectedStudentId(e.target.value); loadStudent(e.target.value); }}
                style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}
              >
                {studentOptions.map(student => <option key={student.id} value={student.id}>{student.name} ({student.skill_level || 'student'})</option>)}
              </select>}
            </div>

            {studentEvidence && (
              <div>
                <div style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{studentEvidence.student?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx-m)', marginTop: 2 }}>{studentEvidence.student?.email} • Skill Level: {studentEvidence.student?.skill_level}</div>
                  <div style={{ fontSize: 11, color: '#58a6ff', marginTop: 4 }}>
                    Base Projects: {studentEvidence.projects?.map(p => p.title).join(', ') || 'None'}
                  </div>
                </div>

                <h4 style={{ margin: '12px 0 8px', fontSize: 13, color: 'var(--tx-m)' }}>Competency States (Multi-Tier Evidence Hierarchy)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {studentEvidence.competencies?.map(cp => (
                    <div key={cp.id} style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{cp.skill_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--tx-2)', marginTop: 2 }}>
                          {cp.status === 'VERIFIED' ? `Verified: ${cp.verified_source}` : (cp.status === 'ASSESSED' ? `Assessed: ${cp.assessed_source}` : `Claimed: ${cp.claimed_source}`)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {renderStatusBadge(cp.status)}
                        {isReviewer && <button
                          onClick={() => handleEvaluateGap(cp.skill_id)}
                          style={{ background: 'rgba(88,166,255,0.15)', border: '1px solid rgba(88,166,255,0.3)', color: '#58a6ff', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                        >
                          Run Gap Check
                        </button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Gap Decision Engine & Project Upgrader */}
          <div style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>⚡ Intelligent Gap Decision & Project Upgrader</h3>

            {!gapResult && (
              <div style={{ background: 'var(--bg-o)', border: '1px dashed var(--border)', borderRadius: 8, padding: 30, textAlign: 'center', color: 'var(--tx-m)', fontSize: 13 }}>
                <HelpCircle size={28} style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                Select any competency on the left (e.g. <b>Docker Containerization</b>) and click <b>"Run Gap Check"</b> to execute the decision tree.
              </div>
            )}

            {gapResult && (
              <div>
                {/* Decision Result Card */}
                <div style={{
                  background: gapResult.decision === 'UPGRADE_EXISTING_PROJECT' ? 'rgba(88,166,255,0.1)' : (gapResult.decision === 'NO_ACTION' ? 'rgba(46,160,67,0.1)' : 'rgba(210,153,34,0.1)'),
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--tx-m)' }}>Gap Decision Tree Result</span>
                    <span style={{
                      fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 4,
                      background: gapResult.decision === 'UPGRADE_EXISTING_PROJECT' ? '#1f6feb' : (gapResult.decision === 'NO_ACTION' ? '#238636' : '#9e6a03'),
                      color: '#fff'
                    }}>
                      {gapResult.decision}
                    </span>
                  </div>
                  <h4 style={{ margin: '10px 0 4px', fontSize: 15 }}>Target Competency: {gapResult.skill_name}</h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tx-m)', lineHeight: 1.4 }}>{gapResult.reason}</p>
                </div>

                {/* If Upgrade Existing Project, display generated milestone & tasks */}
                {upgradePlan && (
                  <div style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 12, color: '#58a6ff', fontWeight: 600, textTransform: 'uppercase' }}>
                      Proposed Milestone for: {gapResult.target_project?.title}
                    </div>
                    <h4 style={{ margin: '6px 0 4px', fontSize: 14 }}>{upgradePlan.milestone?.title}</h4>
                    <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--tx-m)' }}>{upgradePlan.milestone?.description}</p>

                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Tasks to Inject into Project:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                      {upgradePlan.tasks?.map((t, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-d)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>
                          <div style={{ fontWeight: 600, color: 'var(--tx)' }}>Task {t.order || (idx + 1)}: {t.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--tx-m)', marginTop: 2 }}>{t.description}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      {isReviewer && <button
                        onClick={handleApplyUpgrade}
                        style={{ background: '#238636', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Apply Upgrade to Project
                      </button>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: COMPETENCY EVIDENCE STORE */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'evidence' && !loading && (
        <div style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>🛡️ Verified Competency Evidence Store</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--tx-m)', fontSize: 12 }}>
                Immutable audit trail of verified competency demonstrations. Every entry contains source code paths, automated test outputs, QA reviews, and mentor verifications.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {evidenceRecords.map(ev => (
              <div key={ev.id} style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{ev.skill_name}</div>
                    <div style={{ fontSize: 11, color: '#58a6ff', marginTop: 2 }}>Learner: {ev.learner_name} • Role: {ev.role_title}</div>
                  </div>
                  <span style={{ background: 'rgba(46,160,67,0.2)', color: '#3fb950', border: '1px solid rgba(46,160,67,0.4)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                    VERIFIED
                  </span>
                </div>

                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--tx-m)', background: 'var(--bg-d)', padding: 8, borderRadius: 6, fontFamily: 'var(--mono)' }}>
                  <div>Location: {ev.evidence_location || 'workspace/repo'}</div>
                  <div>Type: {ev.evidence_type}</div>
                  <div>Project: {ev.project_title || 'REST API Microservice'}</div>
                  {ev.evidence_payload && (
                    <div style={{ marginTop: 4, color: 'var(--tx)' }}>
                      Payload: {JSON.stringify(ev.evidence_payload).substring(0, 100)}...
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 10, color: 'var(--tx-2)', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Verified By: {ev.reviewer_name || 'Prof. Sarah Williams (Mentor)'}</span>
                  <span>Recorded: {ev.created_at?.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: EMPLOYER VIEW & CLOSED-LOOP FEEDBACK */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'employer' && canViewCandidates && !loading && (
        <div style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>💼 Employer Candidate Explorer & Outcome Feedback</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--tx-m)', fontSize: 12 }}>
                Employers inspect evidence-backed candidate competency profiles, verify test logs/projects, and submit hiring outcome feedback that automatically updates labour signals.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {candidates.map(c => (
              <div key={c.student_id} style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 8, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)' }}>{c.student_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--tx-m)', marginTop: 2 }}>{c.email} • Level: {c.skill_level}</div>
                  </div>
                  <button
                    onClick={() => handleOpenEmployerFeedback(c)}
                    style={{ background: '#1f6feb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <MessageSquare size={13} /> Submit Placement Outcome Feedback
                  </button>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx-m)', marginBottom: 6 }}>Verified Competencies & Evidence:</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {c.competencies?.map(cp => (
                      <div key={cp.id} style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600 }}>{cp.skill_name}</span>
                        {renderStatusBadge(cp.status)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB 6: INSTITUTION ANALYTICS */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'institution' && !loading && curriculumReport && (
        <div style={{ background: 'var(--bg-d)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>🏛️ Institution Curriculum Gap Analytics</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--tx-m)', fontSize: 12 }}>
                Identifies curriculum review candidate topics by contrasting real-world employer demand with current student competency coverage.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {curriculumReport.curriculum_reviews?.map(item => {
              const isLowCoverage = item.student_coverage_pct < 40;
              return (
                <div key={item.skill_id} style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.skill_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx-m)', marginTop: 2 }}>Category: {item.category}</div>
                    </div>
                    <span style={{
                      background: isLowCoverage ? 'rgba(248,81,73,0.15)' : 'rgba(46,160,67,0.15)',
                      color: isLowCoverage ? '#f85149' : '#3fb950',
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700
                    }}>
                      {item.recommendation_type}
                    </span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--tx-m)', marginBottom: 4 }}>
                      <span>Student Coverage: {item.student_coverage_pct}%</span>
                      <span>Market Demand: {item.market_signals} signals</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--bg-d)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, item.student_coverage_pct)}%`, height: '100%', background: isLowCoverage ? '#f85149' : '#2ea043' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EXPERT REQUIREMENT REVIEW */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {reviewModalOpen && selectedReq && (
        <Modal title={`Expert Review: ${selectedReq.skill_name}`} onClose={() => setReviewModalOpen(false)}>
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Review Decision</label>
              <select
                value={reviewForm.decision}
                onChange={e => setReviewForm({ ...reviewForm, decision: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px', borderRadius: 6, fontSize: 12 }}
              >
                <option value="APPROVE">APPROVE (Validated Requirement)</option>
                <option value="MODIFY">MODIFY (Validate with Modifications)</option>
                <option value="REQUEST_MORE_EVIDENCE">REQUEST_MORE_EVIDENCE (Need more employer signals)</option>
                <option value="REJECT">REJECT (Declining / Not relevant for role)</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Proficiency Standard</label>
              <select
                value={reviewForm.suggested_proficiency}
                onChange={e => setReviewForm({ ...reviewForm, suggested_proficiency: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px', borderRadius: 6, fontSize: 12 }}
              >
                <option value="beginner">Beginner (Foundational comprehension)</option>
                <option value="intermediate">Intermediate (Autonomous production implementation)</option>
                <option value="advanced">Advanced (Architecture, scaling, diagnostics)</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Expert Comments & Rationale</label>
              <textarea
                rows={4}
                value={reviewForm.comments}
                onChange={e => setReviewForm({ ...reviewForm, comments: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px', borderRadius: 6, fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setReviewModalOpen(false)}
                style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx-m)', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                style={{ background: '#238636', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Submit Expert Review
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EMPLOYER OUTCOME FEEDBACK */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {feedbackModalOpen && selectedCandidate && (
        <Modal title={`Employer Placement Feedback: ${selectedCandidate.student_name}`} onClose={() => setFeedbackModalOpen(false)}>
          <div style={{ padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Hiring Outcome Status</label>
              <select
                value={feedbackForm.hiring_status}
                onChange={e => setFeedbackForm({ ...feedbackForm, hiring_status: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px', borderRadius: 6, fontSize: 12 }}
              >
                <option value="hired">Hired (Full-time / Return Offer)</option>
                <option value="internship_completed">Internship Completed Successfully</option>
                <option value="interviewed">Interviewed (Advanced to Final Round)</option>
                <option value="rejected">Rejected (Identified Specific Skill Gap)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Technical Readiness (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedbackForm.readiness_rating}
                  onChange={e => setFeedbackForm({ ...feedbackForm, readiness_rating: Number(e.target.value) })}
                  style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px', borderRadius: 6, fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Communication & Collaboration (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={feedbackForm.communication_rating}
                  onChange={e => setFeedbackForm({ ...feedbackForm, communication_rating: Number(e.target.value) })}
                  style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px', borderRadius: 6, fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--tx-m)', display: 'block', marginBottom: 4 }}>Employer Notes & Feedback</label>
              <textarea
                rows={3}
                value={feedbackForm.gap_notes}
                onChange={e => setFeedbackForm({ ...feedbackForm, gap_notes: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx)', padding: '8px', borderRadius: 6, fontSize: 12 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setFeedbackModalOpen(false)}
                style={{ background: 'var(--bg-o)', border: '1px solid var(--border)', color: 'var(--tx-m)', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEmployerFeedback}
                style={{ background: '#238636', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Submit Feedback (Close Loop)
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
