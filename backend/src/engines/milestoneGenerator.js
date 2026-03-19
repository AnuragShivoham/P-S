const { callClaudeJSON } = require('../db/claude');

const SYSTEM = `You are AMIT-BODHIT milestone planner.
Convert a project definition into 2-6 sequential milestones.

RULES:
- Each milestone = 14-21 days
- measurable_output MUST be binary-verifiable (run a command, check a file)
- Milestones are sequential — each builds on previous
- Max 6 milestones total
- Title: specific imperative verb, not "Learn X"

OUTPUT: ONLY a valid JSON object with a "milestones" key containing an array of milestones.
{"milestones": [{"order":1,"title":"Project Setup","description":"Init repo and verify server boots","duration_days":14,"measurable_output":"Run node src/server.js and GET /health returns 200 OK"}]} `;

async function generateMilestones(projectDef) {
  const msg = `Project:\n${JSON.stringify(projectDef, null, 2)}`;
  const res = await callClaudeJSON(SYSTEM, msg, [], 1500);
  const milestones = Array.isArray(res) ? res : (res.milestones || res.items || []);
  if (!Array.isArray(milestones) || milestones.length === 0) throw new Error('Expected array of milestones');
  if (milestones.length > 6) throw new Error(`Bad milestone count: ${milestones.length}`);
  return milestones;
}

module.exports = { generateMilestones };
