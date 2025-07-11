import { useEffect } from "react";
import { MqttConnector } from "connector-userid-ts/src/connectors/pubsub/mqttHandler";
import { useTransformersContext } from "@/context/TransformersContext";

function parseTags(dataArray, tagMap) {
  const result = {};
  for (const [frontendField, tagName] of Object.entries(tagMap)) {
    const found = dataArray.find(d => d.tag === tagName);
    if (found) {
      result[frontendField] = Number(found.value);
    }
  }
  return result;
}

export function useLiveMqttUpdates(metadataMap) {
  const { setTransformers } = useTransformersContext();

  useEffect(() => {
    const mqtt = new MqttConnector({
      broker: "hap.faclon.com",
      port: 1883,
      username: "msetcladmin",
      password: "msetcl!@#$%",
    });

    mqtt.connect().then(() => {
      mqtt.subscribeToAllDevices((deviceId, deviceData) => {
        const tagMap = metadataMap[deviceId]?.tagMap;
        if (!tagMap) return;
        const parsed = parseTags(deviceData.data, tagMap);
        setTransformers(prev =>
          prev.map(t =>
            t.deviceId === deviceId
              ? { ...t, ...parsed }
              : t
          )
        );
      });
    });

    return () => { mqtt.close(); };
  }, [metadataMap, setTransformers]);
} 