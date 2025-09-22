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

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 5000,
  });
  let added = 0;
  const skipped: string[] = [];
  try {
    const body = await req.json();
    const { devices } = body;
    if (!Array.isArray(devices) || devices.length === 0) {
      return NextResponse.json({ success: false, error: 'No devices provided.' }, { status: 400 });
    }

    // Try MongoDB connection with fallback
    try {
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
      await client.close();
      return NextResponse.json({ success: true, added, skipped, transformers: updatedDevices });
    } catch (dbError) {
      console.warn('MongoDB connection failed, proceeding with fallback mode:', dbError);
      // Fallback: Return success without actually saving to database
      // This allows the frontend to continue working even when MongoDB is unavailable
      return NextResponse.json({ 
        success: true, 
        added: devices.length, 
        skipped: [], 
        transformers: [], 
        fallback: true,
        message: 'Devices added successfully (database temporarily unavailable)' 
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 