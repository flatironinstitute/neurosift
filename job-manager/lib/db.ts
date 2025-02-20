import mongoose, { Document, Model } from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const MONGODB_URI = process.env.MONGODB_URI;

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = global as { mongoose?: CachedConnection };
const cached = globalWithMongoose.mongoose || { conn: null, promise: null };
globalWithMongoose.mongoose = cached;

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// User interface
export interface IUser {
  userId: string;
  name: string;
  email: string;
  researchDescription: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {}

// User schema
const userSchema = new mongoose.Schema<IUserDocument>({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  researchDescription: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for fast lookups
userSchema.index({ apiKey: 1 }, { unique: true });

// Job interface
export interface IJob {
  status: 'pending' | 'running' | 'completed' | 'failed';
  type: string;
  input: string;
  progress: number;
  output?: string;
  error?: string;
  userId: string;  // Reference to user who created the job
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobDocument extends IJob, Document {}

// Job schema
const jobSchema = new mongoose.Schema<IJobDocument>({
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  type: {
    type: String,
    required: true
  },
  input: {
    type: String,
    required: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  output: String,
  error: String,
  userId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound indexes
jobSchema.index({ type: 1, input: 1 });

// Update the updatedAt field on save
jobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Job: Model<IJobDocument> = mongoose.models.Job || mongoose.model('Job', jobSchema);
export const User: Model<IUserDocument> = mongoose.models.User || mongoose.model('User', userSchema);

export default connectDB;
