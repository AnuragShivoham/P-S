const { callClaudeJSON } = require('../db/claude');

const SYSTEM = `You are AMIT-BODHIT, a strict AI Project Mentor.
Extract a structured project definition from the user goal.

RULES:
- Reject vague goals (no domain, no deliverable, no tech, no context)
- Ask only NECESSARY clarifications — max 3 questions per round
- Output ONLY valid JSON. Zero preamble. Zero text outside JSON.

FORMAT needs_clarification:
{"status":"needs_clarification","questions":[{"key":"tech_stack","question":"What language/framework?"},{"key":"deadline","question":"How many days?"}]}

FORMAT rejected:
{"status":"rejected","reason":"No technical domain. 'Learn coding' is not buildable."}

FORMAT extracted:
{"status":"extracted","title":"Task Management API","tech_stack":["Node.js","Express","SQLite"],"scope":"CRUD API with JWT auth","deadline_days":21,"skill_level":"beginner","deliverables":["Running Express server on /health","SQLite DB with all tables","JWT auth working on protected routes"]}

skill_level: beginner | intermediate | advanced
Convert: 2 weeks=14, 1 month=30`;

async function clarifyGoal(rawGoal, history = []) {
  const msgs = [];
  for (const turn of history) {
    if (turn.questions) msgs.push({ role: 'assistant', content: JSON.stringify(turn) });
    if (turn.answers)   msgs.push({ role: 'user',      content: JSON.stringify(turn) });
  }
  const userMsg = history.length === 0
    ? `User goal: ${rawGoal}`
    : `Original goal: ${rawGoal}\n\nLatest answers: ${JSON.stringify(history.at(-1))}`;
  return callClaudeJSON(SYSTEM, userMsg, msgs, 1000);
}

module.exports = { clarifyGoal };
