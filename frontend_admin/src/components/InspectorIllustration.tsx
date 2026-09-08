import React from 'react';

export const InspectorIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 460 300"
        className="w-full h-full max-h-[250px] object-contain drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Mint aura background */}
          <ellipse id="mintAura" cx="240" cy="150" rx="190" ry="125" fill="#d9ede6" />
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Soft mint green background oval */}
        <use href="#mintAura" />

        {/* Floating soft decorative circles */}
        <circle cx="100" cy="80" r="16" fill="#c3e4d9" />
        <circle cx="390" cy="75" r="28" fill="#e7f4f0" />
        <circle cx="410" cy="190" r="20" fill="#c3e4d9" />

        {/* Document Checklist in Background */}
        <g transform="translate(325, 45) rotate(4)" filter="url(#softGlow)">
          <rect width="96" height="140" rx="10" fill="#ffffff" />
          {/* Header bar */}
          <rect x="14" y="18" width="68" height="6" rx="3" fill="#e2e8f0" />
          {/* Item 1 */}
          <circle cx="24" cy="42" r="7" fill="#017374" />
          <path d="M21 42 L23 44 L27 40" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="37" y="39" width="45" height="5" rx="2.5" fill="#cbd5e1" />
          {/* Item 2 */}
          <circle cx="24" cy="66" r="7" fill="#017374" />
          <path d="M21 66 L23 68 L27 64" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="37" y="63" width="45" height="5" rx="2.5" fill="#cbd5e1" />
          {/* Item 3 */}
          <circle cx="24" cy="90" r="7" fill="#017374" />
          <path d="M21 90 L23 92 L27 88" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="37" y="87" width="45" height="5" rx="2.5" fill="#cbd5e1" />
        </g>

        {/* Cardboard Box with Tape and Barcode */}
        <g transform="translate(255, 140)" filter="url(#softGlow)">
          {/* Box front */}
          <rect x="0" y="24" width="115" height="96" rx="5" fill="#f59e0b" />
          {/* Box top perspective */}
          <path d="M0 24 L35 0 L150 0 L115 24 Z" fill="#d97706" />
          {/* Box side perspective */}
          <path d="M115 24 L150 0 L150 96 L115 120 Z" fill="#b45309" />
          {/* Tape */}
          <rect x="44" y="24" width="26" height="96" fill="#d97706" opacity="0.65" />
          <path d="M54 24 L79 0 L95 0 L70 24 Z" fill="#b45309" opacity="0.65" />
          {/* Barcode label */}
          <rect x="68" y="60" width="40" height="26" rx="3" fill="#ffffff" />
          <rect x="74" y="66" width="3" height="14" fill="#1e293b" />
          <rect x="79" y="66" width="2" height="14" fill="#1e293b" />
          <rect x="83" y="66" width="4" height="14" fill="#1e293b" />
          <rect x="89" y="66" width="2" height="14" fill="#1e293b" />
          <rect x="93" y="66" width="3" height="14" fill="#1e293b" />
          <rect x="98" y="66" width="4" height="14" fill="#1e293b" />
        </g>

        {/* Inspector Character */}
        <g id="inspectorCharacter">
          {/* Body Uniform */}
          <path
            d="M60 300 C60 210, 85 165, 150 155 C205 150, 245 185, 255 300 Z"
            fill="#017374"
          />
          {/* Inner collar & vest */}
          <path d="M130 157 L155 195 L180 157" fill="#015758" />
          <path d="M155 195 L155 300" stroke="#015758" strokeWidth="4" strokeDasharray="6 4" />
          {/* Neck */}
          <path d="M142 140 L142 165 L168 165 L168 140 Z" fill="#fed7aa" />

          {/* Head */}
          <ellipse cx="155" cy="115" rx="26" ry="30" fill="#fed7aa" />
          {/* Hair */}
          <path
            d="M132 105 C130 85, 162 78, 180 95 C185 105, 182 120, 182 120 C182 120, 178 110, 172 110 C166 110, 160 115, 152 112 C144 109, 138 115, 132 105 Z"
            fill="#1e293b"
          />

          {/* Green Cap (#017374) */}
          <path
            d="M126 100 C128 78, 180 75, 186 98 L206 104 C208 106, 204 110, 194 110 L128 108 C124 108, 122 104, 126 100 Z"
            fill="#017374"
          />
          <path d="M132 102 C150 96, 172 96, 184 102" stroke="#8EC8BA" strokeWidth="3" fill="none" />
          {/* Insignia */}
          <circle cx="156" cy="92" r="3.5" fill="#FEB519" />

          {/* Facial features */}
          {/* Eyes looking down towards magnifying glass */}
          <ellipse cx="160" cy="114" rx="2.5" ry="3" fill="#1e293b" />
          <path d="M154 108 Q161 106 166 109" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Nose */}
          <path d="M166 116 L168 122 L164 123" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Smile */}
          <path d="M158 128 Q164 133 170 128" stroke="#c2410c" strokeWidth="1.6" strokeLinecap="round" fill="none" />

          {/* Arm holding magnifying glass */}
          <g>
            <path
              d="M195 190 C220 180, 255 160, 275 140"
              stroke="#017374"
              strokeWidth="22"
              strokeLinecap="round"
            />
            {/* Hand */}
            <circle cx="275" cy="140" r="11" fill="#fed7aa" />

            {/* Magnifying Glass */}
            <g transform="translate(275, 135) rotate(-35)">
              <rect x="-6" y="0" width="12" height="46" rx="4" fill="#1e293b" />
              <rect x="-4" y="2" width="8" height="9" rx="2" fill="#64748b" />
              <circle cx="0" cy="-38" r="34" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle cx="0" cy="-38" r="31" fill="#e0f2fe" fillOpacity="0.5" stroke="#94a3b8" strokeWidth="2" />
              {/* Glass Glare */}
              <path
                d="M -18 -52 A 22 22 0 0 1 14 -52"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </g>
        </g>

        {/* Verification Check Badge (Floating at bottom right) */}
        <g transform="translate(370, 190)" filter="url(#softGlow)">
          <rect width="44" height="44" rx="14" fill="#017374" />
          <path
            d="M13 22 L20 29 L31 16"
            stroke="#ffffff"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
};
