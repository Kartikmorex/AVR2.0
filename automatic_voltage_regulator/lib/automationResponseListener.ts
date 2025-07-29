// Import with type assertion to bypass module resolution issues
const mqttConfig = {
  broker: process.env.MQTT_BROKER || 'localhost',
  port: process.env.MQTT_PORT ? Number(process.env.MQTT_PORT) : 1883,
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
};

const responseMap: Map<string, { response: any, timestamp: number }> = new Map();
let initialized = false;
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

export async function initAutomationResponseListener() {
  if (initialized) return;
  
  const mqtt = await getMqttConnector();
  const topics = ['devicesIn/+/automationresp', 'devicesIn/+/autoresp'];
  
  for (const topic of topics) {
    mqtt.subscribe(topic, (receivedTopic: string, message: any) => {
      try {
        const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
        const deviceId = receivedTopic.split('/')[1];
        const timestamp = Date.now();
        
        responseMap.set(deviceId, {
          response: parsedMessage,
          timestamp: timestamp
        });
        
        console.log(`[Automation] Response received for device ${deviceId}:`, parsedMessage);
      } catch (error) {
        console.error('[Automation] Error parsing message:', error);
      }
    }).catch((error: any) => {
      console.error(`[Automation] Error subscribing to ${topic}:`, error);
    });
  }
  
  initialized = true;
  console.log('[Automation] Response listener initialized');
}

export function getAutomationResponse(deviceId: string, timeoutMs: number = 30000): Promise<any> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkResponse = () => {
      const entry = responseMap.get(deviceId);
      
      if (entry && (Date.now() - entry.timestamp) < timeoutMs) {
        responseMap.delete(deviceId);
        resolve(entry.response);
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        resolve(null);
        return;
      }
      
      setTimeout(checkResponse, 100);
    };
    
    checkResponse();
  });
}

export function clearAutomationResponse(deviceId: string) {
  responseMap.delete(deviceId);
} 