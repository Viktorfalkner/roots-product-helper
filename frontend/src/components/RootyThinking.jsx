import { useState, useEffect, useRef } from 'react';

const MESSAGES = [
  'Growing something good…',
  'Putting down roots…',
  'Digging into the details…',
  'Almost sprouted…',
  'Tending to your ideas…',
];

// All sizes derived from viewBox aspect ratios — preserveAspectRatio="none" means
// the SVG stretches to fill exactly the CSS dimensions given, so both must be correct.
// Bubble viewBox:  0 0 192.771 51.915  → ratio 3.713:1
const BUBBLE_W = 180;
const BUBBLE_H = Math.round((51.915 / 192.771) * BUBBLE_W); // 48px
// Rooty viewBox:   0 0 107.431 97.7448 → ratio 1.099:1
const ROOTY_H = 80;
const ROOTY_W = Math.round((107.431 / 97.7448) * ROOTY_H); // 88px
// Tail viewBox:    0 0 13.41 13.1582   → nearly square
const TAIL_W = 13;
const TAIL_H = Math.round((13.1582 / 13.41) * TAIL_W); // 13px

// phases: 'thinking' → 'done' → 'poofing'
export default function RootyThinking({ loading, onDone }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [phase, setPhase] = useState('thinking');
  const intervalRef = useRef(null);

  // Rotate messages while thinking
  useEffect(() => {
    if (phase !== 'thinking') return;
    intervalRef.current = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 2500);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  // Watch for loading → false to trigger exit sequence
  useEffect(() => {
    if (loading) return;
    clearInterval(intervalRef.current);
    setPhase('done');
    // Hold "All done!" briefly, then poof
    const poof = setTimeout(() => setPhase('poofing'), 900);
    // Unmount after poof animation finishes
    const unmount = setTimeout(() => onDone?.(), 900 + 500);
    return () => { clearTimeout(poof); clearTimeout(unmount); };
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const bubbleText = phase === 'done' || phase === 'poofing' ? 'All done! ✨' : MESSAGES[msgIndex];
  const isPoofing = phase === 'poofing';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 140,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
        zIndex: 10,
        animation: isPoofing ? 'rootyPoof 0.5s cubic-bezier(0.4,0,0.6,1) both' : undefined,
      }}
    >
      {/* Speech bubble */}
      <div
        style={{
          position: 'relative',
          width: BUBBLE_W,
          animation: 'bubbleFadeIn 0.3s ease 0.2s both',
        }}
      >
        <img
          src="/rooty-bubble.svg"
          alt=""
          style={{ display: 'block', width: BUBBLE_W, height: BUBBLE_H }}
        />
        <span
          key={bubbleText}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            color: '#555',
            fontFamily: "'Poppins', system-ui, sans-serif",
            fontWeight: 500,
            padding: '0 14px',
            whiteSpace: 'nowrap',
            animation: phase === 'thinking' ? 'messageFade 2.5s ease' : 'bubbleFadeIn 0.2s ease both',
          }}
        >
          {bubbleText}
        </span>
        <img
          src="/rooty-bubble-tail.svg"
          alt=""
          style={{
            position: 'absolute',
            bottom: -10,
            right: 28,
            width: TAIL_W,
            height: TAIL_H,
            transform: 'scaleX(-1)',
          }}
        />
      </div>

      {/* Rooty */}
      <img
        src="/rooty-thoughtful.svg"
        alt="Rooty is thinking"
        style={{
          display: 'block',
          width: ROOTY_W,
          height: ROOTY_H,
          marginTop: 2,
          marginRight: 4,
          animation:
            'rootyPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both, rootyFloat 2s ease-in-out 0.5s infinite',
        }}
      />
    </div>
  );
}
