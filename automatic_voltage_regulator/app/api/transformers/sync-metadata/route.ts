import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { DataAccess } from 'connector-userid-ts';
import { getUserIdFromRequest } from '@/lib/auth';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';
const DEVICES_COLLECTION = 'userTransformers';
const METADATA_COLLECTION = 'userTransformerMetadata';

export async function POST(req: NextRequest) {
  if (!MONGO_URI) {
    console.error('MONGO_URI environment variable is not set');
    return NextResponse.json({ success: false, error: 'Database configuration error' }, { status: 500 });
  }

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const devicesCol = db.collection(DEVICES_COLLECTION);
    console.log('Connected DB:', db.databaseName);

    // Ensure metadata collection exists
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionNames = collections.map(col => col.name);
    console.log('Collections:', collectionNames);

    if (!collectionNames.includes(METADATA_COLLECTION)) {
      await db.createCollection(METADATA_COLLECTION);
      console.log(`Collection '${METADATA_COLLECTION}' created.`);
    }
    const metadataCol = db.collection(METADATA_COLLECTION);

    // Get all device IDs
    const devices = await devicesCol.find({}).toArray();
    const deviceIds = devices.map(d => d.deviceId).filter(Boolean);
    if (deviceIds.length === 0) {
      await client.close();
      return NextResponse.json({ success: false, error: 'No devices to sync.' }, { status: 400 });
    }

    // Get userId from cookies only
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      await client.close();
      return NextResponse.json({ error: 'User ID cookie not found. Please set your User ID in settings.' }, { status: 401 });
    }

    const dataAccess = new DataAccess({
      userId,
      dataUrl: process.env.IOSENSE_DATA_URL || 'datads.iosense.io',
      dsUrl: process.env.IOSENSE_DS_URL || 'datads.iosense.io',
      onPrem: false,
      tz: 'UTC',
    });

    // Fetch metadata in parallel
    const results = await Promise.allSettled(deviceIds.map(async (deviceId) => {
      const meta = await dataAccess.getDeviceMetaData(deviceId);
      if (!meta || Object.keys(meta).length === 0) throw new Error(`No metadata for ${deviceId}`);
      await metadataCol.updateOne(
        { deviceId },
        { $set: { deviceId, metadata: meta } },
        { upsert: true }
      );
      return { deviceId, success: true };
    }));
    

    await client.close();
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').map(r => (r as any).reason?.message || 'Unknown error');
    return NextResponse.json({ success: true, synced: successCount, failed });
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 