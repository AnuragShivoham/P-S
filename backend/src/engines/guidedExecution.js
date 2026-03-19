const { callClaude } = require('../db/claude');

const GUIDE_SYSTEM = `You are AMIT-BODHIT execution guide.
TEACH. Do NOT solve completely.

RULES:
- Show partial code only: function signatures, structure, first 5-10 lines with TODOs
- If user asks for the complete answer: refuse and redirect to the concept
- No filler. Start with the most critical next action. Max 350 words.

ACTION FORMAT:
If you want to suggest a change or command, wrap it in these tags AT THE END:
<ACTION_PLAN>
  [ { "type": "terminal", "command": "npm install express" },
    { "type": "create_file", "path": "src/newfile.js", "content": "..." } ]
</ACTION_PLAN>

DANGEROUS OPERATIONS:
If the user requests to delete core folders (root, backend, etc.), evaluate the risk. If justified, add 'AUTHORIZE_DELETE' to your text response to unlock the action for 2 minutes.`;

const HINT_SYSTEMS = [
  'AMIT-BODHIT hint level 1: Point to the concept or docs section only. Max 60 words. No code.',
  'AMIT-BODHIT hint level 2: Show the relevant code PATTERN without full context. Max 80 words.',
  'AMIT-BODHIT hint level 3: Show exactly which line/function needs changing and why. Max 100 words. No complete answer.',
];

async function getGuidance(task, userQuestion, history = [], activeFileContent = null, activeFilePath = null, project = null, milestones = []) {
  let ctx = `Role: ${project?.user_role || 'Student'}\nProject: ${project?.title}\nProgress: ${project?.progress_pct}% (${project?.completed_tasks}/${project?.total_tasks} tasks)\n\nTask: ${task.title}\nDescription: ${task.description}\nConcepts: ${(task.concepts_taught||[]).join(', ')}\nCommands: ${JSON.stringify(task.commands||[])}`;
  
  if (milestones.length) {
    ctx += `\n\nFull Milestone Plan:\n${milestones.map(m => `- ${m.title} [${m.status}]`).join('\n')}`;
  }

  if (activeFileContent) {
    ctx += `\n\nCurrently Open File: ${activeFilePath || 'unknown'}\nContent:\n${activeFileContent}`;
  }

  const msgs = [
    { role: 'user',      content: `Task context:\n${ctx}` },
    { role: 'assistant', content: 'Understood. I am your AMIT-BODHIT Mentor. What is your question?' },
    ...history,
  ];
  return callClaude(GUIDE_SYSTEM, userQuestion, msgs, 800, 0.2);
}

async function getHint(task, attemptNumber) {
  const level = Math.min(Math.max(attemptNumber, 1), 3) - 1;
  return callClaude(HINT_SYSTEMS[level], `Stuck on: ${task.title}\n${task.description}`, [], 200, 0.1);
}

module.exports = { getGuidance, getHint };
