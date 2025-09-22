import { NextRequest, NextResponse } from 'next/server';
import { DataAccess } from 'connector-userid-ts';
import { getUserIdFromRequest } from '@/lib/auth';

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