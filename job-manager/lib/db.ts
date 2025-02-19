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

// Job interface
export interface IJob {
  status: 'pending' | 'running' | 'completed' | 'failed';
  type: string;
  input: string;
  progress: number;
  output?: string;
  error?: string;
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index on type and input
jobSchema.index({ type: 1, input: 1 });

// Update the updatedAt field on save
jobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Job: Model<IJobDocument> = mongoose.models.Job || mongoose.model('Job', jobSchema);

export default connectDB;
