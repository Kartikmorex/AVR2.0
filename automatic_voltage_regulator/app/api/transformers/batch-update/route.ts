import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

export async function POST(req: NextRequest) {
  if (!MONGO_URI) {
    console.warn('MONGO_URI environment variable not set');
    return NextResponse.json({ success: false, error: 'Database configuration missing' }, { status: 500 });
  }
  
  const client = new MongoClient(MONGO_URI);
  try {
    const { updates } = await req.json();
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates must be an array' }, { status: 400 });
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    for (const update of updates) {
      const { deviceId, type, masterName } = update;
      if (!deviceId) continue;
      const setFields: Record<string, any> = {};
      if (type) setFields['type'] = type;
      if (masterName !== undefined) setFields['masterName'] = masterName;
      await collection.updateOne({ deviceId }, { $set: setFields });
    }

    await client.close();
    return NextResponse.json({ message: 'Batch update successful' });
  } catch (error: any) {
    await client.close();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 