import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';
const HISTORY_COLLECTION = 'history';

export async function POST(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
  try {
    const { deviceId } = await req.json();
    if (!deviceId) {
      return NextResponse.json({ success: false, error: 'deviceId is required' }, { status: 400 });
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    const history = db.collection(HISTORY_COLLECTION);

    // Find the transformer to get deviceName for logging
    const transformer = await collection.findOne({ deviceId });
    if (!transformer) {
      await client.close();
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }
    const deviceName = transformer.deviceName || transformer.name || deviceId;

    // Delete the transformer
    await collection.deleteOne({ deviceId });

    // Log the deletion in history
    await history.insertOne({
      deviceId,
      deviceName,
      action: 'delete',
      timestamp: new Date().toISOString(),
    });

    await client.close();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 