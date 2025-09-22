import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { DataAccess } from 'connector-userid-ts';
import { getUserIdFromRequest } from '@/lib/auth';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';

export async function GET(req: NextRequest) {
  if (!MONGO_URI) {
    console.warn('MONGO_URI environment variable not set');
    return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
  }

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 5000,
  });
  try {
    // 1. Get user ID from cookies with fallback
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found. Please set your User ID in settings or check environment configuration.' }, { status: 401 });
    }
    const dataUrl = process.env.IOSENSE_DATA_URL || 'datads.iosense.io';
    const dsUrl = process.env.IOSENSE_DS_URL || 'datads.iosense.io';
    const dataAccess = new DataAccess({
      userId,
      dataUrl,
      dsUrl,
      onPrem: false,
      tz: 'UTC',
    });
    const allDevices = await dataAccess.getDeviceDetails();
    console.log('Step 1: All user devices:', allDevices);

    // 2. Filter for devTypeID === 'ABRL_TRACOMO'
    const abrlDevices = (Array.isArray(allDevices) ? allDevices : []).filter(
      (d: any) => d.devTypeID === 'ABRL_TRACOMO'
    );
    console.log('Step 2: ABRL_TRACOMO devices:', abrlDevices);

    // 3. Try to fetch all deviceId from userTransformers
    let userDeviceIds: string[] = [];
    try {
      await client.connect();
      const db = client.db(DB_NAME);
      const userTransformers = await db.collection('userTransformers').find({}, { projection: { deviceId: 1, _id: 0 } }).toArray();
      userDeviceIds = userTransformers.map(t => t.deviceId);
      console.log('Step 3: deviceIds in userTransformers:', userDeviceIds);
    } catch (dbError) {
      console.warn('MongoDB connection failed, returning all devices as available:', dbError);
      // If MongoDB is not available, assume no devices are in use
      userDeviceIds = [];
    }

    // 4. Return only ABRL_TRACOMO devices whose devID is not present in userTransformers.deviceId
    const availableDevicesRaw = abrlDevices.filter((d: any) => !userDeviceIds.includes(d.devID));
    console.log('Step 4: Raw available devices:', availableDevicesRaw);

    // 5. Return devices without metadata to ensure fast response
    const availableDevices = availableDevicesRaw.map(device => ({
      devID: device.devID,
      devTypeID: device.devTypeID,
      devName: device.devName || device.name || device.devID,
    }));
    
    console.log('Step 5: Available devices (no metadata fetch for performance):', availableDevices);

    await client.close();
    return NextResponse.json(availableDevices);
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 