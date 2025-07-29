import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

export async function GET(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
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
    await client.close();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 