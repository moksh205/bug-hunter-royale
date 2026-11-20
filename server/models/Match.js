// ============================================================
//  Match model - the history of every battle.
// ============================================================
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// One entry per player: who they were, and how their Elo changed.
const playerSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    username: { type: String, required: true }, // copied so history stays readable
    eloBefore: { type: Number, required: true },
    eloAfter: { type: Number }, // filled in when the match ends
    testsPassed: { type: Number, default: 0 }, // best score reached
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    challenge: { type: ObjectId, ref: 'Challenge', required: true },
    players: {
      type: [playerSchema],
      validate: [(arr) => arr.length === 2, 'A match needs exactly 2 players'],
    },
    status: {
      type: String,
      enum: ['in_progress', 'finished'],
      default: 'in_progress',
    },
    winner: { type: ObjectId, ref: 'User' }, // empty until someone wins
    // Why the match ended:
    //  solved    -> someone passed all tests
    //  forfeit   -> someone gave up or disconnected for too long
    //  abandoned -> the server restarted mid-match (no winner, no Elo change)
    endReason: { type: String, enum: ['solved', 'forfeit', 'abandoned'] },
    endedAt: { type: Date },
  },
  { timestamps: true } // createdAt = when the match started
);

// Lets us quickly find "all matches this user played".
matchSchema.index({ 'players.user': 1, createdAt: -1 });

export default mongoose.model('Match', matchSchema);
