const path = require('path');
const fs = require('fs');
const { DatabaseSync, backup } = require('node:sqlite');
const config = require('../src/config');

async function main() {
  const sourcePath = path.resolve(config.DB_PATH);
  const requestedTarget = process.argv[2];
  if (!requestedTarget) {
    throw new Error('Usage: npm run db:backup -- <destination.db>');
  }

  const targetPath = path.resolve(requestedTarget);
  if (sourcePath === targetPath) throw new Error('Backup destination must differ from the source database');
  if (!fs.existsSync(sourcePath)) throw new Error(`Source database does not exist: ${sourcePath}`);
  if (fs.existsSync(targetPath)) throw new Error(`Refusing to overwrite existing file: ${targetPath}`);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    await backup(source, targetPath);
  } finally {
    source.close();
  }

  const check = new DatabaseSync(targetPath, { readOnly: true });
  try {
    const users = check.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const projects = check.prepare('SELECT COUNT(*) AS count FROM projects').get().count;
    console.log(`SQLite backup created: ${targetPath}`);
    console.log(`Contains ${users} user records and ${projects} project records.`);
    console.log('This backup contains personal account/project data. Do not commit it or share it publicly.');
  } finally {
    check.close();
  }
}

main().catch(error => {
  console.error('[SQLite backup failed]', error.message);
  process.exitCode = 1;
});
