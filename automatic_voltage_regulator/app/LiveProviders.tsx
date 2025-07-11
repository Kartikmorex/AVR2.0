"use client";

import { TransformersProvider } from "@/context/TransformersContext";
import { useEffect, useState } from "react";
import { useLiveMqttUpdates } from "@/hooks/useLiveMqttUpdates";

function LiveMqttWrapper({ metadataMap, children }: { metadataMap: any, children: React.ReactNode }) {
  useLiveMqttUpdates(metadataMap);
  return <>{children}</>;
}

export default function LiveProviders({ children }: { children: React.ReactNode }) {
  const [metadataMap, setMetadataMap] = useState({});
  const [transformersLoaded, setTransformersLoaded] = useState(false);

  useEffect(() => {
    fetch("/avr/api/transformers/metadata")
      .then(res => res.json())
      .then(data => setMetadataMap(data.metadataMap || {}));
  }, []);

  useEffect(() => {
    fetch("/avr/api/transformers/list")
      .then(res => res.json())
      .then(data => setTransformersLoaded(true));
  }, []);

  return (
    <TransformersProvider>
      {transformersLoaded && (
        <LiveMqttWrapper metadataMap={metadataMap}>
          {children}
        </LiveMqttWrapper>
      )}
    </TransformersProvider>
  );
} 