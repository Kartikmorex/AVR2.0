import { MqttConnector } from 'connector-userid-ts/dist/connectors/pubsub/mqttHandler';

const mqttConfig = {
  broker: process.env.MQTT_BROKER || 'localhost',
  port: process.env.MQTT_PORT ? Number(process.env.MQTT_PORT) : 1883,
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
};

// In-memory map: deviceId -> response object
const responseMap: Map<string, { response: any, timestamp: number }> = new Map();
let initialized = false;
let mqttConnector: MqttConnector | null = null;

export async function initAutomationResponseListener() {
  if (initialized) return;
  mqttConnector = new MqttConnector(mqttConfig);
  await mqttConnector.connect();
  const topics = ['devicesIn/+/automationresp', 'devicesIn/+/autoresp'];
  for (const topic of topics) {
    await mqttConnector.subscribe(topic, (receivedTopic, message) => {
      console.log('[AutomationListener] Raw message received:', receivedTopic, message);
      try {
        const parts = receivedTopic.split('/');
        const deviceId = parts[1];
        let parsedMessage = message;
        if (typeof message === 'string') {
          try {
            parsedMessage = JSON.parse(message);
          } catch (e) {
            // Not valid JSON, leave as string
          }
        }
        console.log('[AutomationListener] Received message:', receivedTopic, message);
        console.log('[AutomationListener] Parsed response object:', JSON.stringify(parsedMessage));
        responseMap.set(deviceId, { response: parsedMessage, timestamp: Date.now() });
      } catch (err) {
        console.error('[AutomationListener] Error processing message:', err);
      }
    });
    console.log('[AutomationListener] Subscribed to', topic);
  }
  initialized = true;
}

export function getAutomationResponse(deviceId: string): { response: any, timestamp: number } | undefined {
  return responseMap.get(deviceId);
}

export function clearAutomationResponse(deviceId: string) {
  responseMap.delete(deviceId);
} 