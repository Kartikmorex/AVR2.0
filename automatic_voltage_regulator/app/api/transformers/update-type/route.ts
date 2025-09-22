import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

export async function PATCH(req: NextRequest) {
  if (!MONGO_URI) {
    console.warn('MONGO_URI environment variable not set');
    return NextResponse.json({ success: false, error: 'Database configuration missing' }, { status: 500 });
  }
  
  const client = new MongoClient(MONGO_URI);
  try {
    const { deviceId, type } = await req.json();
    if (!deviceId || !type) {
      return NextResponse.json({ error: 'Missing deviceId or type' }, { status: 400 });
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    const result = await collection.updateOne(
      { deviceId },
      { $set: { type } }
    );
    await client.close();
    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'Transformer not found or type unchanged' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Type updated successfully' });
  } catch (error: any) {
    await client.close();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 