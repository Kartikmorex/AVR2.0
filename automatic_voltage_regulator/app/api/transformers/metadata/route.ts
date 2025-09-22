import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformerMetadata';

export async function GET(req: NextRequest) {
  if (!MONGO_URI) {
    console.error('MONGO_URI environment variable is not set');
    return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
  }

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    const metadataDocs = await collection.find({}).toArray();
    // Build a metadataMap: { [deviceId]: { tagMap: { ... } } }
    const metadataMap = {};
    for (const doc of metadataDocs) {
      metadataMap[doc.deviceId] = { tagMap: doc.tagMap };
    }
    await client.close();
    return NextResponse.json({ metadataMap });
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 