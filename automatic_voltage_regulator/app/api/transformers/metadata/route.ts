import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformerMetadata';

export async function GET(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
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