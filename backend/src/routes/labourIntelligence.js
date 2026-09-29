/**
 * labourIntelligence.js
 * 
 * Express Router for Labour-Market Intelligence, Competency Alignment,
 * Gap Decision Engine, Project Upgrader, Evidence Store, and Closed-Loop Employer Feedback.
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const {
  normalizeSkill,
  cleanAndSegmentText,
  extractDeterministicRequirements,
  extractWithLLMFallback,
  processAndIngestSignal
} = require('../engines/labourIntelligenceEngine');

const {
  getStudentEvidence,
  evaluateCompetencyGap,
  generateProjectUpgradePlan,
  applyProjectUpgrade,
  recordVerifiedEvidence,
  recordEmployerFeedback
} = require('../engines/competencyGapEngine');

const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => {
  console.error('[Labour API Error]', e);
  res.status(500).json({ error: e.message });
});

// ══════════════════════════════════════════════════════════════════════
// 1. INDUSTRY SIGNAL INGESTION & PROCESSING
// ══════════════════════════════════════════════════════════════════════

// Upload / Ingest a raw signal (JD, Internship, Employer Form, Expert Input)
router.post('/signals/ingest', wrap(async (req, res) => {
  const {
    source_type,
    source_name,
    source_url,
    organization,
    role_title,
    location,
    published_at,
    raw_content
  } = req.body;

  if (!raw_content || !source_name) {
    return res.status(400).json({ error: 'source_name and raw_content are required' });
  }

  // Use authenticated user ID or NULL (not 'anon_citizen' which violates FK constraint)
  const userId = req.user?.id || null;

  const result = await processAndIngestSignal({
    source_type: source_type || 'job_description',
    source_name,
    source_url: source_url || '',
    organization: organization || 'Industry Partner',
    role_title: role_title || 'Software Engineer',
    location: location || 'Remote Eligible',
    published_at: published_at || new Date().toISOString().split('T')[0],
    raw_content,
    user_id: userId
  });

  res.json({
    success: true,
    message: 'Signal successfully parsed and ingested into Requirement Matrix.',
    data: result
  });
}));

// List all industry signals
router.get('/signals', wrap(async (req, res) => {
  const signals = db.prepare(`
    SELECT s.*, u.name as created_by_name
    FROM industry_signals s
    LEFT JOIN users u ON s.created_by = u.id
    ORDER BY s.created_at DESC
  `).all();

  res.json({ signals });
}));

// Get specific industry signal by ID with parsed sections
router.get('/signals/:id', wrap(async (req, res) => {
  const signal = db.prepare('SELECT * FROM industry_signals WHERE id = ?').get(req.params.id);
  if (!signal) return res.status(404).json({ error: 'Signal not found' });

  // Associated requirements in matrix
  const requirements = db.prepare(`
    SELECT r.*, s.name as skill_name, s.category as skill_category
    FROM labour_requirements r
    JOIN skills_ontology s ON r.skill_id = s.id
    WHERE r.signal_id = ?
  `).all(req.params.id);

  res.json({ signal, requirements });
}));

// ══════════════════════════════════════════════════════════════════════
// 2. CANONICAL ONTOLOGY (ROLES & SKILLS)
// ══════════════════════════════════════════════════════════════════════

router.get('/ontology/skills', wrap(async (req, res) => {
  const skills = db.prepare('SELECT * FROM skills_ontology ORDER BY category, name').all();
  const aliases = db.prepare('SELECT * FROM skill_aliases').all();
  const relationships = db.prepare('SELECT * FROM skill_relationships').all();

  const skillsWithDetails = skills.map(s => ({
    ...s,
    proficiency_definitions: JSON.parse(s.proficiency_definitions || '{}'),
    aliases: aliases.filter(a => a.skill_id === s.id).map(a => a.alias),
    sub_skills: relationships.filter(r => r.parent_skill_id === s.id).map(r => r.child_skill_id)
  }));

  res.json({ skills: skillsWithDetails });
}));

router.get('/ontology/roles', wrap(async (req, res) => {
  const roles = db.prepare('SELECT * FROM roles_ontology ORDER BY category, title').all();
  res.json({ roles });
}));

// Normalize arbitrary raw string against ontology
router.post('/ontology/normalize', wrap(async (req, res) => {
  const { raw_text } = req.body;
  const normalized = normalizeSkill(raw_text);
  res.json({ raw_text, normalized });
}));

// ══════════════════════════════════════════════════════════════════════
// 3. REQUIREMENT MATRIX & HUMAN VALIDATION
// ══════════════════════════════════════════════════════════════════════

// List requirements matrix with demand breakdown
router.get('/requirements', wrap(async (req, res) => {
  const roleId = req.query.role_id;
  const status = req.query.status;

  let query = `
    SELECT r.*, s.name as skill_name, s.category as skill_category, ro.title as role_title
    FROM labour_requirements r
    JOIN skills_ontology s ON r.skill_id = s.id
    JOIN roles_ontology ro ON r.role_id = ro.id
    WHERE 1=1
  `;
  const params = [];

  if (roleId) {
    query += ' AND r.role_id = ?';
    params.push(roleId);
  }
  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }

  query += ' ORDER BY (r.job_signal_count + r.internship_signal_count + r.employer_signal_count + r.expert_signal_count) DESC, r.trend_score DESC';

  const requirements = db.prepare(query).all(...params);
  res.json({ requirements });
}));

// Submit human expert review on a requirement (APPROVE, MODIFY, REJECT, REQUEST_MORE_EVIDENCE)
router.post('/requirements/:id/review', wrap(async (req, res) => {
  const requirementId = req.params.id;
  const {
    decision,
    comments,
    suggested_proficiency,
    suggested_learning_outcomes,
    suggested_evidence_requirements,
    suggested_project_context
  } = req.body;

  if (!decision) return res.status(400).json({ error: 'decision is required' });

  const reviewerId = req.user?.id || 'demo_expert';
  const reviewerRole = req.user?.role || 'expert';

  const reviewId = 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  db.prepare(`
    INSERT INTO requirement_reviews (
      id, requirement_id, reviewer_id, reviewer_role, decision, comments,
      suggested_proficiency, suggested_learning_outcomes, suggested_evidence_requirements,
      suggested_project_context
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reviewId,
    requirementId,
    reviewerId,
    reviewerRole,
    decision,
    comments || '',
    suggested_proficiency || 'intermediate',
    JSON.stringify(suggested_learning_outcomes || []),
    JSON.stringify(suggested_evidence_requirements || []),
    suggested_project_context || ''
  );

  // Update requirement status based on human decision
  let newStatus = 'REVIEW_REQUIRED';
  if (decision === 'APPROVE') newStatus = 'APPROVED';
  else if (decision === 'MODIFY') newStatus = 'EXPERT_VALIDATED';
  else if (decision === 'REJECT') newStatus = 'REJECTED';
  else if (decision === 'REQUEST_MORE_EVIDENCE') newStatus = 'REVIEW_REQUIRED';

  db.prepare(`
    UPDATE labour_requirements
    SET 
      status = ?,
      expert_signal_count = expert_signal_count + 1,
      proficiency = COALESCE(?, proficiency),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, suggested_proficiency, requirementId);

  res.json({
    success: true,
    review_id: reviewId,
    requirement_id: requirementId,
    new_status: newStatus,
    message: `Requirement successfully reviewed with decision: ${decision}`
  });
}));

// ══════════════════════════════════════════════════════════════════════
// 4. STUDENT READINESS & COMPETENCY GAP ENGINE
// ══════════════════════════════════════════════════════════════════════

// Get comprehensive student evidence and profiles
router.get('/students/:id/evidence', wrap(async (req, res) => {
  const studentId = req.params.id;
  const evidence = getStudentEvidence(studentId);
  if (!evidence) return res.status(404).json({ error: 'Student not found' });
  res.json(evidence);
}));

// Evaluate gap for a student against a target competency
router.post('/students/:id/gap-analysis', wrap(async (req, res) => {
  const studentId = req.params.id;
  const { skill_id, role_id } = req.body;

  if (!skill_id) return res.status(400).json({ error: 'skill_id is required' });

  const evaluation = evaluateCompetencyGap(studentId, skill_id, role_id || 'software-engineering-intern');
  res.json(evaluation);
}));

// Generate upgrade plan for an existing project
router.post('/projects/:id/upgrade-plan', wrap(async (req, res) => {
  const projectId = req.params.id;
  const { target_skill_id, target_requirement_id } = req.body;

  if (!target_skill_id) return res.status(400).json({ error: 'target_skill_id is required' });

  const upgradePlan = await generateProjectUpgradePlan(projectId, target_skill_id, target_requirement_id);
  res.json({ upgradePlan });
}));

// Apply upgrade plan to existing project (attaches milestone & tasks to database)
router.post('/projects/:id/apply-upgrade', wrap(async (req, res) => {
  const projectId = req.params.id;
  const { upgrade_plan, target_requirement_id } = req.body;
  const studentId = req.user?.id || req.body.student_id || 'demo_student';

  if (!upgrade_plan || !upgrade_plan.milestone) {
    return res.status(400).json({ error: 'Valid upgrade_plan is required' });
  }

  const result = applyProjectUpgrade(studentId, projectId, upgrade_plan, target_requirement_id);
  res.json({
    success: true,
    message: 'Project successfully upgraded with target competency milestone.',
    result
  });
}));

// ══════════════════════════════════════════════════════════════════════
// 5. COMPETENCY EVIDENCE STORE & VERIFICATION
// ══════════════════════════════════════════════════════════════════════

// List all verified evidence records
router.get('/evidence', wrap(async (req, res) => {
  const learnerId = req.query.learner_id;
  const skillId = req.query.skill_id;

  let query = `
    SELECT e.*, s.name as skill_name, u.name as learner_name, r.title as role_title, p.title as project_title, rev.name as reviewer_name
    FROM competency_evidence_store e
    JOIN skills_ontology s ON e.skill_id = s.id
    JOIN users u ON e.learner_id = u.id
    LEFT JOIN roles_ontology r ON e.role_id = r.id
    LEFT JOIN projects p ON e.project_id = p.id
    LEFT JOIN users rev ON e.reviewer_id = rev.id
    WHERE 1=1
  `;
  const params = [];

  if (learnerId) {
    query += ' AND e.learner_id = ?';
    params.push(learnerId);
  }
  if (skillId) {
    query += ' AND e.skill_id = ?';
    params.push(skillId);
  }

  query += ' ORDER BY e.created_at DESC';

  const evidence = db.prepare(query).all(...params).map(e => ({
    ...e,
    evidence_payload: JSON.parse(e.evidence_payload || '{}')
  }));

  res.json({ evidence });
}));

// Record verified competency evidence (called upon I.D.E. execution / mentor QA)
router.post('/evidence/record', wrap(async (req, res) => {
  const {
    learner_id,
    skill_id,
    role_id,
    project_id,
    milestone_id,
    task_id,
    assessment_id,
    evidence_type,
    evidence_location,
    evidence_payload,
    reviewer_id
  } = req.body;

  if (!learner_id || !skill_id) {
    return res.status(400).json({ error: 'learner_id and skill_id are required' });
  }

  const result = recordVerifiedEvidence({
    learner_id,
    skill_id,
    role_id: role_id || 'software-engineering-intern',
    project_id: project_id || null,
    milestone_id: milestone_id || null,
    task_id: task_id || null,
    assessment_id: assessment_id || null,
    evidence_type: evidence_type || 'ide_validation',
    evidence_location: evidence_location || 'workspace/repo',
    evidence_payload: evidence_payload || {},
    reviewer_id: reviewer_id || req.user?.id || 'demo_mentor'
  });

  res.json({
    success: true,
    message: 'Competency evidence verified and recorded.',
    result
  });
}));

// ══════════════════════════════════════════════════════════════════════
// 6. EMPLOYER CANDIDATE VIEW & OUTCOME FEEDBACK LOOP
// ══════════════════════════════════════════════════════════════════════

// Employer Candidate Explorer: returns candidates with verified competency evidence
router.get('/employer/candidates', wrap(async (req, res) => {
  const { role_id, required_skills } = req.query;

  const targetRole = role_id || 'software-engineering-intern';

  // Find students who have competency profiles
  const students = db.prepare(`
    SELECT id, name, email, skill_level, tech_stack
    FROM users
    WHERE role = 'student'
  `).all();

  const candidateCards = students.map(st => {
    const profiles = db.prepare(`
      SELECT cp.*, s.name as skill_name, s.category as skill_category
      FROM student_competency_profiles cp
      JOIN skills_ontology s ON cp.skill_id = s.id
      WHERE cp.student_id = ?
    `).all(st.id);

    const verifiedRecords = db.prepare(`
      SELECT e.*, s.name as skill_name, p.title as project_title, rev.name as reviewer_name
      FROM competency_evidence_store e
      JOIN skills_ontology s ON e.skill_id = s.id
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN users rev ON e.reviewer_id = rev.id
      WHERE e.learner_id = ?
    `).all(st.id).map(r => ({
      ...r,
      evidence_payload: JSON.parse(r.evidence_payload || '{}')
    }));

    return {
      student_id: st.id,
      student_name: st.name,
      email: st.email,
      skill_level: st.skill_level,
      competencies: profiles,
      verified_evidence: verifiedRecords,
      total_verified_count: profiles.filter(p => p.status === 'VERIFIED').length
    };
  });

  res.json({
    target_role: targetRole,
    candidates: candidateCards
  });
}));

// Submit Employer Outcome / Hiring Feedback -> closes the continuous loop
router.post('/employer/feedback', wrap(async (req, res) => {
  const {
    candidate_id,
    role_id,
    hiring_status,
    competency_feedback,
    gap_notes,
    readiness_rating,
    communication_rating
  } = req.body;

  const employerId = req.user?.id || 'demo_employer';

  const result = recordEmployerFeedback({
    employer_id: employerId,
    candidate_id: candidate_id || 'demo_student',
    role_id: role_id || 'software-engineering-intern',
    hiring_status: hiring_status || 'hired',
    competency_feedback: competency_feedback || {},
    gap_notes: gap_notes || 'Candidate demonstrated practical competency in Docker and test engineering.',
    readiness_rating: readiness_rating || 5,
    communication_rating: communication_rating || 4
  });

  res.json({
    success: true,
    result
  });
}));

// ══════════════════════════════════════════════════════════════════════
// 7. INSTITUTION ANALYTICS & CURRICULUM REVIEW CANDIDATES
// ══════════════════════════════════════════════════════════════════════

router.get('/institution/curriculum-analysis', wrap(async (req, res) => {
  // Aggregate demand across market requirements
  const highDemandSkills = db.prepare(`
    SELECT r.skill_id, s.name as skill_name, s.category as skill_category,
           (r.job_signal_count + r.internship_signal_count + r.employer_signal_count + r.expert_signal_count) as total_signals,
           r.trend_score, r.status
    FROM labour_requirements r
    JOIN skills_ontology s ON r.skill_id = s.id
    WHERE r.status = 'APPROVED'
    ORDER BY total_signals DESC
  `).all();

  // Student coverage stats
  const studentTotal = db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('student').c || 1;

  const curriculumGaps = highDemandSkills.map(skill => {
    const verifiedCount = db.prepare(`
      SELECT COUNT(DISTINCT student_id) as c
      FROM student_competency_profiles
      WHERE skill_id = ? AND status = 'VERIFIED'
    `).get(skill.skill_id).c || 0;

    const coveragePct = Math.round((verifiedCount / studentTotal) * 100);

    let recommendation = 'Adequate Coverage';
    if (coveragePct < 30) recommendation = 'Curriculum Review Candidate';
    else if (coveragePct < 60) recommendation = 'Practical Project Enhancement Recommended';

    return {
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      category: skill.category,
      market_signals: skill.total_signals,
      student_coverage_pct: coveragePct,
      verified_students: verifiedCount,
      total_students: studentTotal,
      recommendation_type: recommendation
    };
  });

  res.json({
    total_students: studentTotal,
    curriculum_reviews: curriculumGaps
  });
}));

module.exports = router;
