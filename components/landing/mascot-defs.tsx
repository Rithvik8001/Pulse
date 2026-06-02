export function MascotDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="m-arrow-face" x1="52" y1="34" x2="148" y2="166">
          <stop offset="0%" stopColor="#ffcf8a" />
          <stop offset="32%" stopColor="#ff9a2f" />
          <stop offset="72%" stopColor="#f26a13" />
          <stop offset="100%" stopColor="#b83b08" />
        </linearGradient>
        <linearGradient id="m-arrow-side" x1="114" y1="46" x2="166" y2="160">
          <stop offset="0%" stopColor="#ff9b2f" />
          <stop offset="54%" stopColor="#d84f0b" />
          <stop offset="100%" stopColor="#7b2205" />
        </linearGradient>
        <linearGradient id="m-arrow-edge" x1="58" y1="62" x2="141" y2="145">
          <stop offset="0%" stopColor="#fff1c8" />
          <stop offset="40%" stopColor="#ffb454" />
          <stop offset="100%" stopColor="#d7500b" />
        </linearGradient>
        <radialGradient id="m-arrow-glow" cx="38%" cy="22%" r="78%">
          <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.92" />
          <stop offset="36%" stopColor="#ffd184" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#ff7a14" stopOpacity="0" />
        </radialGradient>
        <filter id="m-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter
          id="m-arrow-shadow"
          x="-30%"
          y="-30%"
          width="160%"
          height="170%"
        >
          <feDropShadow
            dx="0"
            dy="13"
            stdDeviation="10"
            floodColor="#9a2d03"
            floodOpacity="0.32"
          />
          <feDropShadow
            dx="-6"
            dy="8"
            stdDeviation="5"
            floodColor="#000"
            floodOpacity="0.16"
          />
        </filter>
        <symbol id="mascot" viewBox="0 0 200 200">
          <ellipse
            cx="100"
            cy="174"
            rx="58"
            ry="14"
            fill="#8a2a04"
            opacity="0.16"
            filter="url(#m-soft)"
          />
          <path
            d="M40 95 L112 28 C119 22 131 26 134 36 L163 135 C166 146 156 156 145 152 L46 123 C36 120 32 102 40 95 Z"
            fill="url(#m-arrow-side)"
            filter="url(#m-arrow-shadow)"
          />
          <path
            d="M43 95 L120 37 C126 33 134 37 135 44 L151 132 C153 142 143 150 134 146 L45 121 C36 118 34 101 43 95 Z"
            fill="url(#m-arrow-face)"
          />
          <path
            d="M120 37 L151 132 L105 111 Z"
            fill="url(#m-arrow-side)"
            opacity="0.9"
          />
          <path d="M43 95 L151 132 L88 118 Z" fill="#ff8a1b" opacity="0.5" />
          <path
            d="M51 96 L121 48 L100 104 L145 132 L57 115 Z"
            fill="url(#m-arrow-edge)"
            opacity="0.88"
          />
          <path
            d="M64 91 L113 59 L99 95 L130 116 L72 106 Z"
            fill="url(#m-arrow-glow)"
            opacity="0.95"
          />
          <path
            d="M52 96 L121 47"
            fill="none"
            stroke="#fff5d5"
            strokeLinecap="round"
            strokeWidth="5"
            opacity="0.62"
          />
          <circle cx="83" cy="88" r="5" fill="#fff8dd" opacity="0.92" />
          <circle cx="70" cy="96" r="2.4" fill="#fff8dd" opacity="0.7" />
          <path
            d="M41 95 L112 28 C119 22 131 26 134 36 L163 135 C166 146 156 156 145 152 L46 123 C36 120 32 102 40 95 Z"
            fill="none"
            stroke="#7d2605"
            strokeOpacity="0.16"
            strokeWidth="3"
          />
        </symbol>
      </defs>
    </svg>
  );
}
