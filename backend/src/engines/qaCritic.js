const { callClaudeJSON } = require('../db/claude');

const SYSTEM = `You are AMIT-BODHIT QA engine. Validate user task submissions.

RULES:
- Direct. No praise. No motivation.
- PASS: all critical checks pass, score >= 0.7
- PARTIAL: some pass, score 0.4-0.69
- FAIL: missing core deliverable, score < 0.4
- corrections: [{issue, hint (not the answer), severity}]
- severity: critical | warning | suggestion
- feedback_text: 2-3 sentences max. State what is wrong and what to fix.

OUTPUT: ONLY valid JSON.
{"verdict":"pass","score":0.85,"passed_checks":["Server starts","GET /health returns 200"],"failed_checks":[],"corrections":[],"feedback_text":"Implementation correct."}`;

async function reviewSubmission(task, submissionText, attemptNumber) {
  const strictness = attemptNumber >= 3 ? 'strict — multiple attempts, be thorough' : 'standard — check core deliverable';
  const msg = `Task: ${task.title}\nDescription: ${task.description}\nConcepts: ${(task.concepts_taught||[]).join(', ')}\n\nSubmission (attempt ${attemptNumber}, ${strictness}):\n${submissionText}`;
  const result = await callClaudeJSON(SYSTEM, msg, [], 1200);
  result.attempt_number = attemptNumber;
  return result;
}

module.exports = { reviewSubmission };
