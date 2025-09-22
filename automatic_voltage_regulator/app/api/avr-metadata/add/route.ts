import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';
const METADATA_COLLECTION = 'avrMetadata';

export async function POST(req: NextRequest) {
  if (!MONGO_URI) {
    console.error('MONGO_URI environment variable is not set');
    return NextResponse.json({ success: false, error: 'Database configuration error' }, { status: 500 });
  }

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  try {
    const body = await req.json();
    const { deviceId, ...metadata } = body;
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'deviceId is required' }, { status: 400 });
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(METADATA_COLLECTION);
    await collection.updateOne(
      { deviceId },
      { $set: { deviceId, ...metadata } },
      { upsert: true }
    );
    await client.close();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 