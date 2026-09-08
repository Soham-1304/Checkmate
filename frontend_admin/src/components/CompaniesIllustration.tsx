import React from 'react';

export const CompaniesIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 460 300"
        className="w-full h-full max-h-[250px] object-contain drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <ellipse id="mintAuraComp" cx="240" cy="150" rx="190" ry="125" fill="#d9ede6" />
          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Soft mint aura */}
        <use href="#mintAuraComp" />

        {/* Floating circles */}
        <circle cx="100" cy="80" r="16" fill="#c3e4d9" />
        <circle cx="390" cy="75" r="28" fill="#e7f4f0" />
        <circle cx="410" cy="190" r="20" fill="#c3e4d9" />

        {/* Factory / Enterprise Skyline Buildings in background */}
        <g transform="translate(260, 80)" filter="url(#glowEffect)">
          {/* Building 1 */}
          <rect x="0" y="30" width="40" height="90" rx="4" fill="#017374" opacity="0.3" />
          <rect x="8" y="40" width="8" height="8" rx="1" fill="#ffffff" opacity="0.8" />
          <rect x="24" y="40" width="8" height="8" rx="1" fill="#ffffff" opacity="0.8" />
          <rect x="8" y="55" width="8" height="8" rx="1" fill="#ffffff" opacity="0.8" />
          <rect x="24" y="55" width="8" height="8" rx="1" fill="#ffffff" opacity="0.8" />
          <rect x="8" y="70" width="8" height="8" rx="1" fill="#ffffff" opacity="0.8" />
          <rect x="24" y="70" width="8" height="8" rx="1" fill="#ffffff" opacity="0.8" />

          {/* Building 2 (Taller) */}
          <rect x="45" y="0" width="55" height="120" rx="6" fill="#017374" opacity="0.5" />
          <rect x="55" y="15" width="10" height="10" rx="1" fill="#ffffff" opacity="0.9" />
          <rect x="75" y="15" width="10" height="10" rx="1" fill="#ffffff" opacity="0.9" />
          <rect x="55" y="35" width="10" height="10" rx="1" fill="#ffffff" opacity="0.9" />
          <rect x="75" y="35" width="10" height="10" rx="1" fill="#ffffff" opacity="0.9" />
          <rect x="55" y="55" width="10" height="10" rx="1" fill="#ffffff" opacity="0.9" />
          <rect x="75" y="55" width="10" height="10" rx="1" fill="#ffffff" opacity="0.9" />
          <rect x="55" y="75" width="10" height="10" rx="1" fill="#ffffff" opacity="0.9" />
          <rect x="75" y="75" width="10" height="10" rx="1" fill="#ffffff" opacity="0.9" />

          {/* Factory Plant with Chimney */}
          <rect x="105" y="45" width="45" height="75" rx="4" fill="#017374" opacity="0.4" />
          <polygon points="105,45 125,25 150,45" fill="#015758" opacity="0.5" />
          <rect x="135" y="10" width="8" height="20" fill="#015758" opacity="0.6" />
          <ellipse cx="139" cy="8" rx="4" ry="2" fill="#8EC8BA" opacity="0.8" />
        </g>

        {/* Inspector with Tablet & Magnifying Glass */}
        <g id="inspectorCompanies">
          {/* Body */}
          <path
            d="M60 300 C60 210, 85 165, 150 155 C205 150, 245 185, 255 300 Z"
            fill="#017374"
          />
          <path d="M130 157 L155 195 L180 157" fill="#015758" />
          <path d="M155 195 L155 300" stroke="#015758" strokeWidth="4" strokeDasharray="6 4" />
          <path d="M142 140 L142 165 L168 165 L168 140 Z" fill="#fed7aa" />

          {/* Head */}
          <ellipse cx="155" cy="115" rx="26" ry="30" fill="#fed7aa" />
          <path
            d="M132 105 C130 85, 162 78, 180 95 C185 105, 182 120, 182 120 C182 120, 178 110, 172 110 C166 110, 160 115, 152 112 C144 109, 138 115, 132 105 Z"
            fill="#1e293b"
          />

          {/* Cap */}
          <path
            d="M126 100 C128 78, 180 75, 186 98 L206 104 C208 106, 204 110, 194 110 L128 108 C124 108, 122 104, 126 100 Z"
            fill="#017374"
          />
          <circle cx="156" cy="92" r="3.5" fill="#FEB519" />

          {/* Facial features */}
          <ellipse cx="160" cy="114" rx="2.5" ry="3" fill="#1e293b" />
          <path d="M154 108 Q161 106 166 109" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M166 116 L168 122 L164 123" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M158 128 Q164 133 170 128" stroke="#c2410c" strokeWidth="1.6" strokeLinecap="round" fill="none" />

          {/* Tablet / Folder in Left Hand */}
          <g transform="translate(180, 170) rotate(15)">
            <rect width="45" height="60" rx="6" fill="#1e293b" />
            <rect x="3" y="3" width="39" height="54" rx="4" fill="#38bdf8" opacity="0.9" />
            <rect x="7" y="10" width="20" height="4" rx="2" fill="#ffffff" />
            <rect x="7" y="18" width="30" height="3" rx="1.5" fill="#ffffff" opacity="0.8" />
            <rect x="7" y="24" width="26" height="3" rx="1.5" fill="#ffffff" opacity="0.8" />
          </g>

          {/* Right Arm with Magnifying Glass targeting buildings */}
          <g transform="translate(240, 95) rotate(-25)">
            <rect x="-6" y="0" width="12" height="46" rx="4" fill="#1e293b" />
            <circle cx="0" cy="-38" r="34" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle cx="0" cy="-38" r="31" fill="#e0f2fe" fillOpacity="0.5" stroke="#94a3b8" strokeWidth="2" />
            <path
              d="M -18 -52 A 22 22 0 0 1 14 -52"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
