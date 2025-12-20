import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';

export default function LiveKitRoomWrapper({ roomId, userId }) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/livekit/token?room=${roomId}&user=${userId}`)
      .then(res => res.json())
      .then(data => setToken(data.token));
  }, []);

  if (!token) return <>Loading room...</>;

  return (
    <LiveKitRoom
      token={token}
      serverUrl="ws://localhost:7881"
      connect={true}
      video={true}
      audio={true}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
