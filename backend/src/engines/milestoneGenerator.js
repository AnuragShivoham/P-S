const { callClaudeJSON } = require('../db/claude');

function fallbackMilestones(projectDef) {
  const title = projectDef.title || 'the project';
  const features = Array.isArray(projectDef.features) ? projectDef.features.filter(Boolean) : [];
  const featureFocus = features.length > 0 ? features.slice(0, 3).join(', ') : 'the core product requirements';

  return [
    { title: 'Define the project foundation', description: `Set up the workspace, configuration, and development workflow for ${title}.`, duration_days: 1, measurable_output: 'Runnable project structure with documented setup steps.' },
    { title: 'Collect and model the required data', description: `Design the data flow and persistence needed for ${featureFocus}.`, duration_days: 2, measurable_output: 'Validated data model and working data access path.' },
    { title: 'Build the core product logic', description: `Implement the primary behavior and validation rules for ${title}.`, duration_days: 2, measurable_output: 'Core use case works with success and failure handling.' },
    { title: 'Create the user-facing experience', description: 'Connect the core logic to a clear interface and useful user feedback.', duration_days: 1, measurable_output: 'User can complete the primary workflow from the interface.' },
    { title: 'Test and prepare the release', description: 'Verify the complete workflow, document limitations, and prepare deployment.', duration_days: 1, measurable_output: 'Critical path tested with a repeatable release checklist.' }
  ];
}

const SYSTEM = `You are a Deterministic Planning Compiler. 
Generate a comprehensive, stateless execution roadmap based STRICTLY on the provided project configuration, specifically the "features" array.
FEATURES ARE ROOT DRIVERS: Every feature requested MUST map to a specific milestone. If a feature is added or removed, completely rebuild the milestone structure to reflect it.

SKILL LEVEL STRICT MAPPING:
- "beginner" -> Make it easier: More milestones (break down complexity), smaller simpler tasks, high hint frequency.
- "advanced" -> Make it harder: Fewer milestones, larger complex tasks, minimal hints.

TIME BOX STRICT MAPPING:
- 3 days -> Compress roadmap: Max 2-3 high-impact MVP milestones.
- 14 days -> Expand roadmap: 5-6 deep milestones (Production-grade, Testing, Polishing).

OUTPUT FORMAT:
Return ONLY valid JSON containing TWO keys:
1. "reasoning": A short 1-2 sentence user-facing explanation of how this roadmap was shaped (e.g., "Plan adjusted: Increased milestones from 3 -> 5 and broke tasks into smaller steps for beginner pacing.").
2. "milestones": An array where each item has: "title" (Imperative), "description", "duration_days", and "measurable_output".`;

async function generateMilestones(projectDef) {
  const msg = `Project Configuration:\n${JSON.stringify(projectDef, null, 2)}`;
  let res;
  try {
    res = await callClaudeJSON(SYSTEM, msg, [], 2500);
  } catch (error) {
    console.warn('[Roadmap] AI unavailable; using baseline roadmap:', error.message);
    return {
      reasoning: 'AI planning is temporarily unavailable. A baseline execution roadmap was created so your project can continue.',
      milestones: fallbackMilestones(projectDef),
      fallback: true
    };
  }
  
    if (!res.milestones || !Array.isArray(res.milestones) || res.milestones.length === 0) {
      if (Array.isArray(res)) return { reasoning: "System roadmap statelessly rebuilt.", milestones: res };
      return { reasoning: "A baseline execution roadmap was created from the available project details.", milestones: fallbackMilestones(projectDef) };
  }
  return res;
}

module.exports = { generateMilestones };
