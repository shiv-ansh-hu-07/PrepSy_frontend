import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';

export default function LiveKitRoomWrapper({ roomId, userId }) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${import.meta.env.VITE_API_BASE_URL}/livekit/token?room=${roomId}&user=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setToken(data.token);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, userId]);

  if (!token) return <>Loading room...</>;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={import.meta.env.VITE_LIVEKIT_WS_URL}
      connect={true}
      video={true}
      audio={true}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
