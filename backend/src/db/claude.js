const config = require('../config');

async function callClaude(system, userMsg, history = [], maxTokens = 2000, temp = 0.2, isJson = false, image = null) {
  // aggressive token truncation to survive 12000 TPM limit on Groq Free Tier
  const safeSystem = String(system).length > 8000 ? String(system).substring(0, 8000) + '\n...[TRUNCATED]' : system;
  const safeUserMsg = String(userMsg).length > 12000 ? String(userMsg).substring(0, 12000) + '\n...[TRUNCATED_DUE_TO_API_LIMITS]' : String(userMsg);
  
  // Phase 8: Dynamic Vision Model Switching
  const hasImage = image && typeof image === 'string' && image.startsWith('data:image');
  const model = hasImage ? 'llama-3.2-11b-vision-preview' : config.GROQ_MODEL;
  
  // Build user message content (multi-modal if image present)
  let userContent;
  if (hasImage) {
    userContent = [
      { type: 'text', text: safeUserMsg },
      { type: 'image_url', image_url: { url: image } }
    ];
  } else {
    userContent = safeUserMsg;
  }
  
  const messages = [
    { role: 'system', content: safeSystem },
    ...history.filter(m => m && m.content).slice(-4).map(m => ({ 
        role: m.role === 'assistant' ? 'assistant' : 'user', 
        content: String(m.content).substring(0, 1500) 
    })),
    { role: 'user', content: userContent },
  ];
  
  const body = { 
    model, 
    messages, 
    max_tokens: maxTokens, 
    temperature: temp
  };

  // Enable JSON mode if requested (not supported on vision models)
  if (isJson && !hasImage) {
    body.response_format = { type: 'json_object' };
  }

  if (hasImage) console.log(`[Vision] Switching to ${model} for image analysis`);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.GROQ_API_KEY}` },
    body: JSON.stringify(body),
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.choices[0].message.content.trim();
}

/**
 * Robustly extracts the first JSON object or array from a string.
 * This helps if the LLM includes conversational filler before/after the JSON.
 */
function extractJSON(text) {
  const startObj = text.indexOf('{');
  const startArr = text.indexOf('[');
  
  let start = -1;
  let endChar = '';
  
  if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
    start = startObj;
    endChar = '}';
  } else if (startArr !== -1) {
    start = startArr;
    endChar = ']';
  }
  
  if (start === -1) return text; // No JSON found, return raw text and let parse fail
  
  const end = text.lastIndexOf(endChar);
  if (end === -1 || end < start) return text;
  
  return text.substring(start, end + 1);
}

async function callClaudeJSON(system, userMsg, history = [], maxTokens = 2000) {
  // Use lower temperature and forced JSON mode for better reliability
  const raw = await callClaude(system, userMsg, history, maxTokens, 0.1, true);
  let text = raw.trim();
  
  // Strip markdown blocks if present
  if (text.includes('```')) {
    text = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
  }
  
  // Extract strictly what looks like JSON (handles conversational filler)
  text = extractJSON(text);
  
  try {
    const parsed = JSON.parse(text);
    
    // Improved auto-unwrap logic for JSON mode:
    // Groq's JSON mode forces a root object {}. If the prompt asks for an array, 
    // models often return { "tasks": [...] } or { "items": [...], "count": 10 }.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed);
      const arrayKeys = keys.filter(k => Array.isArray(parsed[k]));
      
      if (arrayKeys.length === 1 && ['milestones', 'tasks', 'items'].includes(arrayKeys[0])) {
        const arrayKey = arrayKeys[0];
        console.log(`[JSON Mode] Auto-unwrapped single array from key: ${arrayKey}`);
        return parsed[arrayKey];
      }
    }
    
    return parsed;
  } catch (e) {
    // Basic repair attempt for trailing commas
    try {
      const repaired = text.replace(/,\s*([}\]])/g, '$1');
      const parsed = JSON.parse(repaired);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        if (keys.length === 1 && Array.isArray(parsed[keys[0]])) {
          return parsed[keys[0]];
        }
      }
      return parsed;
    } catch (e2) {
      console.error('[JSON Parse Error]', e, '\nRaw Output:', raw);
      throw new Error(`Failed to parse AI response as JSON. See server logs for raw output.`);
    }
  }
}

module.exports = { callClaude, callClaudeJSON };