import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const METADATA_COLLECTION = 'avrMetadata';

export async function POST(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
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