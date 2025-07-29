import { NextResponse } from 'next/server';
// Import DataAccess from the connector-userid-ts package
import { DataAccess } from 'connector-userid-ts';

export async function GET() {
  // Use the provided userId
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