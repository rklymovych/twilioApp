import { useRef } from 'react';

export default function ComponentForSharing() {
  const myRef = useRef(null);
  const makeFontSize = (numMax: number, numMin: number) => {
    for (let i = numMax; i > numMin; i -= 2) {
      const p = document.createElement('p');
      p.innerText = `Test Font Size ${i} px`;
      p.style.fontSize = `${i}px`;

      const mainDiv = myRef.current as any;
      // @ts-ignore
      if (mainDiv) {
        mainDiv.appendChild(p);
      }
    }
  };

  makeFontSize(100, 6);

  return <div ref={myRef} style={{ background: 'white', width: '65vw', height: '100vh', overflowY: 'scroll' }}></div>;
}
