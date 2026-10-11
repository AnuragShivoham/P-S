const { callClaudeJSON } = require('../db/claude');

const SYSTEM = `You are SOCRATES task planner.
Convert one milestone into daily actionable tasks.

RULES:
- Each task <= 4 estimated hours
- commands: shell commands the user must run (no explanations)
- starter_template: PARTIAL code only — skeleton + TODO comments. NEVER a complete solution.
- folder_structure: nested object {"src":{"index.js":null}} — null = file, object = folder
- concepts_taught: max 3 per task
- title: imperative verb (Create, Configure, Implement, Test, Add)

CRITICAL: starter_template must have TODO comments. Do NOT complete the implementation.

OUTPUT: ONLY a valid JSON object with a "tasks" key containing an array of tasks.
{"tasks": [{"order":1,"day":1,"title":"Initialize Express Server","description":"Bootstrap the project and confirm the server runs.","estimated_hours":2,"commands":["npm init -y","npm install express cors dotenv","node src/server.js"],"folder_structure":{"src":{"server.js":null},"package.json":null},"starter_template":"const express = require('express');\nconst app = express();\n\n// TODO: Add json middleware\n// TODO: Add /health route that returns {status:'ok'}\n// TODO: Start server on process.env.PORT or 3001\n","concepts_taught":["Express setup","Middleware","Environment variables"]}]} `;

async function generateTasks(milestone, projectCtx) {
  const msg = `Milestone:\n${JSON.stringify(milestone, null, 2)}\n\nContext:\n${JSON.stringify(projectCtx, null, 2)}`;
  let tasks;
  try {
    const res = await callClaudeJSON(SYSTEM, msg, [], 2500);
    tasks = Array.isArray(res) ? res : (res.tasks || res.items || []);
    if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('Expected array of tasks');
  } catch (error) {
    console.warn('[Task Planner] AI unavailable; using starter tasks:', error.message);
    tasks = [
      { order: 1, day: 1, title: `Set up ${milestone.title}`, description: `Create the project structure and development environment needed for ${milestone.title}.`, estimated_hours: 2, commands: [], folder_structure: { src: { 'index.js': null } }, starter_template: '// TODO: Initialize this milestone and document your first implementation step.\n', concepts_taught: ['Project structure', 'Development workflow'] },
      { order: 2, day: 1, title: `Implement ${milestone.title}`, description: milestone.description || 'Build the core functionality and verify the measurable output.', estimated_hours: 3, commands: [], folder_structure: {}, starter_template: '', concepts_taught: ['Implementation', 'Validation'] }
    ];
  }
  return tasks.map((t, i) => ({ 
      ...t, 
      title: t.title || `Task ${i + 1}`,
      description: t.description || '',
      estimated_hours: Math.min(t.estimated_hours || 2, 4),
      commands: Array.isArray(t.commands) ? t.commands : [],
      concepts_taught: Array.isArray(t.concepts_taught) ? t.concepts_taught : []
  }));
}

module.exports = { generateTasks };
