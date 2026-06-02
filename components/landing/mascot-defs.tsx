export function MascotDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="m-body" cx="36%" cy="26%" r="82%">
          <stop offset="0%" stopColor="#5a5a5e" />
          <stop offset="38%" stopColor="#2c2c30" />
          <stop offset="78%" stopColor="#141416" />
          <stop offset="100%" stopColor="#070708" />
        </radialGradient>
        <radialGradient id="m-shine" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="m-rim" x1="0" y1="1" x2="1" y2="0.2">
          <stop offset="0%" stopColor="#6f6f74" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#6f6f74" stopOpacity="0" />
        </linearGradient>
        <filter id="m-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <symbol id="mascot" viewBox="0 0 200 200">
          <ellipse
            cx="100"
            cy="190"
            rx="56"
            ry="11"
            fill="#0a0a0a"
            opacity="0.15"
            filter="url(#m-soft)"
          />
          <ellipse cx="80" cy="182" rx="14" ry="8" fill="#16171a" />
          <ellipse cx="120" cy="182" rx="14" ry="8" fill="#16171a" />
          <path
            d="M100 22 C 148 22 176 60 176 108 C 176 156 146 176 100 176 C 54 176 24 156 24 108 C 24 60 52 22 100 22 Z"
            fill="url(#m-body)"
          />
          <path
            d="M100 22 C 148 22 176 60 176 108 C 176 156 146 176 100 176 C 54 176 24 156 24 108 C 24 60 52 22 100 22 Z"
            fill="none"
            stroke="url(#m-rim)"
            strokeWidth="3"
            opacity="0.5"
          />
          <ellipse
            cx="72"
            cy="70"
            rx="38"
            ry="48"
            fill="url(#m-shine)"
            transform="rotate(-20 72 70)"
          />
          <circle cx="60" cy="50" r="6" fill="#fff" opacity="0.9" />
          <ellipse cx="76" cy="100" rx="12" ry="14.5" fill="#f6f6f7" />
          <ellipse cx="124" cy="100" rx="12" ry="14.5" fill="#f6f6f7" />
          <circle cx="78" cy="103" r="5.6" fill="#101012" />
          <circle cx="126" cy="103" r="5.6" fill="#101012" />
          <circle cx="75.6" cy="99.4" r="2" fill="#fff" />
          <circle cx="123.6" cy="99.4" r="2" fill="#fff" />
          <path
            d="M73 130 H86 l5 -12 6 24 6 -20 5 8 H127"
            fill="none"
            stroke="#f0f0f1"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
      </defs>
    </svg>
  );
}
