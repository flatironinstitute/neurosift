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

// User interface (shared with job-manager)
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

// User schema (shared with job-manager)
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

// Annotation interface
export interface IAnnotation {
  id: string;
  title: string;
  type: string;
  userId: string;
  targetType: string;
  tags: string[];
  data: any;
  createdAt: Date;
  updatedAt: Date;
}

export type IAnnotationDocument = Document & IAnnotation;

// Annotation schema
const annotationSchema = new mongoose.Schema<IAnnotationDocument>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['dandiset', 'openneuro_dataset', 'nwb_file']
  },
  tags: [{
    type: String
  }],
  data: {
    type: mongoose.Schema.Types.Mixed,
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

// Update the updatedAt field on save
annotationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for efficient querying
annotationSchema.index({ userId: 1 });
annotationSchema.index({ targetType: 1 });
annotationSchema.index({ tags: 1 });
annotationSchema.index({ type: 1 });

export const User: Model<IUserDocument> = mongoose.models.User || mongoose.model('User', userSchema);
export const Annotation: Model<IAnnotationDocument> = mongoose.models.Annotation || mongoose.model('Annotation', annotationSchema);

export default connectDB;
