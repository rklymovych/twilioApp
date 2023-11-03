import { useState, useCallback, useRef } from 'react';
import { LocalVideoTrack, LogLevels, Track, Room } from 'twilio-video';
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

export default function useScreenShareToggle(room: Room | null, onError: any) {
  const [isSharing, setIsSharing] = useState(false);
  const stopScreenShareRef = useRef<() => void>(null!);

  const shareScreen = useCallback(() => {
    navigator.mediaDevices
      .getDisplayMedia({
        audio: false,
        video: { frameRate: { max: 24 } },
      })
      .then(stream => {
        const customScreenSharing = localStorage.getItem('customScreenSharing');
        const myImage = document.getElementById('slideShare') as HTMLElement;
        const { innerHeight, outerHeight } = window;
        const slireShareRect = myImage.getBoundingClientRect();
        const { left, top, height } = slireShareRect;
        const width = height + outerHeight - innerHeight;

        let deviceId: any;
        let track: any;

        if (customScreenSharing === 'true') {
          // @ts-ignore
          const canvas =
            typeof OffscreenCanvas !== 'undefined'
              ? // @ts-ignore
                new OffscreenCanvas(128, 128)
              : document.createElement('canvas');

          const context = canvas.getContext('2d', {
            willReadFrequently: true,
          }) as CanvasRenderingContext2D;

          canvas.width = 128;
          canvas.height = 128;

          // NOTE(mmalavalli): Most modern versions of Chrome support the Insertable Streams API, which is a much more efficient
          // way of processing individual video frames. So, we use this API to crop the screen share video frames.
          // @ts-ignore
          if (
            typeof MediaStreamTrackGenerator !== 'undefined' &&
            typeof MediaStreamTrackProcessor !== 'undefined' &&
            typeof TransformStream !== 'undefined'
          ) {
            const [origScreenTrack] = stream.getVideoTracks();
            // @ts-ignore
            const generator = new MediaStreamTrackGenerator({ kind: 'video' });
            // @ts-ignore
            const processor = new MediaStreamTrackProcessor({ track: origScreenTrack });

            processor.readable
              .pipeThrough(
                new TransformStream({
                  // NOTE(mmalavalli): This function ensures that only those cropped video frames that
                  // record any movement on the screen are passed to the MediaStreamTrack.
                  // @ts-ignore
                  transform(frame: VideoFrame, controller: any) {
                    context.globalCompositeOperation = 'difference';
                    context.drawImage(
                      frame,
                      left,
                      top,
                      width * devicePixelRatio,
                      height * devicePixelRatio,
                      0,
                      0,
                      canvas.width,
                      canvas.height
                    );

                    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

                    let motionScore = 0;
                    for (let i = 0; i < data.length && motionScore < 5; i += 4) {
                      motionScore += Number(data[i] || data[i + 1] || data[i + 2]);
                    }

                    context.globalCompositeOperation = 'copy';
                    context.drawImage(
                      frame,
                      left,
                      top,
                      width * devicePixelRatio,
                      height * devicePixelRatio,
                      0,
                      0,
                      canvas.width,
                      canvas.height
                    );

                    if (motionScore >= 5) {
                      // @ts-ignore
                      controller.enqueue(
                        new VideoFrame(frame, {
                          visibleRect: {
                            x: left,
                            y: top,
                            width: width * devicePixelRatio,
                            height: height * devicePixelRatio,
                          },
                        })
                      );
                    }

                    frame.close();
                  },
                })
              )
              .pipeTo(generator.writable);

            const newStream = new MediaStream([generator]);
            track = newStream.getVideoTracks()[0];
            deviceId = track.getSettings().deviceId;

            testCropp(null, newStream);
          } else {
            // NOTE(mmalavalli): For browsers that do not support the Insertable Streams API, we add a
            // VideoProcessor to the screen share track which crops and passes through only those video
            // frames that record any movement on the screen.
            track = new LocalVideoTrack(stream.getTracks()[0], { name: 'screen' });
            track.addProcessor({
              processFrame(input: any, output: any) {
                context.globalCompositeOperation = 'difference';
                context.drawImage(
                  input,
                  left,
                  top,
                  width * devicePixelRatio,
                  height * devicePixelRatio,
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );

                const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

                let motionScore = 0;
                for (let i = 0; i < data.length && motionScore < 5; i += 4) {
                  motionScore += Number(data[i] || data[i + 1] || data[i + 2]);
                }

                context.globalCompositeOperation = 'copy';
                context.drawImage(
                  input,
                  left,
                  top,
                  width * devicePixelRatio,
                  height * devicePixelRatio,
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );

                if (motionScore >= 5) {
                  output
                    .getContext('2d')
                    .drawImage(
                      input,
                      left,
                      top,
                      width * devicePixelRatio,
                      height * devicePixelRatio,
                      (output.width - width * devicePixelRatio) >> 1,
                      (output.height - height * devicePixelRatio) >> 1,
                      width * devicePixelRatio,
                      height * devicePixelRatio
                    );
                }
              },
            });
            deviceId = track.processedTrack.getSettings().deviceId;
            testCropp(null, new MediaStream([track.processedTrack]));
          }

          // NOTE(mmalavalli): Since we are publishing a processed version of the screen share track,
          // this makes sure that the adaptive simulcast feature performs temporal degradation instead
          // of spatial degradation.
          // @ts-ignore
          const pcv2 = [...room!._signaling._peerConnectionManager._peerConnections.values()][0];
          const updateEncodings = pcv2._updateEncodings;
          pcv2._updateEncodings = function _updateEncodings(
            track: MediaStreamTrack,
            encodings: RTCRtpEncodingParameters[],
            trackReplaced: boolean
          ) {
            updateEncodings.apply(pcv2, [track, encodings, trackReplaced]);
            if (track.getSettings().deviceId === deviceId) {
              const screenShareActiveLayerConfig = [
                { maxFramerate: 5, scaleResolutionDownBy: 1 },
                { scaleResolutionDownBy: 1 },
              ];
              encodings.forEach((encoding, i) => {
                const activeLayerConfig = screenShareActiveLayerConfig[i];
                if (activeLayerConfig) {
                  encoding.scaleResolutionDownBy = activeLayerConfig.scaleResolutionDownBy;
                  if ('maxFramerate' in activeLayerConfig) {
                    // @ts-ignore
                    encoding.maxFramerate = activeLayerConfig.maxFramerate;
                  }
                  if (trackReplaced) {
                    delete encoding.active;
                  }
                } else {
                  encoding.active = false;
                  delete encoding.scaleResolutionDownBy;
                }
              });
            }
          };
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
