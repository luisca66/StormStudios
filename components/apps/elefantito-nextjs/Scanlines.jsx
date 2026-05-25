export default function Scanlines() {
  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
      background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.09) 2px,rgba(0,0,0,0.09) 4px)'
    }} />
  );
}
