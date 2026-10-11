const { callClaudeJSON } = require('../db/claude');

const SYSTEM = `You are the SOCRATES Architect. 
Your goal is to transform user intent into a high-impact project configuration.

RULES:
1. **Refinement:** If the goal is too vague (e.g., "chatbot", "banking", "app", "website"), output "status": "needs_refinement" and 3 "refinement_options".
2. **Clarification Phase:** After project setup, ask only the questions still needed for THIS project's audience, use cases, constraints, architecture, and success criteria. The number of questions is dynamic: ask as few as the context permits, and ask more than three when the project's complexity genuinely needs it. Do not target a fixed count.
  - Questions must be specific to the goal and the setup answers, natural, non-redundant, and have unique short IDs.
  - Once the user has answered the current discovery questions, return status "clear"; do not begin another fixed question round.
3. **Deterministic Extraction:**
   - skill: beginner | intermediate | advanced
   - time: 3 | 7 | 14
  - type: software | web | mobile | desktop | api | service | hardware | ai | cli
   - stack: specific tech list
   - features: list of 3-6 core functionalities
   - learning_profile: { "motivation": "...", "prior_knowledge": "..." }

4. **Flexibility:** If the user seems unsure, mentions "learning by doing", or asks to "just start", DO NOT ask more questions. Infer industry-standard defaults (e.g. React/Node for Fullstack).
5. **The Pitch:** ALWAYS provide a "confirmation_text" that is encouraging and validating.

OUTPUT ONLY VALID JSON:
{
  "status": "clear" | "needs_clarification" | "needs_refinement",
  "questions": [ { "id": "exp", "text": "..." }, { "id": "user", "text": "..." } ],
  "refinement_options": ["Option 1", "Option 2", "Option 3"],
  "extracted": { "title": "...", "skill": "...", "time": 7, "type": "...", "stack": "...", "features": ["..."], "learning_profile": {} },
  "confirmation_text": "..."
}`;

async function clarifyGoal(rawGoal, history = []) {
  const msgs = [];
  // Build history context for Claude
  const context = history.map(h => JSON.stringify(h)).join("\n");
  
  const setupEntry = [...history].reverse().find(item => item?.phase === 'setup' ||
    (item?.answers && ['skill', 'time', 'type', 'stack', 'features'].every(key => Object.hasOwn(item.answers, key))));
  const hasDiscoveryAnswers = history.some(item => item?.phase === 'discovery_answers');

  let userMsg = `
    User Goal: ${rawGoal}
    Current History: ${context}
  `;

  if (setupEntry && !hasDiscoveryAnswers) {
    userMsg += `
    PROJECT SETUP ANSWERS: ${JSON.stringify(setupEntry.answers)}
    CRITICAL: The setup form is complete, but milestone generation must wait for contextual discovery. Use the original goal and setup answers to identify what important project-specific information remains unknown. Return status "needs_clarification" with a context-dependent number of useful questions (which may be more than three for a complex project). Do not ask about details already supplied.
    `;
  } else if (hasDiscoveryAnswers) {
    userMsg += `
    CRITICAL: The user answered the project-specific discovery questions. Return status "clear" and extract the final configuration from the original goal, setup answers, and all discovery answers. Do not ask more questions. Preserve the selected time, model/type, stack, and features.
    `;
  } else {
    userMsg += `
    CRITICAL: The user must see the project setup form (experience, time, project model, stack, and feature backlog) before milestone generation. If the goal is not vague enough to refine, return status "clear" with your best editable defaults in extracted. Do not generate discovery questions yet.
    `;
  }
  
  try {
    return await callClaudeJSON(SYSTEM, userMsg, msgs, 1000);
  } catch (error) {
    console.warn('[Goal Clarifier] AI unavailable; using editable project defaults:', error.message);
    const setupAnswers = setupEntry?.answers || [...history].reverse().find(item => item?.answers)?.answers || {};
    const discoveryContext = history
      .filter(item => item?.phase === 'discovery_answers' && item.answers)
      .map(item => Object.entries(item.answers).map(([question, answer]) => `${question}: ${answer}`).join('\n'))
      .filter(Boolean).join('\n');
    return {
      status: 'clear',
      missing: [],
      extracted: {
        title: String(rawGoal || 'New project').slice(0, 120),
        skill: setupAnswers.skill || 'beginner',
        time: Number(setupAnswers.time) || 7,
        type: setupAnswers.type || 'fullstack',
        stack: setupAnswers.stack || [],
        features: Array.isArray(setupAnswers.features) ? setupAnswers.features : [],
        scope: discoveryContext
      },
      confirmation_text: 'AI clarification is temporarily unavailable. Your project setup has been saved and a roadmap will be generated from the available details.'
    };
  }
}

module.exports = { clarifyGoal };
