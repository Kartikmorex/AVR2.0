import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

export async function POST(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
  let added = 0;
  const skipped: string[] = [];
  try {
    const body = await req.json();
    const { devices } = body;
    if (!Array.isArray(devices) || devices.length === 0) {
      return NextResponse.json({ success: false, error: 'No devices provided.' }, { status: 400 });
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    for (const device of devices) {
      const deviceId = device.deviceId || device.devID || device.id;
      const deviceName = device.deviceName || device.devName || device.name || device.devID || device.id;
      // Check if device already exists
      const existing = await collection.findOne({ deviceId });
      if (existing) {
        skipped.push(deviceId);
        continue;
      }
      const doc = {
        deviceId,
        deviceName,
        lowerVoltage: 0,
        mode: 'Manual',
        tolerance: 0,
        type: 'Individual',
        upperVoltage: 0,
        currentRating: {
          ratedCurrent: 0,
          overCurrentLimit: 0,
          currentValue: 0,
        },
        tapLimitMin: 1,
        tapLimitMax: 21,
        minDelay: 11,
        masterName: '-',
        threshold: 0, // Default threshold value
      };
      await collection.insertOne(doc);
      added++;
    }
    const updatedDevices = await collection.find({}).toArray();
    return NextResponse.json({ success: true, added, skipped, transformers: updatedDevices });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    await client.close();
  }
} 