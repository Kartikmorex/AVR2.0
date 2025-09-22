import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';
const COLLECTION = 'history';

export async function GET(req: NextRequest) {
  if (!MONGO_URI) {
    console.error('MONGO_URI environment variable is not set');
    return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
  }

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

    // Build query
    const query: any = deviceId ? { deviceId } : {};
    const total = await collection.countDocuments(query);
    const history = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    await client.close();
    return NextResponse.json({ history, total, page, pageSize });
  } catch (err: any) {
    await client.close();
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 