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
    console.log('[ISSUE TAP COMMAND] API called');
    const rawBody = await req.text();
    console.log('[ISSUE TAP COMMAND] Raw request body:', rawBody);
    const body = JSON.parse(rawBody);
    console.log('[ISSUE TAP COMMAND] Parsed body:', body);
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
    // Log MQTT config, topic, and payload
    console.log('MQTT Config:', mqttConfig);
    const topic = `devicesOut/${deviceId}/autocmd`;
    const payload = {
      device: deviceId,
      time: now,
      data: [{ tag, value }]
    };
    // Ensure the automation response listener is running, but do not block publish if it fails
    console.log('[API] Before listener init');
    try {
      await initAutomationResponseListener();
      console.log('[API] Listener init successful');
    } catch (err) {
      console.error('[API] Listener init failed:', err);
    }
    // Subscribe to the response topic for this device before publishing
    const respTopics = [
      `devicesIn/${String(deviceId)}/automationresp`,
      `devicesIn/${String(deviceId)}/autoresp`,
    ];
    let foundResponse = null;
    let resolved = false;
    const waitForResponse = new Promise((resolve) => {
      let timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          for (const topic of respTopics) {
            (mqtt as any).unsubscribe(topic).catch(() => {});
          }
          console.log('[API] Timeout: No response received after 30s');
          resolve(null);
        }
      }, 30000);
      let subscribeCount = 0;
      for (const topic of respTopics) {
        mqtt.subscribe(topic, (receivedTopic, message) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          for (const t of respTopics) {
            (mqtt as any).unsubscribe(t).catch(() => {});
          }
          let parsedMessage = message;
          if (typeof message === 'string') {
            try {
              parsedMessage = JSON.parse(message);
            } catch {}
          }
          console.log('[API] Received response on', receivedTopic, parsedMessage);
          resolve(parsedMessage);
        }).then(() => {
          subscribeCount++;
          if (subscribeCount === respTopics.length) {
            console.log('[API] Subscribed to all response topics, now publishing command');
            // Publish the command only after all subscriptions are set up
            console.log('[API] Before publish');
            console.log('Publishing to topic:', topic);
            console.log('Payload:', JSON.stringify(payload));
            mqtt.publish(topic, payload).then(() => {
              console.log('[API] After publish');
            });
          }
        }).catch((err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            for (const t of respTopics) {
              (mqtt as any).unsubscribe(t).catch(() => {});
            }
            console.error('[API] Subscribe error:', err);
            resolve(null);
          }
        });
      }
    });
    try {
      foundResponse = await waitForResponse;
      if (foundResponse && typeof foundResponse === 'object' && 'success' in foundResponse && typeof foundResponse.success === 'boolean') {
        if ((foundResponse as any).success) {
          await collection.updateOne({ deviceId }, { $set: { lastTapCommandTime: new Date(now).toISOString() } });
          await client.close();
          console.log('[API] Returning success response');
          return NextResponse.json({ success: true });
        } else {
          await client.close();
          console.log('[API] Returning device failure response');
          return NextResponse.json({ success: false, error: 'Command failed on device' }, { status: 504 });
        }
      } else {
        await client.close();
        console.log('[API] Returning timeout response');
        return NextResponse.json({ success: false, error: 'No response from device (timeout)' }, { status: 504 });
      }
    } catch (err) {
      await client.close();
      console.error('[API] Unexpected error in response wait:', err);
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('[ISSUE TAP COMMAND] Error:', err);
    await client.close();
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 