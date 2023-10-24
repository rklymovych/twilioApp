import React, { useEffect } from 'react';
import img from './ZiClJf-1920w.jpg';
import ComponentForSharing from './ComponentForSharing/ComponentForSharing';

export const Canvas = () => {
  return (
    <>
      <div>
        <div id="myImage" style={{ display: 'flex', alignItems: 'flex-start' }}>
          <ComponentForSharing />
        </div>

        {/*<img id="myImage" src={img} alt="" style={{width: '80vw'}}/>*/}
        {/*https://webrtc.github.io/samples/src/video/chrome.webm*/}
        {/*https://webrtc.github.io/samples/src/video/mixed-content.webm*/}
        {/*<video id="myImage" src="https://webrtc.github.io/samples/src/video/mixed-content.webm" style={{width: '70vw'}} loop={true} autoPlay={true} controls={true} muted={true}/>*/}
        {/*<br/>*/}
        <canvas id="myCanvas" width={1720} style={{ width: '300px' }} />
      </div>

      <div style={{ width: '400px' }}>
        <video id="myVideo" src="" muted={true} autoPlay={true} controls={true} style={{ display: 'none' }} />
      </div>
    </>
  );
};
