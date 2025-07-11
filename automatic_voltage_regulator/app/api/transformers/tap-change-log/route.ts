import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'avrTapChangeHistory';

export async function GET(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    // Build query
    const query: any = { deviceId };
    if (startTime || endTime) {
      query.timestamp = {};
      if (startTime) query.timestamp.$gte = new Date(startTime);
      if (endTime) query.timestamp.$lte = new Date(endTime);
    }

    const logs = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    await client.close();
    return NextResponse.json({ logs });
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 