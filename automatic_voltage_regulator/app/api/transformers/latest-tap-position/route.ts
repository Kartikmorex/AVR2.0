import { NextRequest, NextResponse } from 'next/server';
import { DataAccess } from 'connector-userid-ts';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    // Get userId from cookies only
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'User ID cookie not found. Please set your User ID in settings.' }, { status: 401 });
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

    // Use sensorId D108 for tap position, fetch the latest (n=1), endTime = now
    const now = new Date();
    const result = await dataAccess.getDp({
      deviceId,
      sensorList: ['D108'],
      n: 1,
      endTime: now,
      cal: true,
      alias: false,
      unix: false,
    });

    if (Array.isArray(result) && result.length > 0) {
      return NextResponse.json({ tapPosition: result[0].value, time: result[0].time });
    } else {
      return NextResponse.json({ error: 'No tap position data found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
} 