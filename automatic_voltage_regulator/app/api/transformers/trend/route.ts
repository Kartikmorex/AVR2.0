import { NextRequest, NextResponse } from 'next/server';
import DataAccess from 'connector-userid-ts/dist/connectors/data/DataAccess';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    const sensorId = searchParams.get('sensorId'); // comma-separated
    const startTime = searchParams.get('startTime'); // unix ms
    const endTime = searchParams.get('endTime'); // unix ms

    if (!deviceId || !sensorId || !startTime || !endTime) {
      return NextResponse.json({ error: 'deviceId, sensorId, startTime, and endTime are required' }, { status: 400 });
    }

    // These values should be set as per your environment or config
    const userId = '61dfcee73ba65478ecf10c57'; // TODO: Replace with dynamic value if needed
    const dataUrl = 'datads.iosense.io';
    const dsUrl = 'datads.iosense.io';

    const dataAccess = new DataAccess({
      userId,
      dataUrl,
      dsUrl,
      onPrem: false,
      tz: 'UTC',
    });

    // Parse sensor list
    const sensorList = sensorId.split(',').map(s => s.trim()).filter(Boolean);
    if (!sensorList.length) {
      return NextResponse.json({ error: 'At least one sensorId must be provided' }, { status: 400 });
    }

    // Parse times
    const start = Number(startTime);
    const end = Number(endTime);
    if (isNaN(start) || isNaN(end)) {
      return NextResponse.json({ error: 'startTime and endTime must be valid unix timestamps (ms)' }, { status: 400 });
    }

    const result = await dataAccess.dataQuery({
      deviceId,
      sensorList,
      startTime: start,
      endTime: end,
      cal: true,
      alias: false,
      unix: false,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
} 