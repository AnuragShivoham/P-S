/**
 * labourIntelligenceEngine.js
 * 
 * Layered JD Processing Pipeline & Skill Normalization Engine:
 * Layer 1: Deterministic rules, dictionary lookup, aliases, section regex
 * Layer 2: Natural Language pattern matching & experience extraction
 * Layer 3: LLM fallback for ambiguous text
 * Layer 4: Canonical Ontology Normalization
 * Layer 5: Provenance & Evidence Record Creation
 */

const db = require('../db/database');
const { callClaudeJSON } = require('../db/claude');

// Section detection patterns
const SECTION_PATTERNS = {
  qualifications: /(?:qualifications|requirements|what we're looking for|who you are|eligibility|required skills|preferred qualifications|basic qualifications)/i,
  responsibilities: /(?:responsibilities|what you'll do|core expectations|key duties|role overview|day to day)/i,
  about_role: /(?:about the role|role summary|position summary|overview|job description)/i,
  benefits: /(?:benefits|perks|compensation|what we offer)/i
};

// Experience years regex
const EXP_YEARS_REGEX = /(\b\d+(?:\.\d+)?|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b)\+?\s*(?:year|yr)s?\s*(?:of)?\s*(?:experience|programming|hands-on|work)/i;

const WORD_TO_NUM = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
};

/**
 * Normalizes a raw skill string to canonical skill_id using skill_aliases and skills_ontology.
 * If not found and autoRegister is true, registers the new skill into skills_ontology.
 */
function registerNewSkill(rawSkill, category = 'Specialized Technical') {
  if (!rawSkill || typeof rawSkill !== 'string') return null;
  const clean = rawSkill.trim();
  const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!id || id.length < 2) return null;

  try {
    const existing = db.prepare('SELECT id, name, category FROM skills_ontology WHERE id = ?').get(id);
    if (existing) {
      return { skill_id: existing.id, canonical_name: existing.name, category: existing.category, match_type: 'direct' };
    }

    db.prepare(`
      INSERT INTO skills_ontology (id, name, category, description, proficiency_definitions)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      clean,
      category,
      `Competency in ${clean} extracted from industry signals and verified via SOCRATES IDE.`,
      JSON.stringify({
        beginner: `Foundational understanding and syntax of ${clean}.`,
        intermediate: `Can build, test, and integrate ${clean} into production applications.`,
        advanced: `High-throughput architecture, diagnostic observability, and optimization of ${clean}.`
      })
    );

    db.prepare('INSERT OR IGNORE INTO skill_aliases (skill_id, alias) VALUES (?, ?)').run(id, clean.toLowerCase());
    return { skill_id: id, canonical_name: clean, category, match_type: 'auto_registered' };
  } catch (e) {
    console.warn('[Ontology] registerNewSkill error:', e.message);
    return null;
  }
}

function normalizeSkill(rawSkill, autoRegister = false, category = 'Specialized Technical') {
  if (!rawSkill || typeof rawSkill !== 'string') return null;
  const clean = rawSkill.trim().toLowerCase();

  // 1. Direct match on canonical skill id
  const directSkill = db.prepare('SELECT id, name, category FROM skills_ontology WHERE LOWER(id) = ? OR LOWER(name) = ?').get(clean, clean);
  if (directSkill) return { skill_id: directSkill.id, canonical_name: directSkill.name, category: directSkill.category, match_type: 'direct' };

  // 2. Exact alias match
  const aliasMatch = db.prepare(`
    SELECT s.id, s.name, s.category 
    FROM skill_aliases a 
    JOIN skills_ontology s ON a.skill_id = s.id 
    WHERE LOWER(a.alias) = ?
  `).get(clean);
  if (aliasMatch) return { skill_id: aliasMatch.id, canonical_name: aliasMatch.name, category: aliasMatch.category, match_type: 'alias_exact' };

  // 3. Substring / Token matching on aliases
  const allAliases = db.prepare(`
    SELECT a.alias, s.id, s.name, s.category 
    FROM skill_aliases a 
    JOIN skills_ontology s ON a.skill_id = s.id
  `).all();

  for (const row of allAliases) {
    const aliasLower = row.alias.toLowerCase();
    if (clean.includes(aliasLower) || aliasLower.includes(clean)) {
      return { skill_id: row.id, canonical_name: row.name, category: row.category, match_type: 'alias_substring' };
    }
  }

  if (autoRegister) {
    return registerNewSkill(rawSkill, category);
  }

  return null;
}

/**
 * Parses raw text into segmented sections
 */
function cleanAndSegmentText(rawText) {
  if (!rawText) return { cleanText: '', sections: {} };
  
  const cleanText = rawText.replace(/\r\n/g, '\n').trim();
  const lines = cleanText.split('\n');
  const sections = {
    header: [],
    qualifications: [],
    responsibilities: [],
    about_role: [],
    general: []
  };

  let currentSection = 'general';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line is a section header
    let matched = false;
    for (const [secName, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(trimmed) && trimmed.length < 80) {
        currentSection = secName;
        matched = true;
        break;
      }
    }

    if (!matched) {
      sections[currentSection].push(trimmed);
    }
  }

  return { cleanText, sections };
}

/**
 * Layer 1 & 2: Deterministic & Pattern-based Extraction
 */
function extractDeterministicRequirements(rawText, signalId = null, roleId = 'software-engineer') {
  const { cleanText, sections } = cleanAndSegmentText(rawText);
  const extracted = [];
  const seenSkills = new Set();

  // Parse lines looking for skills and experience
  const lines = cleanText.split('\n');
  
  const aliases = db.prepare(`
    SELECT a.alias, s.id as skill_id, s.name as skill_name, s.category 
    FROM skill_aliases a 
    JOIN skills_ontology s ON a.skill_id = s.id
  `).all();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5) continue;

    // Detect experience in line
    let expYears = 0;
    const expMatch = trimmed.match(EXP_YEARS_REGEX);
    if (expMatch) {
      const numStr = expMatch[1].toLowerCase();
      expYears = WORD_TO_NUM[numStr] !== undefined ? WORD_TO_NUM[numStr] : parseFloat(numStr) || 0;
    }

    // Determine requirement type from context
    let reqType = 'required';
    if (/preferred|plus|bonus|nice to have|advantageous/i.test(trimmed)) {
      reqType = 'preferred';
    }

    // Search for known skill aliases in this line
    for (const item of aliases) {
      const escaped = item.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(trimmed)) {
        if (!seenSkills.has(item.skill_id)) {
          seenSkills.add(item.skill_id);
          extracted.push({
            role_id: roleId,
            skill_id: item.skill_id,
            skill_name: item.skill_name,
            requirement_type: reqType,
            proficiency: expYears >= 3 ? 'advanced' : (expYears >= 1 ? 'intermediate' : 'beginner'),
            experience_years: expYears,
            source_reference: signalId || 'raw_text_signal',
            evidence_quote: trimmed,
            extraction_method: 'deterministic_rule',
            confidence: 0.95,
            status: 'OBSERVED'
          });
        }
      }
    }
  }

  return { sections, extracted };
}

/**
 * Layer 3: LLM Semantic Extraction Engine
 * Uses the root Groq LLM API to extract rich, contextual competencies and evidence.
 */
async function extractWithLLMFallback(rawText, signalId = null, roleId = 'software-engineer', sourceType = 'job_description') {
  const deterministicResult = extractDeterministicRequirements(rawText, signalId, roleId);

  let signalContext = 'job description';
  if (sourceType === 'internship') signalContext = 'internship posting / student project brief';
  else if (sourceType === 'employer_form') signalContext = 'direct employer hiring advisory form';
  else if (sourceType === 'expert_input') signalContext = 'industry expert technical trend & advisory input';
  else if (sourceType === 'hiring_drive') signalContext = 'campus / corporate hiring drive brief';

  const systemPrompt = `You are a strict, highly accurate Labour-Market Intelligence Extraction Compiler.
Analyze this ${signalContext}.
Extract all explicit competencies, technical skills, tools, frameworks, system engineering concepts, experience requirements, and exact evidence quotes.
Ensure you capture both required (must-have) and preferred (nice-to-have) competencies.
For each competency, identify:
1. skill: exact canonical skill name (e.g. "Docker Containerization", "Node.js", "PostgreSQL", "Observability & Tracing", "Test Automation", "Kubernetes", "TypeScript")
2. category: technical domain (e.g. "DevOps & Cloud", "Backend Engineering", "Data & Databases", "Quality & Testing", "System Architecture", "Frontend Engineering")
3. type: "required" or "preferred"
4. experience_years: number (e.g. 0 for internships/juniors, 1, 2, 3+)
5. proficiency: "beginner", "intermediate", or "advanced"
6. evidence_quote: the exact sentence or bullet point quote from the text demonstrating why this skill is needed
7. confidence: a score between 0.75 and 0.99
8. assessment_criteria: practical evidence a student must demonstrate in an IDE project to prove mastery (e.g. "Implement Dockerfile and verified /health container test")

Output ONLY valid JSON in this structure:
{
  "role": "Extracted Role Title",
  "organization": "Company or Lab Name",
  "location": "Location / Remote",
  "summary": "Brief 1-sentence synthesis of key hiring focus",
  "requirements": [
    {
      "skill": "Skill Name",
      "category": "Domain Category",
      "type": "required",
      "experience_years": 0,
      "proficiency": "intermediate",
      "evidence_quote": "Exact verbatim quote from input",
      "confidence": 0.95,
      "assessment_criteria": "Observable IDE artifact"
    }
  ]
}`;

  try {
    const aiRes = await callClaudeJSON(systemPrompt, `Signal Content (${sourceType}):\n${rawText}`, [], 2500);
    if (aiRes && Array.isArray(aiRes.requirements) && aiRes.requirements.length > 0) {
      console.log(`[LabourEngine] LLM successfully extracted ${aiRes.requirements.length} competencies from ${sourceType}`);
      
      const llmExtracted = [];
      const seenSkillIds = new Set();

      for (const item of aiRes.requirements) {
        if (!item.skill) continue;
        let norm = normalizeSkill(item.skill, true, item.category || 'Specialized Technical');

        if (norm && !seenSkillIds.has(norm.skill_id)) {
          seenSkillIds.add(norm.skill_id);
          llmExtracted.push({
            role_id: roleId,
            skill_id: norm.skill_id,
            skill_name: norm.canonical_name,
            requirement_type: item.type === 'preferred' ? 'preferred' : 'required',
            proficiency: ['beginner', 'intermediate', 'advanced'].includes(item.proficiency) ? item.proficiency : 'intermediate',
            experience_years: Number(item.experience_years) || 0,
            source_reference: signalId || 'ai_extracted_signal',
            evidence_quote: item.evidence_quote || rawText.substring(0, 150),
            extraction_method: 'llm_semantic_engine',
            confidence: Number(item.confidence) || 0.92,
            assessment_criteria: item.assessment_criteria || '',
            status: 'OBSERVED'
          });
        }
      }

      // Merge deterministic matches if any were missed by the LLM
      for (const det of deterministicResult.extracted) {
        if (!seenSkillIds.has(det.skill_id)) {
          seenSkillIds.add(det.skill_id);
          llmExtracted.push(det);
        }
      }

      return {
        sections: deterministicResult.sections,
        extracted: llmExtracted,
        ai_summary: aiRes.summary || '',
        ai_extracted_count: aiRes.requirements.length
      };
    }
  } catch (err) {
    console.warn('[LabourEngine] LLM extraction encountered an error, falling back to deterministic rules:', err.message);
  }

  return deterministicResult;
}

/**
 * Ingests an Industry Signal and populates requirements matrix
 */
async function processAndIngestSignal({
  source_type = 'job_description',
  source_name,
  source_url = '',
  organization = 'Industry Partner',
  role_title = 'Software Engineer',
  location = 'Global / Remote',
  published_at = new Date().toISOString().split('T')[0],
  raw_content,
  user_id = 'anon_citizen'
}) {
  const signalId = 'sig_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Match or create canonical role
  let roleRow = db.prepare('SELECT id FROM roles_ontology WHERE LOWER(title) = LOWER(?) OR id = ?').get(role_title, role_title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  let canonicalRoleId = roleRow ? roleRow.id : 'software-engineer';

  // Run layered LLM-first extraction
  const { sections, extracted, ai_summary } = await extractWithLLMFallback(raw_content, signalId, canonicalRoleId, source_type);

  const parsedContent = JSON.stringify({
    role_title,
    organization,
    location,
    sections,
    ai_summary: ai_summary || '',
    extracted_skills: extracted
  });

  // Save Signal
  db.prepare(`
    INSERT INTO industry_signals (
      id, source_type, source_name, source_url, organization, role_title, location, 
      published_at, raw_content, parsed_content, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    signalId,
    source_type,
    source_name,
    source_url,
    organization,
    role_title,
    location,
    published_at,
    raw_content,
    parsedContent,
    'processed',
    user_id
  );

  // Insert or Update Requirements Matrix
  const upsertReq = db.prepare(`
    INSERT INTO labour_requirements (
      id, signal_id, role_id, skill_id, requirement_type, proficiency, experience_years,
      source_reference, evidence_quote, extraction_method, confidence, status,
      job_signal_count, internship_signal_count, employer_signal_count, expert_signal_count, trend_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      job_signal_count = job_signal_count + excluded.job_signal_count,
      internship_signal_count = internship_signal_count + excluded.internship_signal_count,
      employer_signal_count = employer_signal_count + excluded.employer_signal_count,
      expert_signal_count = expert_signal_count + excluded.expert_signal_count,
      trend_score = MIN(1.0, trend_score + 0.05),
      updated_at = datetime('now')
  `);

  for (const req of extracted) {
    const reqId = `req_${canonicalRoleId}_${req.skill_id}`;
    
    // Check if req exists
    const existing = db.prepare('SELECT * FROM labour_requirements WHERE role_id = ? AND skill_id = ?').get(canonicalRoleId, req.skill_id);
    const isJob = source_type === 'job_description' ? 1 : 0;
    const isIntern = source_type === 'internship' ? 1 : 0;
    const isEmp = (source_type === 'employer_form' || source_type === 'hiring_drive') ? 1 : 0;
    const isExp = source_type === 'expert_input' ? 1 : 0;

    if (existing) {
      db.prepare(`
        UPDATE labour_requirements
        SET 
          job_signal_count = job_signal_count + ?,
          internship_signal_count = internship_signal_count + ?,
          employer_signal_count = employer_signal_count + ?,
          expert_signal_count = expert_signal_count + ?,
          trend_score = MIN(1.0, trend_score + 0.05),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(isJob, isIntern, isEmp, isExp, existing.id);
    } else {
      upsertReq.run(
        reqId,
        signalId,
        canonicalRoleId,
        req.skill_id,
        req.requirement_type,
        req.proficiency,
        req.experience_years,
        source_name,
        req.evidence_quote,
        req.extraction_method,
        req.confidence,
        'OBSERVED',
        isJob,
        isIntern,
        isEmp,
        isExp,
        0.5
      );
    }
  }

  return {
    signal_id: signalId,
    role_id: canonicalRoleId,
    extracted_count: extracted.length,
    extracted_requirements: extracted,
    ai_summary: ai_summary || ''
  };
}

module.exports = {
  normalizeSkill,
  cleanAndSegmentText,
  extractDeterministicRequirements,
  extractWithLLMFallback,
  processAndIngestSignal
};