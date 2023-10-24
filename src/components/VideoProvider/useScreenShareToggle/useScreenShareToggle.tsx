import { useState, useCallback, useRef } from 'react';
import { LogLevels, Track, Room } from 'twilio-video';
import { VideoRoomMonitor } from '@twilio/video-room-monitor';

interface MediaStreamTrackPublishOptions {
  name?: string;
  priority: Track.Priority;
  logLevel: LogLevels;
}

function testCropp(screenTrack: any, mediaStream: any) {
  const target = document.getElementById('myImage') as HTMLElement;
  const videoElement = target.querySelector('video');
  let video: any;
  if (!videoElement) {
    video = document.createElement('video');
    video.style.width = '35vw';
    video.style.height = 'auto';
  } else {
    video = target.querySelector('video');
  }

  video.srcObject = screenTrack ? screenTrack : mediaStream;
  video.play();

  if (!videoElement) {
    target.appendChild(video);
  }
}

function getCanvasMedia(stream: MediaStream) {
  const fpsInterval = 1000 / 24;
  let lastRenderTime = 0;

  const myCanvas = document.getElementById('myCanvas') as HTMLCanvasElement;
  const ctx = myCanvas.getContext('2d') as CanvasRenderingContext2D;

  const myImage = document.getElementById('myImage') as HTMLVideoElement;
  const myVideo = document.getElementById('myVideo') as HTMLVideoElement;

  const imgOffset = myImage.getBoundingClientRect();
  const imgPercent = imgOffset.width / imgOffset.height;
  myVideo.srcObject = stream;
  myVideo.play();
  myCanvas.height = myCanvas.width / imgPercent;

  // @ts-ignore
  const streamCanvas = myCanvas.captureStream();

  const top = window.screenY + window.outerHeight - window.innerHeight + imgOffset.top;
  const left = window.screenX + imgOffset.left;
  const width = imgOffset.width;
  const height = imgOffset.height;

  const flag: string = 'requestAnimationFrame'; // 'setInterval', 'requestAnimationFrame', 'ontimeupdate', 'none'
  // ngrok http 3000 --host-header="localhost:3000"

  switch (flag) {
    case 'ontimeupdate':
      console.log('%c ontimeupdate ===>', 'background-color: grey');
      myVideo.ontimeupdate = ev => {
        // console.log(Date.now());
        // ctx.drawImage(myVideo, 0, 0, myCanvas.width, myCanvas.height);
        ctx.drawImage(myVideo, left, top, width, height, 0, 0, myCanvas.width, myCanvas.height);
      };
      break;
    case 'setInterval':
      console.log('%c setInterval ===>', 'background-color: grey');
      setInterval(() => {
        console.log(Date.now());
        // ctx.drawImage(myVideo, 0, 0, myCanvas.width, myCanvas.height);
        ctx.drawImage(myVideo, left, top, width, height, 0, 0, myCanvas.width, myCanvas.height);
      }, 100);
      break;
    case 'requestAnimationFrame':
      console.log('%c requestAnimationFrame ===>', 'background-color: grey');
      window.requestAnimationFrame(go);
      break;
    default:
      console.log('NONE');
      break;
  }

  function go(currentTime: number) {
    const deltaTime = currentTime - lastRenderTime;

    if (deltaTime >= fpsInterval) {
      ctx.drawImage(myVideo, left, top, width, height, 0, 0, myCanvas.width, myCanvas.height);
      lastRenderTime = currentTime - (deltaTime % fpsInterval);
    }
    window.requestAnimationFrame(go);
    // ctx.drawImage(myVideo, left, top, width, height, 0, 0, myCanvas.width, myCanvas.height);
  }

  return { streamCanvas };
}

export default function useScreenShareToggle(room: Room | null, onError: any) {
  const [isSharing, setIsSharing] = useState(false);
  const stopScreenShareRef = useRef<() => void>(null!);

  const shareScreen = useCallback(() => {
    navigator.mediaDevices
      .getDisplayMedia({
        audio: false,
        video: true,
      })
      .then(stream => {
        const customScreenSharing = localStorage.getItem('customScreenSharing');

        let track: any;
        if (customScreenSharing === 'true') {
          const { streamCanvas } = getCanvasMedia(stream);
          track = streamCanvas.getTracks()[0];
          testCropp(null, streamCanvas);
        } else {
          console.log('NO Cropping');
          track = stream.getTracks()[0];
          testCropp(stream, null);
        }
        VideoRoomMonitor.openMonitor();

        // All video tracks are published with 'low' priority. This works because the video
        // track that is displayed in the 'MainParticipant' component will have it's priority
        // set to 'high' via track.setPriority()
        room!.localParticipant
          .publishTrack(track, {
            name: 'screen', // Tracks can be named to easily find them later
            priority: 'high', // Priority is set to high by the subscriber when the video track is rendered
          } as MediaStreamTrackPublishOptions)
          .then(trackPublication => {
            stopScreenShareRef.current = () => {
              room!.localParticipant.unpublishTrack(track);
              // TODO: remove this if the SDK is updated to emit this event
              room!.localParticipant.emit('trackUnpublished', trackPublication);
              track.stop();
              setIsSharing(false);
            };

            track.onended = stopScreenShareRef.current;
            setIsSharing(true);
          })
          .catch(onError);
      })
      .catch(error => {
        // Don't display an error if the user closes the screen share dialog
        if (
          error.message === 'Permission denied by system' ||
          (error.name !== 'AbortError' && error.name !== 'NotAllowedError')
        ) {
          console.error(error);
          onError(error);
        }
      });
  }, [room, onError]);

  const toggleScreenShare = useCallback(() => {
    if (room) {
      !isSharing ? shareScreen() : stopScreenShareRef.current();
    }
  }, [isSharing, shareScreen, room]);

  return [isSharing, toggleScreenShare] as const;
}
