const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.resolve(process.env.DB_PATH || path.join(__dirname, '../data/socrates.db'));
const showUsers = process.argv.includes('--show-users');
const db = new DatabaseSync(dbPath, { readOnly: true });

try {
  const counts = db.prepare(`
    SELECT role, COUNT(*) AS account_count
    FROM users
    WHERE lower(role) IN ('admin', 'mentor', 'university', 'employer', 'expert')
    GROUP BY lower(role)
    ORDER BY lower(role)
  `).all();

  console.log(`Privileged-role inventory for ${dbPath}`);
  console.table(counts);
  console.log('Review these accounts against your trusted staff roster; this report does not change account roles.');

  if (showUsers) {
    const users = db.prepare(`
      SELECT id, email, name, lower(role) AS role, created_at
      FROM users
      WHERE lower(role) IN ('admin', 'mentor', 'university', 'employer', 'expert')
      ORDER BY lower(role), email
    `).all();
    console.table(users);
  } else {
    console.log('To display identities for manual review, rerun with --show-users and keep the output private.');
  }
} finally {
  db.close();
}