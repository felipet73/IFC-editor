import { useEffect, useRef, useState } from 'react';
import { AppPlayer } from '../editor/runtime/appPlayer.js';

export function EditorPlayerOverlay({ editor }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const player = new AppPlayer();
    playerRef.current = player;
    host.appendChild(player.dom);

    const resize = () => {
      if (!hostRef.current) return;
      player.setSize(hostRef.current.clientWidth, hostRef.current.clientHeight);
    };

    const onStartPlayer = () => {
      try {
        setVisible(true);

        // Wait until overlay is visible so width/height are valid.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resize();
            player.stop();
            player.load(editor.toJSON());
            player.play();
          });
        });
      } catch (error) {
        console.error(error);
        window.alert(`Player start failed: ${error.message}`);
        setVisible(false);
      }
    };

    const onStopPlayer = () => {
      setVisible(false);
      player.stop();
    };

    editor.signals.startPlayer.add(onStartPlayer);
    editor.signals.stopPlayer.add(onStopPlayer);
    editor.signals.windowResize.add(resize);
    window.addEventListener('resize', resize);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    return () => {
      editor.signals.startPlayer.remove(onStartPlayer);
      editor.signals.stopPlayer.remove(onStopPlayer);
      editor.signals.windowResize.remove(resize);
      window.removeEventListener('resize', resize);
      resizeObserver.disconnect();

      try {
        playerRef.current?.stop();
      } catch (error) {
        console.warn(error);
      }
      playerRef.current?.dispose();
      host.innerHTML = '';
    };
  }, [editor]);

  return (
    <div className={`player-overlay ${visible ? 'visible' : ''}`}>
      <div ref={hostRef} className="player-overlay-canvas" />
      <button className="player-overlay-stop" onClick={() => editor.signals.stopPlayer.dispatch()}>
        Stop
      </button>
    </div>
  );
}
