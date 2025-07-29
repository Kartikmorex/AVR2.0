import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { DataAccess } from 'connector-userid-ts';

const MONGO_URI = 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const DEVICES_COLLECTION = 'userTransformers';
const METADATA_COLLECTION = 'userTransformerMetadata';

export async function POST(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
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

    const dataAccess = new DataAccess({
      userId: '61dfcee73ba65478ecf10c57', // or from env
      dataUrl: 'datads.iosense.io',
      dsUrl: 'datads.iosense.io',
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