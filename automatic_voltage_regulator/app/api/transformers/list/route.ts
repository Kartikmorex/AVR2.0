import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

export async function GET(req: NextRequest) {
  if (!MONGO_URI) {
    console.warn('MONGO_URI environment variable not set');
    return NextResponse.json({ success: false, error: 'Database configuration missing' }, { status: 500 });
  }
  
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 5000,
  });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    const devices = await collection.find({}).toArray();

    // Ensure every transformer has an interlocks object and normalize mode to lowercase
    const transformers = devices.map(device => ({
      ...device,
      interlocks: device.interlocks || {
        tapChangerInProgress: false,
        tapChangerStuck: false,
        overCurrent: false,
        voltageError: false
      },
      mode: (device.mode || 'manual').toLowerCase(),
    }));

    await client.close();
    return NextResponse.json({ transformers });
  } catch (err: any) {
    console.warn('MongoDB connection failed, returning empty transformers list:', err.message);
    try { await client.close(); } catch {}
    // Return empty transformers list when database is unavailable
    return NextResponse.json({ transformers: [] });
  }
} 