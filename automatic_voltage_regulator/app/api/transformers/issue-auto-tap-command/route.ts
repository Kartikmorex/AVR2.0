// API route for issuing tap commands in AUTO mode

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import {
  initAutomationResponseListener,
  getAutomationResponse,
  clearAutomationResponse
} from '@/lib/automationResponseListener';

const mqttConfig = {
  broker: process.env.MQTT_BROKER || 'localhost',
  port: process.env.MQTT_PORT ? Number(process.env.MQTT_PORT) : 1883,
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
};

let mqttConnector: any = null;
let MqttConnectorClass: any = null;

async function getMqttConnector() {
  if (!MqttConnectorClass) {
    const module = await import('connector-userid-ts');
    MqttConnectorClass = module.MqttConnector;
  }
  if (!mqttConnector) {
    mqttConnector = new MqttConnectorClass(mqttConfig);
    await mqttConnector.connect();
  }
  return mqttConnector;
}

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://cmvma_5Aqkej2:68564f332d5b37f13e530e05@cmvma-5aqkej2.iocompute.ai/';
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

// Helper function to retry async operations
async function retryAsync<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  delayMs: number,
  operationName: string
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`[${operationName}] Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`[${operationName}] All attempts failed`);
}

export async function POST(req: NextRequest) {
  const client = new MongoClient(MONGO_URI);
  try {
    console.log('[API] Auto Tap Command Triggered');
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const { deviceId, direction } = body;

    if (!deviceId || !['raise', 'lower'].includes(direction)) {
      return NextResponse.json(
        { success: false, error: 'deviceId and valid direction are required' },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    const transformer = await collection.findOne({ deviceId });

    if (!transformer) {
      await client.close();
      return NextResponse.json(
        { success: false, error: 'Transformer not found' },
        { status: 404 }
      );
    }

    const minDelay = transformer.minDelay ?? 11;
    const now = Date.now();
    const lastCmd = transformer.lastTapCommandTime
      ? new Date(transformer.lastTapCommandTime).getTime()
      : 0;

    if (lastCmd && now - lastCmd < minDelay * 1000) {
      await client.close();
      const remaining = Math.ceil(
        (minDelay * 1000 - (now - lastCmd)) / 1000
      );
      return NextResponse.json(
        {
          success: false,
          error: `Cooldown active. Please wait ${remaining} seconds before next command.`,
        },
        { status: 429 }
      );
    }

    // Initialize automation response listener
    await initAutomationResponseListener();

    const tag = direction === 'raise' ? 'D159' : 'D160';
    const value = '1';
    const mqtt = await getMqttConnector();
    const respTopic = `devicesIn/${deviceId}/automationresp`;
    const cmdTopic = `devicesOut/${deviceId}/autocmd`;
    const payload = {
      device: deviceId,
      time: now,
      data: [{ tag, value }],
    };

    // Clear any previous response for this device
    clearAutomationResponse(deviceId);

    // Publish the command
    console.log('[API] Publishing auto command to', cmdTopic, 'with payload', payload);
    await retryAsync(() => mqtt.publish(cmdTopic, payload), 3, 1000, "MQTT publish");

    // Wait for response
    const response = await getAutomationResponse(deviceId, 30000);

    const tapChangeHistoryCollection = db.collection('avrTapChangeHistory');
    if (response) {
      await tapChangeHistoryCollection.insertOne({
        deviceId,
        direction,
        mode: 'auto',
        timestamp: now,
        success: true
      });
      return NextResponse.json({ success: true, data: response });
    } else {
      await tapChangeHistoryCollection.insertOne({
        deviceId,
        direction,
        mode: 'auto',
        timestamp: now,
        success: false
      });
      return NextResponse.json(
        { success: false, error: 'No response received from device' },
        { status: 408 }
      );
    }
  } catch (error) {
    console.error('[API] Internal error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
