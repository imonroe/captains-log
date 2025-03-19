// Setup script for initializing the database with default data

const knex = require('knex');
const path = require('path');
const fs = require('fs');

// Generate a UUID
function generateUUID() {
  return '00000000-0000-0000-0000-000000000000';
}

// Create the database connection
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: path.join(dataDir, 'captains_log.sqlite3')
  },
  useNullAsDefault: true
});

async function setupDatabase() {
  console.log('Setting up Captain\'s Log database...');
  
  // Create users table if it doesn't exist
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    console.log('Creating users table...');
    await db.schema.createTable('users', table => {
      table.uuid('id').primary();
      table.string('name').notNullable();
      table.string('email').unique();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }
  
  // Check if default user exists
  const defaultUser = await db('users')
    .where({ id: generateUUID() })
    .first();
    
  if (!defaultUser) {
    console.log('Creating default user...');
    await db('users').insert({
      id: generateUUID(),
      name: 'Captain',
      email: 'captain@example.com'
    });
  }
  
  // Create recordings table if it doesn't exist
  const hasRecordings = await db.schema.hasTable('recordings');
  if (!hasRecordings) {
    console.log('Creating recordings table...');
    await db.schema.createTable('recordings', table => {
      table.uuid('id').primary();
      table.uuid('user_id').references('id').inTable('users').notNullable();
      table.string('filename').notNullable();
      table.string('duration').notNullable();
      table.binary('audio_data').nullable(); // For storing the actual audio data
      table.timestamp('recorded_at').notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }
  
  // Create transcriptions table if it doesn't exist
  const hasTranscriptions = await db.schema.hasTable('transcriptions');
  if (!hasTranscriptions) {
    console.log('Creating transcriptions table...');
    await db.schema.createTable('transcriptions', table => {
      table.uuid('id').primary();
      table.uuid('recording_id').references('id').inTable('recordings').notNullable();
      table.text('content').notNullable();
      table.jsonb('metadata').nullable(); // For storing additional info like confidence, etc.
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }
  
  // Create tags table if it doesn't exist
  const hasTags = await db.schema.hasTable('tags');
  if (!hasTags) {
    console.log('Creating tags table...');
    await db.schema.createTable('tags', table => {
      table.uuid('id').primary();
      table.string('name').notNullable().unique();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }
  
  // Create recording_tags table if it doesn't exist
  const hasRecordingTags = await db.schema.hasTable('recording_tags');
  if (!hasRecordingTags) {
    console.log('Creating recording_tags table...');
    await db.schema.createTable('recording_tags', table => {
      table.uuid('recording_id').references('id').inTable('recordings').notNullable();
      table.uuid('tag_id').references('id').inTable('tags').notNullable();
      table.primary(['recording_id', 'tag_id']);
    });
  }
  
  console.log('Database setup complete!');
  process.exit(0);
}

// Run the setup
setupDatabase().catch(error => {
  console.error('Error setting up database:', error);
  process.exit(1);
});