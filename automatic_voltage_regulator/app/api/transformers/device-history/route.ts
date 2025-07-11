import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'history';

export async function GET(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    // Build query
    const query: any = deviceId ? { deviceId } : {};
    const history = await collection.find(query).sort({ timestamp: -1 }).toArray();

    await client.close();
    return NextResponse.json({ history });
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 