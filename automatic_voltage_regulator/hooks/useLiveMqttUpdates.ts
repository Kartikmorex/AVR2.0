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
      if (!MqttConnectorClass) {
        const module = await import('connector-userid-ts');
        MqttConnectorClass = module.MqttConnector;
      }
      if (!mqttConnector) {
        mqttConnector = new MqttConnectorClass({
          broker: "hap.faclon.com",
          port: 1883,
          username: "msetcladmin",
          password: "msetcl!@#$%",
        });
        await mqttConnector.connect();
      }
      return mqttConnector;
    };

    initMqtt().then((mqtt) => {
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
    });

    return () => { 
      if (mqttConnector) {
        mqttConnector.close(); 
      }
    };
  }, [metadataMap, setTransformers]);
} 