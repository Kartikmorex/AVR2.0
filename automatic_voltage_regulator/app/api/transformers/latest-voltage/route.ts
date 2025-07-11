import { NextRequest, NextResponse } from 'next/server';
import DataAccess from 'connector-userid-ts/dist/connectors/data/DataAccess';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
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

    // Use sensorId D150 for voltage, fetch the latest (n=1), endTime = now
    const now = new Date();
    const result = await dataAccess.getDp({
      deviceId,
      sensorList: ['D150'],
      n: 1,
      endTime: now,
      cal: true,
      alias: false,
      unix: false,
    });

    if (Array.isArray(result) && result.length > 0) {
      return NextResponse.json({ voltage: result[0].value, time: result[0].time });
    } else {
      return NextResponse.json({ error: 'No voltage data found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
} 