const db = require('../db/database');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function getActiveCourses() {
  return db.prepare('SELECT * FROM courses WHERE is_active = 1').all();
}

function getCourse(id) {
  return db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
}

function getCourseFullStructure(courseId, version = 1) {
  const course = getCourse(courseId);
  if (!course) return null;
  
  const milestones = db.prepare('SELECT * FROM course_milestones WHERE course_id = ? ORDER BY position ASC').all(courseId);
  
  // Rule: Master tasks are filtered by version to ensure project immutability
  const tasks = db.prepare(`
    SELECT t.* FROM course_tasks t
    JOIN course_milestones m ON t.milestone_id = m.id
    WHERE m.course_id = ? AND t.version = ?
    ORDER BY m.position ASC, t.position ASC
  `).all(courseId, version);
  
  return { course, milestones, tasks };
}

// -------------------------------------------------------------
// SECURE VALIDATION ENGINE (Sandboxed Pathing & Strict Regex)
// -------------------------------------------------------------
function validateStaticTask(task, workspacePath) {
  const expectedOutput = task.expected_output;
  if (!expectedOutput) return { passed: true };

  // Rule 2 Fix: Secure Path Traversal Bounds
  const safePath = path.resolve(workspacePath, expectedOutput);
  if (!safePath.startsWith(workspacePath)) {
    throw new Error("SECURITY FAULT: Invalid path traversal detected.");
  }

  // Parse hints securely
  let parsedHints = [];
  try { 
    parsedHints = JSON.parse(task.hints || "[]");
  } catch(e) { 
    parsedHints = [task.hints]; 
  }
  
  // Rule 4 Fix: Sanitize Hint Output (Block XSS HTML tags)
  const getHint = () => {
    const raw = parsedHints[0] || "Review your syntax.";
    return raw.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  if (task.validation_type === 'file_exists') {
    if (fs.existsSync(safePath)) return { passed: true };
    return { passed: false, hint: `File missing: Make sure you created '${expectedOutput}'.` };
  }

  if (task.validation_type === 'string_match') {
    if (!fs.existsSync(safePath)) {
      return { passed: false, hint: `File missing: ${expectedOutput}` };
    }
    
    let content = fs.readFileSync(safePath, 'utf8');
    
    // Rule 3 Fix: Strip Comments to block naive "// express()" bypasses
    content = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
    
    const pattern = task.validation_pattern;
    if (!pattern) return { passed: true };

    try {
      const regex = new RegExp(pattern, 'i'); // Case insensitive evaluation
      if (regex.test(content)) return { passed: true };
    } catch(e) {
      console.error("[CourseValidator] Invalid RegExp Pattern Execution Segment:", pattern);
    }
    
    return { passed: false, hint: getHint() };
  }

  return { passed: true };
}

module.exports = {
  getActiveCourses,
  getCourse,
  getCourseFullStructure,
  validateStaticTask
};
