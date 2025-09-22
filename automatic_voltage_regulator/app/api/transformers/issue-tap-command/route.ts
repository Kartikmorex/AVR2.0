import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

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

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'AVR';
const COLLECTION = 'userTransformers';

export async function POST(req: NextRequest) {
  if (!MONGO_URI) {
    console.error('MONGO_URI environment variable is not set');
    return NextResponse.json({ success: false, error: 'Database configuration error' }, { status: 500 });
  }

  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  try {
    console.log('[API] Tap Command Triggered');
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

    let resolved = false;
    let responseData: any = null;

    const waitForResponse = new Promise((resolve) => {
      const timer = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          console.log('[API] Timeout: No response after 30s');
          resolve(null);
        }
      }, 30000);

      // Subscribe to response topic
      mqtt.subscribe(respTopic, (topic: string, message: any) => {
        if (resolved) return;

        let parsed: any;
        try {
          parsed = typeof message === 'string' ? JSON.parse(message) : message;
        } catch {
          console.log('[API] Ignored: Invalid JSON');
          return;
        }

        if (typeof parsed !== 'object' || typeof parsed.success !== 'boolean') {
          console.log('[API] Ignored: No valid success field');
          return;
        }

        resolved = true;
        clearTimeout(timer);
        responseData = parsed;
        console.log('[API] Resolved with message:', parsed);
        resolve(parsed);
      }).then(() => {
        // After subscribing, publish the command
        console.log('[API] Publishing command to', cmdTopic, 'with payload', payload);
        return mqtt.publish(cmdTopic, payload);
      }).catch((err: any) => {
        resolved = true;
        clearTimeout(timer);
        console.log('[API] Error:', err);
        resolve(null);
      });
    });

    const response = await waitForResponse;

    const tapChangeHistoryCollection = db.collection('avrTapChangeHistory');
    if (response) {
      await tapChangeHistoryCollection.insertOne({
        deviceId,
        direction,
        mode: 'manual',
        timestamp: now,
        success: true
      });
      return NextResponse.json({ success: true, data: response });
    } else {
      await tapChangeHistoryCollection.insertOne({
        deviceId,
        direction,
        mode: 'manual',
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
