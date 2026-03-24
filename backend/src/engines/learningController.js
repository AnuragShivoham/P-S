const behaviorEngine = require('./behaviorEngine');
const scaffoldEngine = require('./scaffoldEngine');
const skillEngine = require('./skillEngine');
const db = require('../db/database');
const mentorEngine = require('./mentorEngine');
const crypto = require('crypto');

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

const learningController = {
  analyzeBehavior(userId, data) {
    const score = behaviorEngine.calculateScore(data);
    db.prepare(`
        INSERT INTO behavior_logs (id, user_id, task_id, paste_size, typing_speed, attempts, time_spent, cheat_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), userId, data.taskId, data.pasteSize, data.typingSpeed, data.attempts, data.timeSpent, score);
    
    return { score, directives: this.controlHints(score) };
  },

  decideDifficulty(userId, taskId) {
    const logs = db.prepare('SELECT cheat_score FROM behavior_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 15').all(userId) || [];
    if (logs.length === 0) return 'intermediate'; 
    
    // Base capability on historical success matrices
    const progressLogs = db.prepare('SELECT attempts, status FROM course_progress WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?)').all(userId) || [];
    const totalPassed = progressLogs.filter(p => p.status === 'passed').length;
    let successRate = progressLogs.length > 0 ? (totalPassed / progressLogs.length) * 100 : 50;

    const avgScore = logs.reduce((sum, log) => sum + log.cheat_score, 0) / logs.length;
    
    // Dynamic weighted skill model
    let skillScore = (successRate * 0.6) - (avgScore * 0.4); 
    if (skillScore > 40) return 'advanced';
    if (skillScore < 10) return 'beginner';
    return 'intermediate';
  },

  controlScaffold(userId, taskId, isCourse, projectId, progressData, behaviorData) {
    if (!isCourse) return null; 

    // Explicit Object Guards against undefined payload crashes from external API caller
    if (!progressData) progressData = { attempts: 0, last_scaffold_level: 1 };
    if (!behaviorData) behaviorData = { cheat_score: 0 };

    const config = skillEngine.getAdaptiveConfig(userId);

    let targetBase = config.avgSkill < 30 ? 3 : config.avgSkill < 70 ? 2 : 1; 
    let prevLevel = progressData.last_scaffold_level || 1;
    
    let newLevel = Math.round(lerp(prevLevel, targetBase, 0.3));

    // Soft Escape Hatch (Increment, no jumping)
    if (progressData.attempts >= 3 && behaviorData.cheat_score < 50) {
        newLevel = Math.min(newLevel + 1, 3);
    }

    // Soft Cheat Drop (Decrement silently, no aggressive hard drops)
    if (behaviorData.cheat_score > 60) {
        newLevel = Math.max(newLevel - 1, 1);
    }

    // Final Level Downgrade Prevention 
    newLevel = Math.max(prevLevel, newLevel);

    // OCC (Optimistic Concurrency Control): Project scoped & PrevLevel locked race condition patch
    const updResult = db.prepare(`
        UPDATE course_progress SET last_scaffold_level = ? 
        WHERE course_task_id = ? AND project_id = ? AND last_scaffold_level <= ?
    `).run(newLevel, taskId, projectId, prevLevel);

    if (updResult.changes === 0) {
        console.warn(`[Learning Controller Warning] Scaffold level not persisted or Race Condition averted for Task: ${taskId}`);
        
        // Data Integrity Fallback: Re-sync actual DB state to prevent silent desync continuation
        const latest = db.prepare(`
            SELECT last_scaffold_level FROM course_progress 
            WHERE course_task_id = ? AND project_id = ?
        `).get(taskId, projectId);
        
        newLevel = latest ? latest.last_scaffold_level : newLevel;
    }

    // Return explicit state to keep Frontend UI synchronized
    return {
        scaffold: scaffoldEngine.generateScaffold(taskId, newLevel),
        level: newLevel
    };
  },

  controlHints(cheatScore) {
    if (cheatScore > 60) {
      return {
         action: 'restricted',
         maxHintLevel: 1,
         message: "Let's go step-by-step to ensure understanding. Explain your logic before proceeding."
      };
    }
    if (cheatScore > 30) {
      return {
         action: 'suspicious',
         maxHintLevel: 2,
         message: "Make sure you understand the code block you just added."
      };
    }
    return { action: 'normal' };
  },

  async routeToMentor(role, input, options = { isCourse: false }) {
     const config = options.user_id ? skillEngine.getAdaptiveConfig(options.user_id) : { avgSkill: 50, difficulty: "medium" };
     
     let helpLevel = config.avgSkill < 30 ? "high" : config.avgSkill > 70 ? "low" : "medium";
     let mode = "guided";

     if (options.user_id && options.task_id) {
         const behavior = db.prepare('SELECT cheat_score FROM behavior_logs WHERE user_id = ? AND task_id = ? ORDER BY created_at DESC LIMIT 1').get(options.user_id, options.task_id);
         if (behavior && behavior.cheat_score > 60) mode = "strict";
     }

     return await mentorEngine.run({ 
         role, 
         input, 
         isCourse: options.isCourse,
         context: { mode, helpLevel, difficulty: config.difficulty }
     });
  }
};

module.exports = learningController;
