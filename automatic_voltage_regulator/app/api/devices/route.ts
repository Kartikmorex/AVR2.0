import { NextResponse, NextRequest } from 'next/server';
// Import DataAccess from the connector-userid-ts package
import { DataAccess } from 'connector-userid-ts';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
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

  try {
    // Print metadata for device ID 'ABRL_TEST'
    try {
      const meta = await dataAccess.getDeviceMetaData('ABRL_TEST');
      console.log('Metadata packet for device ABRL_TEST:', meta);
    } catch (metaErr) {
      console.error('Failed to fetch metadata for ABRL_TEST:', metaErr);
    }

    const devices = await dataAccess.getDeviceDetails();
    console.log('Payload from getDeviceDetails:', devices);
    return NextResponse.json(devices);
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || String(error) }, { status: 500 });
  }
} 