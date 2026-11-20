// ============================================================
//  Seed script: loads the starter challenges into MongoDB.
//  Usage:  npm run seed
//  Safe to run many times - it updates challenges by title
//  instead of creating duplicates.
// ============================================================
import 'dotenv/config';
import mongoose from 'mongoose';
import Challenge from '../models/Challenge.js';
import challenges from './challenges.js';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  for (const c of challenges) {
    // Turn the friendly { args, expected } into the JSON strings the model stores.
    const testCases = c.tests.map((t) => ({
      input: JSON.stringify(t.args),
      expected: JSON.stringify(t.expected),
    }));

    const { tests, ...fields } = c;

    // upsert = "update it if it exists, otherwise insert it"
    await Challenge.findOneAndUpdate(
      { title: c.title },
      { ...fields, testCases },
      { upsert: true, runValidators: true }
    );
    console.log(`   🐞 ${c.title}`);
  }

  console.log(`🌱 Seeded ${challenges.length} challenges`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('💥 Seeding failed:', err.message);
  process.exit(1);
});
