import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { DataAccess } from 'connector-userid-ts';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';

export async function GET(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
  try {
    // 1. Load all devices from iosense user account
    const userId = '61dfcee73ba65478ecf10c57';
    const dataUrl = 'datads.iosense.io';
    const dsUrl = 'datads.iosense.io';
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

    // 3. Fetch all deviceId from userTransformers
    await client.connect();
    const db = client.db(DB_NAME);
    const userTransformers = await db.collection('userTransformers').find({}, { projection: { deviceId: 1, _id: 0 } }).toArray();
    const userDeviceIds = userTransformers.map(t => t.deviceId);
    console.log('Step 3: deviceIds in userTransformers:', userDeviceIds);

    // 4. Return only ABRL_TRACOMO devices whose devID is not present in userTransformers.deviceId
    const availableDevicesRaw = abrlDevices.filter((d: any) => !userDeviceIds.includes(d.devID));
    console.log('Step 4: Raw available devices:', availableDevicesRaw);

    // 5. For each available device, fetch its metadata and get devName from metadata if available
    const availableDevices = [];
    for (const device of availableDevicesRaw) {
      let devName = device.devName || device.name || device.devID;
      try {
        const meta = await dataAccess.getDeviceMetaData(device.devID);
        if (meta && typeof meta === 'object') {
          if ('devName' in meta && meta.devName) {
            devName = meta.devName;
          } else if ('name' in meta && meta.name) {
            devName = meta.name;
          }
        }
        console.log(`Fetched metadata for ${device.devID}:`, meta);
      } catch (err) {
        console.log(`No metadata found for ${device.devID}, using fallback devName:`, devName);
      }
      availableDevices.push({
        devID: device.devID,
        devTypeID: device.devTypeID,
        devName,
      });
    }
    console.log('Step 5: Final available devices with metadata:', availableDevices);

    await client.close();
    return NextResponse.json(availableDevices);
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 