import { AppDataSource } from './data-source';

async function run() {
  console.log('Initializing database data source for migrations...');
  await AppDataSource.initialize();
  console.log('Running pending migrations...');
  const migrations = await AppDataSource.runMigrations();
  if (migrations.length === 0) {
    console.log('No pending migrations.');
  } else {
    console.log(`Successfully applied ${migrations.length} migration(s):`);
    migrations.forEach((m) => console.log(` - ${m.name}`));
  }
  await AppDataSource.destroy();
  console.log('Migration process completed.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
