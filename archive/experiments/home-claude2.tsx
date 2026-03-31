"use client";

// components/WaveVisualizer.tsx
// Client Island — solo este componente necesita "use client"
// para que las animaciones CSS corran en el browser.

const BARS = [
  { h: 60,  dur: "1.1s",  del: "0s"    },
  { h: 90,  dur: "0.85s", del: "0.1s"  },
  { h: 45,  dur: "1.3s",  del: "0.2s"  },
  { h: 100, dur: "0.7s",  del: "0s"    },
  { h: 75,  dur: "1.0s",  del: "0.15s" },
  { h: 55,  dur: "1.4s",  del: "0.25s" },
  { h: 88,  dur: "0.9s",  del: "0.05s" },
  { h: 40,  dur: "1.2s",  del: "0.3s"  },
  { h: 70,  dur: "0.95s", del: "0.1s"  },
  { h: 95,  dur: "0.75s", del: "0.2s"  },
  { h: 50,  dur: "1.35s", del: "0s"    },
  { h: 82,  dur: "1.05s", del: "0.15s" },
  { h: 65,  dur: "0.8s",  del: "0.3s"  },
  { h: 48,  dur: "1.25s", del: "0.05s" },
  { h: 78,  dur: "1.15s", del: "0.2s"  },
  { h: 92,  dur: "0.88s", del: "0.1s"  },
  { h: 58,  dur: "1.4s",  del: "0.25s" },
  { h: 85,  dur: "0.72s", del: "0s"    },
  { h: 42,  dur: "1.28s", del: "0.18s" },
  { h: 73,  dur: "1.0s",  del: "0.35s" },
  { h: 98,  dur: "0.82s", del: "0.08s" },
  { h: 60,  dur: "1.18s", del: "0.22s" },
  { h: 47,  dur: "1.38s", del: "0.12s" },
  { h: 86,  dur: "0.92s", del: "0.28s" },
  { h: 64,  dur: "1.08s", del: "0.04s" },
  { h: 79,  dur: "0.78s", del: "0.16s" },
  { h: 53,  dur: "1.32s", del: "0.32s" },
  { h: 91,  dur: "0.86s", del: "0.06s" },
  { h: 68,  dur: "1.22s", del: "0.24s" },
  { h: 44,  dur: "1.48s", del: "0.38s" },
  { h: 72,  dur: "0.9s",  del: "0.12s" },
  { h: 56,  dur: "1.15s", del: "0.08s" },
  { h: 89,  dur: "0.76s", del: "0.28s" },
  { h: 63,  dur: "1.1s",  del: "0.18s" },
  { h: 77,  dur: "0.95s", del: "0.05s" },
  { h: 41,  dur: "1.38s", del: "0.3s"  },
  { h: 94,  dur: "0.82s", del: "0.14s" },
  { h: 67,  dur: "1.05s", del: "0.22s" },
  { h: 51,  dur: "1.28s", del: "0.02s" },
  { h: 83,  dur: "0.88s", del: "0.34s" },
];

export function WaveVisualizer() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: "4px",
        height: "100px",
      }}
    >
      {BARS.map((b, i) => (
        <div
          key={i}
          className="ss-bar"
          style={
            {
              height: `${b.h}%`,
              "--ss-dur": b.dur,
              "--ss-delay": b.del,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
