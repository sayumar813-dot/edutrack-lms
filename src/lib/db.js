import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    throw new Error('Please define the MONGO_URI environment variable in Vercel Environment Variables or .env.local');
  }

  // Only set custom DNS override on Windows local environment to prevent breaking Vercel Linux Serverless DNS
  if (process.platform === 'win32') {
    try {
      const dns = await import('dns');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (e) {}
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
    };

    // Apply family: 4 only on Windows
    if (process.platform === 'win32') {
      opts.family = 4;
    }

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
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

export default connectToDatabase;
