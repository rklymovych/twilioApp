import React from 'react';

import Button from '@material-ui/core/Button';
import { VideoRoomMonitor } from '@twilio/video-room-monitor';

export default function OpenMonitor(props: { disabled?: boolean; className?: string }) {
  const openMonitor = () => {
    VideoRoomMonitor.openMonitor();
  };
  return (
    <Button className={props.className} onClick={openMonitor} data-cy-audio-toggle>
      Open Monitor
    </Button>
  );
}
