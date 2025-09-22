import { useEffect } from "react";
import { useTransformersContext } from "@/context/TransformersContext";

function parseTags(dataArray: any, tagMap: any) {
  const result: any = {};
  for (const [frontendField, tagName] of Object.entries(tagMap)) {
    const found = dataArray.find((d: any) => d.tag === tagName);
    if (found) {
      result[frontendField] = Number(found.value);
    }
  }
  return result;
}

export function useLiveMqttUpdates(metadataMap: any) {
  const { setTransformers } = useTransformersContext();

  useEffect(() => {
    let mqttConnector: any = null;
    let MqttConnectorClass: any = null;

    const initMqtt = async () => {
      try {
        if (!MqttConnectorClass) {
          const module = await import('connector-userid-ts');
          MqttConnectorClass = module.MqttConnector;
        }
        if (!mqttConnector) {
          mqttConnector = new MqttConnectorClass({
            broker: process.env.NEXT_PUBLIC_MQTT_BROKER || "hap.faclon.com",
            port: parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "1883"),
            username: process.env.NEXT_PUBLIC_MQTT_USERNAME || "msetcladmin",
            password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || "msetcl!@#$%",
          });
          await mqttConnector.connect();
        }
        return mqttConnector;
      } catch (error) {
        console.warn('Failed to initialize MQTT connection:', error);
        throw error;
      }
    };

    initMqtt()
      .then((mqtt) => {
        mqtt.subscribeToAllDevices((deviceId: any, deviceData: any) => {
          const tagMap = metadataMap[deviceId]?.tagMap;
          if (!tagMap) return;
          const parsed = parseTags(deviceData.data, tagMap);
          setTransformers((prev: any) =>
            prev.map((t: any) =>
              t.deviceId === deviceId
                ? { ...t, ...parsed }
                : t
            )
          );
        });
      })
      .catch((error) => {
        console.warn('MQTT connection failed:', error.message);
        // Application continues to work without real-time updates
      });

    return () => { 
      if (mqttConnector) {
        try {
          mqttConnector.close(); 
        } catch (error) {
          console.warn('Error closing MQTT connection:', error);
        }
      }
    };
  }, [metadataMap, setTransformers]);
} 