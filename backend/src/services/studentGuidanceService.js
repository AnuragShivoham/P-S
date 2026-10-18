/**
 * studentGuidanceService.js
 * 
 * Orchestration service for Labour Intelligence: Zero-Input Student Gap Report & I.D.E. Guidance.
 * 
 * Responsibilities:
 * 1. Resolves target role from roles_ontology (with safe default: software-engineering-intern).
 * 2. Retrieves canonical market requirements independently of student data.
 * 3. Inspects student projects, competency records, and verified evidence without assuming incompetence.
 * 4. Generates a deterministic role-level report with clear provenance.
 * 5. Represents unassessed skills as UNKNOWN / NOT_ASSESSED (no synthetic competency claims or fake scores).
 * 6. Recommends starter or upgrade practical projects in the SOCRATES browser I.D.E.
 */

const db = require('../db/database');
const { getStudentEvidence, evaluateCompetencyGap } = require('../engines/competencyGapEngine');

// In-memory cache for role guidance (5 minute TTL, keyed by studentId:roleId)
const guidanceCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedGuidance(studentId, roleId) {
  const key = `${studentId}:${roleId}`;
  const entry = guidanceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    guidanceCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedGuidance(studentId, roleId, data) {
  const key = `${studentId}:${roleId}`;
  guidanceCache.set(key, { data, timestamp: Date.now() });
}

function invalidateGuidanceCache(studentId) {
  for (const [k] of guidanceCache.entries()) {
    if (k.startsWith(`${studentId}:`)) {
      guidanceCache.delete(k);
    }
  }
}

/**
 * Generates the role-level guidance report for a student
 * @param {string} studentId
 * @param {string} roleId
 * @returns {object} Standardized Guidance Report
 */
async function generateStudentRoleGuidance(studentId, roleId = 'software-engineering-intern') {
  // Check cache first
  const cached = getCachedGuidance(studentId, roleId);
  if (cached) {
    return cached;
  }

  // 1. Resolve Target Role
  let targetRole = db.prepare('SELECT * FROM roles_ontology WHERE id = ?').get(roleId);
  let selectionType = 'selected';
  if (!targetRole) {
    targetRole = db.prepare('SELECT * FROM roles_ontology WHERE id = "software-engineering-intern"').get();
    selectionType = 'default';
  }
  if (!targetRole) {
    // Ultimate fallback if ontology table is empty
    targetRole = {
      id: 'software-engineering-intern',
      title: 'Software Engineering Intern',
      category: 'Engineering',
      description: 'Foundational software engineering role focused on writing tested code and shipping services.'
    };
    selectionType = 'default';
  }

  // 2. Load Market Requirements for the role
  const rawRequirements = db.prepare(`
    SELECT r.*, s.name as skill_name, s.category as skill_category, s.description as skill_description
    FROM labour_requirements r
    JOIN skills_ontology s ON r.skill_id = s.id
    WHERE r.role_id = ? AND r.status IN ('APPROVED', 'EXPERT_VALIDATED', 'OBSERVED', 'EMERGING')
    ORDER BY (r.job_signal_count + r.internship_signal_count + r.employer_signal_count + r.expert_signal_count) DESC, r.confidence DESC
  `).all(targetRole.id);

  let marketStatus = 'AVAILABLE';
  let marketRequirements = rawRequirements;

  // Fallback to general ontology template if no specific requirements exist for this role
  if (marketRequirements.length === 0) {
    marketStatus = 'GENERAL_TEMPLATE';
    const fallbackSkills = db.prepare(`
      SELECT s.id as skill_id, s.name as skill_name, s.category as skill_category, s.description as skill_description
      FROM skills_ontology s
      WHERE s.id IN ('programming', 'rest-api', 'testing', 'database-design', 'docker', 'oop', 'dsa')
      ORDER BY s.category, s.name
    `).all();

    marketRequirements = fallbackSkills.map(s => ({
      id: `tmpl_${s.skill_id}`,
      role_id: targetRole.id,
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      skill_category: s.skill_category,
      skill_description: s.skill_description,
      requirement_type: 'required',
      proficiency: 'intermediate',
      source_reference: 'SOCRATES General Engineering Core Template',
      evidence_quote: 'Foundational competency baseline for software engineering roles.',
      confidence: 0.90,
      status: 'OBSERVED',
      job_signal_count: 10,
      trend_score: 0.70
    }));
  }

  // Count active signals for market data freshness indicator
  const signalCountRow = db.prepare(`
    SELECT COUNT(*) as c FROM industry_signals 
    WHERE role_title LIKE ? OR raw_content LIKE ?
  `).get(`%${targetRole.title}%`, `%${targetRole.id}%`);
  const sourceCount = (signalCountRow?.c || 0) + marketRequirements.reduce((acc, r) => acc + (r.job_signal_count || 0), 0);

  // 3. Load Student Evidence
  const studentEvidence = getStudentEvidence(studentId) || {
    student: null,
    projects: [],
    competencies: [],
    evidenceRecords: [],
    upgrades: []
  };

  const studentProjects = studentEvidence.projects || [];
  const studentCompetencies = studentEvidence.competencies || [];
  const verifiedEvidenceRecords = studentEvidence.evidenceRecords?.filter(e => e.status === 'VERIFIED') || [];

  // 4. Determine Profile State
  let profileState = 'NO_EVIDENCE';
  if (verifiedEvidenceRecords.length > 0) {
    profileState = 'VERIFIED_EVIDENCE';
  } else if (studentCompetencies.length > 0 || studentProjects.length > 0) {
    profileState = 'PARTIAL_EVIDENCE';
  }

  // 5. Calculate Readiness (Strictly unassessed if no evidence!)
  let readiness;
  if (profileState === 'NO_EVIDENCE') {
    readiness = {
      score: null, // Critical: do NOT return 0 or 50
      status: 'NOT_ASSESSED',
      reason: 'Insufficient verified student evidence. Complete I.D.E. projects or verify assessments to establish personal readiness.'
    };
  } else if (profileState === 'PARTIAL_EVIDENCE') {
    readiness = {
      score: null,
      status: 'IN_PROGRESS',
      reason: 'Projects or claimed skills exist, but formal evidence verification is pending.'
    };
  } else {
    const verifiedSkillIds = new Set(verifiedEvidenceRecords.map(e => e.skill_id));
    const matchedCount = marketRequirements.filter(r => verifiedSkillIds.has(r.skill_id)).length;
    const totalReqs = marketRequirements.length || 1;
    const computedScore = Math.min(100, Math.round((matchedCount / totalReqs) * 100));
    readiness = {
      score: computedScore,
      status: computedScore >= 80 ? 'READY' : 'DEVELOPING',
      reason: `${matchedCount} of ${totalReqs} target competencies verified with proof artifacts.`
    };
  }

  // 6. Map Competency Requirements with Evidence State
  const verifiedMap = new Map();
  verifiedEvidenceRecords.forEach(e => verifiedMap.set(e.skill_id, e));

  const profileMap = new Map();
  studentCompetencies.forEach(c => profileMap.set(c.skill_id, c));

  const competencies = marketRequirements.map(req => {
    const verifiedRecord = verifiedMap.get(req.skill_id);
    const profileRecord = profileMap.get(req.skill_id);

    let evidenceState = 'NONE';
    let gapStatus = 'UNKNOWN';
    let recommendedAction = 'BUILD_AND_VALIDATE_PROJECT';

    if (verifiedRecord) {
      evidenceState = 'VERIFIED';
      gapStatus = 'VERIFIED';
      recommendedAction = 'COMPETENCY_VERIFIED';
    } else if (profileRecord) {
      evidenceState = profileRecord.status || 'CLAIMED';
      gapStatus = 'IN_PROGRESS';
      recommendedAction = 'VERIFY_EVIDENCE_IN_PROJECT';
    } else {
      evidenceState = 'NONE';
      gapStatus = 'UNKNOWN';
      recommendedAction = 'BUILD_AND_VALIDATE_PROJECT';
    }

    return {
      skill_id: req.skill_id,
      skill_name: req.skill_name || req.skill_id,
      category: req.skill_category || 'Core Engineering',
      required_level: req.proficiency || 'intermediate',
      evidence_state: evidenceState,
      gap_status: gapStatus,
      priority: req.requirement_type === 'required' ? 'HIGH' : 'MEDIUM',
      recommended_action: recommendedAction,
      description: req.skill_description || req.evidence_quote || `Demonstrate practical competency in ${req.skill_name || req.skill_id}.`,
      job_signal_count: req.job_signal_count || 1,
      trend_score: req.trend_score || 0.5,
      source_reference: req.source_reference || 'Industry Hiring Signals'
    };
  });

  // 7. Generate Roadmap (4 standard progressive phases)
  const roadmap = [
    {
      order: 1,
      phase: 'LEARN',
      title: '1. Learn the fundamentals',
      deliverable: 'Understand core algorithmic logic, syntax, and computational thinking.',
      validation: 'Pass automated test suites and solve edge-case challenges in the IDE terminal.',
      recommended_skills: competencies.filter(c => ['programming', 'oop', 'dsa'].includes(c.skill_id)).map(c => c.skill_name)
    },
    {
      order: 2,
      phase: 'BUILD',
      title: '2. Build a practical project',
      deliverable: 'Implement a modular REST API or fullstack application with database persistence.',
      validation: 'Demonstrate functional endpoints, error boundaries, and robust data schema modeling.',
      recommended_skills: competencies.filter(c => ['rest-api', 'database-design', 'software-engineering'].includes(c.skill_id)).map(c => c.skill_name)
    },
    {
      order: 3,
      phase: 'VALIDATE',
      title: '3. Validate evidence & containerization',
      deliverable: 'Containerize application with Dockerfile, automated test suite, and telemetry logging.',
      validation: 'Submit working repository artifacts to SOCRATES Competency Evidence Store.',
      recommended_skills: competencies.filter(c => ['docker', 'testing', 'observability', 'monitoring'].includes(c.skill_id)).map(c => c.skill_name)
    },
    {
      order: 4,
      phase: 'REASSESS',
      title: '4. Reassess target readiness',
      deliverable: 'Updated competency profile reflecting verified evidence and real hiring signals.',
      validation: 'Review verified report with institutional faculty, mentors, or potential employers.',
      recommended_skills: ['Role-level alignment and target readiness confirmation']
    }
  ];

  // 8. Determine Project Action (Upgrade existing vs Create new)
  const recommendedProjects = [];
  if (studentProjects.length > 0) {
    const candidateProject = studentProjects[0];
    recommendedProjects.push({
      action_type: 'UPGRADE_EXISTING_PROJECT',
      project_id: candidateProject.id,
      title: candidateProject.title || candidateProject.raw_goal || 'Active Project',
      description: `Upgrade your existing project "${candidateProject.title || candidateProject.raw_goal}" with a targeted industry milestone (e.g., Docker, automated testing, or observability).`,
      tech_stack: candidateProject.tech_stack || 'JavaScript / Node.js'
    });
  } else {
    recommendedProjects.push({
      action_type: 'NEW_IDE_PROJECT',
      project_id: null,
      title: 'Fullstack Microservice & API Starter',
      description: 'Start a foundational production-grade project in the SOCRATES browser I.D.E. featuring Express, SQLite, Jest, and containerization.',
      tech_stack: 'Node.js, Express, SQLite, Jest',
      ide_route: '/projects'
    });
  }

  const report = {
    report_id: `guidance_${studentId}_${targetRole.id}_${Date.now()}`,
    role: {
      id: targetRole.id,
      title: targetRole.title,
      category: targetRole.category,
      selection_type: selectionType
    },
    profile_state: profileState,
    market_data: {
      status: marketStatus,
      last_updated: new Date().toISOString(),
      source_count: sourceCount
    },
    readiness,
    competencies,
    roadmap,
    recommended_projects: recommendedProjects,
    provenance: {
      engine: 'deterministic',
      report_version: '1.0',
      generated_at: new Date().toISOString()
    }
  };

  setCachedGuidance(studentId, roleId, report);
  return report;
}

module.exports = {
  generateStudentRoleGuidance,
  invalidateGuidanceCache
};
