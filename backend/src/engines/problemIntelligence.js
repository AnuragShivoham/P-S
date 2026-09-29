const { callClaudeJSON } = require('../db/claude');
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const SYSTEM_PROMPT = `You are the SOCRATES Societal Problem Intelligence Engine.
Your task is to transform informal, emotional, or unstructured citizen-reported problems into a highly structured, objective, and actionable technical and project definition for engineering teams, university researchers, and mentors.

RULES:
1. Objectively synthesize root causes, affected stakeholders, and non-functional constraints (e.g., intermittent connectivity, low digital literacy, budget constraints).
2. Extract functional & non-functional key requirements.
3. Recommend modern technology domains (e.g., IoT, Mobile GIS, Distributed Ledgers, Edge ML, Cloud Services) and specific engineering skills needed.
4. Output realistic team roles for university student teams.
5. Provide a confidence score between 0.0 and 1.0 based on how complete and actionable the report is.

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "problem_type": "...",
  "primary_category": "...",
  "secondary_categories": ["..."],
  "summary": "1-2 sentence executive summary of the societal challenge.",
  "problem_statement": "Professionally formulated problem statement suitable for an engineering challenge.",
  "affected_stakeholders": ["..."],
  "root_causes": ["..."],
  "key_requirements": ["..."],
  "constraints": ["..."],
  "urgency": "low | medium | high | critical",
  "severity": "minor | moderate | severe | catastrophic",
  "estimated_scope": "local | district | regional | national",
  "expected_impact": "Quantifiable or verifiable social, economic, or environmental benefit.",
  "potential_solution_domains": ["..."],
  "required_skills": ["..."],
  "recommended_project_type": "fullstack | iot | ai | mobile | data",
  "recommended_team_roles": ["Frontend Developer", "Backend Developer", "ML Engineer", "UI/UX Designer", "DevOps Engineer", "QA Engineer", "Domain Researcher"],
  "technology_domains": ["..."],
  "confidence": 0.85
}`;

/**
 * Heuristic fallback analysis in case the AI provider is offline.
 * Guarantees zero crashing and continuous system operation.
 */
function fallbackAnalysis(problem) {
  const words = (problem.description || '').toLowerCase().split(/\s+/);
  const isHighUrgency = words.some(w => ['severe', 'emergency', 'outbreak', 'poison', 'collapse', 'danger', 'death', 'flood'].includes(w));

  return {
    problem_type: problem.problem_type || 'Civic Issue',
    primary_category: problem.problem_type || 'Community Infrastructure',
    secondary_categories: ['Public Health', 'Civic Safety'],
    summary: problem.title || 'Reported societal challenge awaiting deeper field survey.',
    problem_statement: `Engineering teams must design and deploy a solution to address: "${problem.title}". The system must ensure continuous monitoring, citizen transparency, and stakeholder coordination.`,
    affected_stakeholders: ['Local Residents', 'Municipal Authorities', 'Vulnerable Demographics'],
    root_causes: ['Insufficient real-time monitoring', 'Delayed grievance resolution', 'Resource allocation bottlenecks'],
    key_requirements: [
      'Provide real-time citizen alert and notification mechanism',
      'Implement central dashboard for authorities to track remediation',
      'Ensure resilient offline data collection and synchronization'
    ],
    constraints: ['Low network bandwidth at field locations', 'Multilingual support needed', 'Strict privacy for citizen reporters'],
    urgency: isHighUrgency ? 'high' : 'medium',
    severity: isHighUrgency ? 'severe' : 'moderate',
    estimated_scope: problem.geographic_scope || 'local',
    expected_impact: problem.expected_impact || 'Reduces incident response time and improves civic wellbeing.',
    potential_solution_domains: ['Mobile Applications', 'Sensor Networks', 'Civic GIS Dashboards'],
    required_skills: ['JavaScript / Node.js', 'React', 'REST APIs', 'PostgreSQL / SQLite', 'Geospatial Mapping'],
    recommended_project_type: 'fullstack',
    recommended_team_roles: ['Frontend Developer', 'Backend Developer', 'UI/UX Designer', 'QA Engineer'],
    technology_domains: ['Web Applications', 'Mobile GIS', 'Cloud Microservices'],
    confidence: 0.72
  };
}

/**
 * Deterministic Token Overlap & N-Gram Similarity for Deduplication
 */
function stemWord(w) {
  return w.replace(/(ing|tion|tions|ed|ies|es|s)$/, '');
}

function calculateTextSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  const tokenize = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2).map(stemWord);
  const setA = new Set(tokenize(textA));
  const setB = new Set(tokenize(textB));

  if (setA.size === 0 || setB.size === 0) return 0;

  let tokenIntersection = 0;
  for (const token of setA) {
    if (setB.has(token) || Array.from(setB).some(b => (b.length > 4 && token.length > 4 && (b.startsWith(token) || token.startsWith(b))))) {
      tokenIntersection++;
    }
  }

  const tokenJaccard = tokenIntersection / (setA.size + setB.size - tokenIntersection);

  // 3-gram character similarity for capturing compound phrasing
  const cleanA = textA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = textB.toLowerCase().replace(/[^a-z0-9]/g, '');
  const ngrams = (str, n = 3) => {
    const s = new Set();
    for (let i = 0; i <= str.length - n; i++) s.add(str.slice(i, i + n));
    return s;
  };
  const gramsA = ngrams(cleanA);
  const gramsB = ngrams(cleanB);
  let gramOverlap = 0;
  for (const g of gramsA) if (gramsB.has(g)) gramOverlap++;
  const gramJaccard = (gramsA.size + gramsB.size > 0) ? gramOverlap / (gramsA.size + gramsB.size - gramOverlap) : 0;

  return (tokenJaccard * 0.7) + (gramJaccard * 0.3);
}

/**
 * Scan existing problems and detect potential duplicates.
 * Returns candidate list with similarity percentages (e.g. 0.91 = 91%).
 */
function detectDuplicates(problemId, title, description, categoryId) {
  const existing = db.prepare(`
    SELECT id, title, description, category_id
    FROM societal_problems
    WHERE id != ? AND status NOT IN ('ARCHIVED', 'REJECTED')
  `).all(problemId);

  const candidates = [];
  for (const item of existing) {
    const titleSim = calculateTextSimilarity(title, item.title);
    const descSim = calculateTextSimilarity(description, item.description);
    const catBonus = (categoryId && item.category_id === categoryId) ? 0.1 : 0;

    const combinedScore = Math.min(Math.round(((titleSim * 0.6) + (descSim * 0.3) + catBonus) * 100) / 100, 1.0);

    // Candidates with score >= 0.40 (40%) are flagged for review
    if (combinedScore >= 0.40) {
      candidates.push({
        matched_problem_id: item.id,
        matched_title: item.title,
        similarity_score: combinedScore,
        percentage: Math.round(combinedScore * 100),
        reasoning: `Shared vocabulary detected in problem title (${Math.round(titleSim * 100)}%) and context description.`
      });
    }
  }

  candidates.sort((a, b) => b.similarity_score - a.similarity_score);
  return candidates;
}

/**
 * Run end-to-end AI analysis on a submitted problem.
 */
async function analyzeProblem(problemId) {
  const problem = db.prepare('SELECT * FROM societal_problems WHERE id = ?').get(problemId);
  if (!problem) throw new Error('Problem not found');

  const loc = db.prepare('SELECT * FROM problem_locations WHERE problem_id = ?').get(problemId);

  // Update status to AI_ANALYZING
  db.prepare("UPDATE societal_problems SET status = 'AI_ANALYZING', updated_at = datetime('now') WHERE id = ?").run(problemId);

  const userPrompt = `
Citizen Societal Problem Submission:
- Title: ${problem.title}
- Problem Type: ${problem.problem_type}
- Citizen Narrative: ${problem.description}
- Stated Urgency: ${problem.urgency}
- Reported People Affected: ${problem.people_affected || 'Unspecified'}
- Geographic Scope: ${problem.geographic_scope}
- Citizen Expected Impact: ${problem.expected_impact || 'Unspecified'}
- Location: ${loc ? `${loc.district || ''}, ${loc.state || ''}, ${loc.country || ''}` : 'Location unlisted'}
`;

  let analysis = null;
  try {
    analysis = await callClaudeJSON(SYSTEM_PROMPT, userPrompt, [], 2200);
  } catch (err) {
    console.warn('[Problem Intelligence] AI engine unavailable, using deterministic analysis:', err.message);
    analysis = fallbackAnalysis(problem);
  }

  if (!analysis || !analysis.problem_statement) {
    analysis = fallbackAnalysis(problem);
  }

  // Deduplication check
  const duplicateCandidates = detectDuplicates(problem.id, problem.title, problem.description, problem.category_id);

  // Persist duplicates
  const insertDup = db.prepare(`
    INSERT OR REPLACE INTO problem_duplicates (
      id, problem_id, matched_problem_id, similarity_score, reasoning, status, created_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
  `);

  for (const cand of duplicateCandidates) {
    insertDup.run(
      `dup_${uuidv4()}`,
      problem.id,
      cand.matched_problem_id,
      cand.similarity_score,
      cand.reasoning
    );
  }

  // Persist AI Analysis
  const existingAnalysis = db.prepare('SELECT id FROM problem_ai_analysis WHERE problem_id = ?').get(problemId);
  const analysisId = existingAnalysis ? existingAnalysis.id : `ana_${uuidv4()}`;

  db.prepare(`
    INSERT OR REPLACE INTO problem_ai_analysis (
      id, problem_id, summary, problem_statement, primary_category,
      secondary_categories, affected_stakeholders, root_causes,
      key_requirements, constraints, urgency, severity, estimated_scope,
      expected_impact, potential_solution_domains, required_skills,
      recommended_project_type, recommended_team_roles, technology_domains,
      confidence, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    analysisId,
    problemId,
    analysis.summary || problem.title,
    analysis.problem_statement,
    analysis.primary_category || problem.problem_type,
    JSON.stringify(analysis.secondary_categories || []),
    JSON.stringify(analysis.affected_stakeholders || []),
    JSON.stringify(analysis.root_causes || []),
    JSON.stringify(analysis.key_requirements || []),
    JSON.stringify(analysis.constraints || []),
    analysis.urgency || problem.urgency || 'medium',
    analysis.severity || problem.severity || 'medium',
    analysis.estimated_scope || problem.geographic_scope || 'local',
    analysis.expected_impact || problem.expected_impact || '',
    JSON.stringify(analysis.potential_solution_domains || []),
    JSON.stringify(analysis.required_skills || []),
    analysis.recommended_project_type || 'fullstack',
    JSON.stringify(analysis.recommended_team_roles || []),
    JSON.stringify(analysis.technology_domains || []),
    analysis.confidence || 0.8
  );

  // Transition status: if high duplicate similarity exists, transition to REVIEW_REQUIRED
  const nextStatus = duplicateCandidates.some(c => c.similarity_score >= 0.75) ? 'REVIEW_REQUIRED' : 'AI_ANALYZED';
  db.prepare("UPDATE societal_problems SET status = ?, updated_at = datetime('now') WHERE id = ?").run(nextStatus, problemId);

  return {
    analysis,
    duplicateCandidates,
    status: nextStatus
  };
}

module.exports = {
  analyzeProblem,
  detectDuplicates,
  calculateTextSimilarity,
  fallbackAnalysis
};
