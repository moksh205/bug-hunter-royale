// ============================================================
//  Challenge model - a buggy piece of code + the tests it must pass.
//
//  How a challenge works:
//   - `buggyCode` defines a function (e.g. `function sortNumbers(arr)`).
//   - `functionName` tells the test runner which function to call.
//   - Each test case gives the arguments and the expected return value,
//     both stored as JSON strings, e.g. input: "[[3,1,2]]", expected: "[1,2,3]".
//     (input is always an ARRAY of arguments, so "[[3,1,2]]" means
//      sortNumbers([3,1,2]) - one argument that happens to be an array.)
// ============================================================
import mongoose from 'mongoose';

// A sub-schema: each test case is a small object inside the challenge.
const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true }, // JSON array of arguments
    expected: { type: String, required: true }, // JSON of the correct result
  },
  { _id: false } // test cases don't need their own ids
);

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true }, // what the code SHOULD do
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'], // only these values are allowed
      default: 'easy',
    },
    language: { type: String, default: 'javascript' },
    functionName: { type: String, required: true },
    buggyCode: { type: String, required: true },
    testCases: {
      type: [testCaseSchema],
      // A challenge with zero tests could be "won" instantly - block that.
      validate: [(arr) => arr.length > 0, 'A challenge needs at least one test case'],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Challenge', challengeSchema);
