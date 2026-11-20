// ============================================================
//  User model - one document per player.
// ============================================================
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// How much work bcrypt does when hashing. 10-12 is the usual range:
// higher = harder to crack, but slower to log in.
const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true, // MongoDB will refuse duplicate usernames
      trim: true, // "  bob " -> "bob"
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and _'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true, // store emails in one consistent form
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      // select:false -> the password hash is NOT returned by queries
      // unless we explicitly ask for it with .select('+password').
      select: false,
    },
    // Every new player starts at 1200 Elo (chess-style rating).
    elo: { type: Number, default: 1200 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// Index on elo so the leaderboard query (sort by elo) stays fast.
userSchema.index({ elo: -1 });

// ---------- Hooks ----------
// Runs automatically BEFORE a user is saved.
// We never store plain passwords - only a bcrypt hash.
userSchema.pre('save', async function () {
  // Only hash if the password is new or was changed
  // (otherwise we'd hash the hash every time the user's Elo changes!).
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// ---------- Methods ----------
// user.comparePassword('typed password') -> true / false
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Controls what the user looks like when sent as JSON to the frontend.
userSchema.methods.toJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    elo: this.elo,
    wins: this.wins,
    losses: this.losses,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
