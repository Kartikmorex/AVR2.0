import { useEffect, useState } from 'react';

export function useLiveTransformerData(deviceId: string, transformer?: any) {
  const [latestTapPosition, setLatestTapPosition] = useState<number | null>(null);
  const [latestVoltage, setLatestVoltage] = useState<number | null>(null);
  const [latestCurrent, setLatestCurrent] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voltageError, setVoltageError] = useState<boolean>(false);
  const [voltageTime, setVoltageTime] = useState<string | null>(null);
  const [currentError, setCurrentError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setVoltageError(false);
    setVoltageTime(null);
    setCurrentError(false);
    // Fetch tap position
    fetch(`/avr/api/transformers/latest-tap-position?deviceId=${encodeURIComponent(deviceId)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && typeof data.tapPosition === 'number') setLatestTapPosition(data.tapPosition);
      });
    // Fetch voltage
    fetch(`/avr/api/transformers/latest-voltage?deviceId=${encodeURIComponent(deviceId)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (typeof data.voltage === 'number') {
            setLatestVoltage(data.voltage);
            setVoltageTime(data.time || null);
            setVoltageError(false);
          } else {
            setLatestVoltage(null);
            setVoltageTime(null);
            setVoltageError(true);
          }
        }
      })
      .finally(() => { if (isMounted) setLoading(false); });
    // Fetch current
    fetch(`/avr/api/transformers/latest-current?deviceId=${encodeURIComponent(deviceId)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (typeof data.current === 'number') {
            setLatestCurrent(data.current);
            setCurrentTime(data.time || null);
            // Compute currentError if transformer is provided
            if (transformer && transformer.currentRating) {
              const { ratedCurrent, overCurrentLimit } = transformer.currentRating;
              if ((ratedCurrent !== undefined && data.current > ratedCurrent) ||
                  (overCurrentLimit !== undefined && data.current > overCurrentLimit)) {
                setCurrentError(true);
              } else {
                setCurrentError(false);
              }
            }
          } else {
            setLatestCurrent(null);
            setCurrentTime(null);
            setCurrentError(false);
          }
        }
      });
    return () => { isMounted = false; };
  }, [deviceId, transformer]);

  return { latestTapPosition, latestVoltage, loading, voltageError, voltageTime, latestCurrent, currentError, currentTime };
} 