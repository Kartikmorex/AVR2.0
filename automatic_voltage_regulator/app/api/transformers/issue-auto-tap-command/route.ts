// API route for issuing tap commands in AUTO mode
// This is a copy of the manual tap command route, with extra logging for auto mode
import { NextRequest, NextResponse } from 'next/server';
import { MqttConnector } from 'connector-userid-ts/dist/connectors/pubsub/mqttHandler';
import { MongoClient } from 'mongodb';
import { initAutomationResponseListener, getAutomationResponse, clearAutomationResponse } from '@/lib/automationResponseListener';

// Use environment variables for MQTT config
const mqttConfig = {
  broker: process.env.MQTT_BROKER || 'localhost',
  port: process.env.MQTT_PORT ? Number(process.env.MQTT_PORT) : 1883,
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
};

let mqttConnector: MqttConnector | null = null;
async function getMqttConnector() {
  if (!mqttConnector) {
    mqttConnector = new MqttConnector(mqttConfig);
    await mqttConnector.connect();
  }
  return mqttConnector;
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

export async function POST(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
  try {
    console.log('[ISSUE AUTO TAP COMMAND] API called');
    const rawBody = await req.text();
    console.log('[ISSUE AUTO TAP COMMAND] Raw request body:', rawBody);
    const body = JSON.parse(rawBody);
    console.log('[ISSUE AUTO TAP COMMAND] Parsed body:', body);
    const { deviceId, direction } = body;
    if (!deviceId || !['raise', 'lower'].includes(direction)) {
      return NextResponse.json({ success: false, error: 'deviceId and valid direction are required' }, { status: 400 });
    }
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    // Fetch transformer and check cooldown
    const transformer = await collection.findOne({ deviceId });
    if (!transformer) {
      await client.close();
      return NextResponse.json({ success: false, error: 'Transformer not found' }, { status: 404 });
    }
    const minDelay = transformer.minDelay ?? 11;
    const now = Date.now();
    const lastCmd = transformer.lastTapCommandTime ? new Date(transformer.lastTapCommandTime).getTime() : 0;
    if (lastCmd && now - lastCmd < minDelay * 1000) {
      await client.close();
      const remaining = Math.ceil((minDelay * 1000 - (now - lastCmd)) / 1000);
      return NextResponse.json({ success: false, error: `Cooldown active. Please wait ${remaining} seconds before next command.` }, { status: 429 });
    }
    const tag = direction === 'raise' ? 'D159' : 'D160';
    const value = '1';
    const mqtt = await getMqttConnector();
    // Ensure the automation response listener is running
    await initAutomationResponseListener();
    // Log MQTT config, topic, and payload
    console.log('[ISSUE AUTO TAP COMMAND] MQTT Config:', mqttConfig);
    const topic = `devicesOut/${deviceId}/autocmd`;
    const payload = {
      device: deviceId,
      time: now,
      data: [{ tag, value }]
    };
    console.log('[ISSUE AUTO TAP COMMAND] Publishing to topic:', topic);
    console.log('[ISSUE AUTO TAP COMMAND] Payload:', JSON.stringify(payload));
    await mqtt.publish(topic, payload);
    // Poll for response in the automation response map
    const pollTimeout = 30000; // 30 seconds
    const pollInterval = 300; // ms
    const start = Date.now();
    let foundResponse = null;
    while (Date.now() - start < pollTimeout) {
      const entry = getAutomationResponse(deviceId);
      if (entry && entry.timestamp > now - 2000) { // only accept responses after command
        foundResponse = entry.response;
        break;
      }
      await new Promise(res => setTimeout(res, pollInterval));
    }
    clearAutomationResponse(deviceId);
    if (foundResponse && typeof foundResponse.success === 'boolean') {
      if (foundResponse.success) {
        await collection.updateOne({ deviceId }, { $set: { lastTapCommandTime: new Date(now).toISOString() } });
        await client.close();
        return NextResponse.json({ success: true });
      } else {
        await client.close();
        return NextResponse.json({ success: false, error: 'Command failed on device' }, { status: 504 });
      }
    } else {
      await client.close();
      return NextResponse.json({ success: false, error: 'No response from device (timeout)' }, { status: 504 });
    }
  } catch (err: any) {
    console.error('[ISSUE AUTO TAP COMMAND] Error:', err);
    await client.close();
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 