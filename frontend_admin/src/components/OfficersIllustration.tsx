import React from 'react';

export const OfficersIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 460 300"
        className="w-full h-full max-h-[250px] object-contain drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <ellipse id="mintAuraOfficers" cx="240" cy="150" rx="190" ry="125" fill="#d9ede6" />
          <filter id="glowOfficers" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Mint aura */}
        <use href="#mintAuraOfficers" />

        {/* Decorative soft floating circles */}
        <circle cx="100" cy="80" r="16" fill="#c3e4d9" />
        <circle cx="390" cy="75" r="28" fill="#e7f4f0" />
        <circle cx="410" cy="190" r="20" fill="#c3e4d9" />

        {/* Background Team Badges / Verification Cards */}
        <g transform="translate(300, 50) rotate(5)" filter="url(#glowOfficers)">
          <rect width="105" height="135" rx="12" fill="#ffffff" stroke="#8EC8BA" strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx="52" cy="35" r="18" fill="#017374" />
          <text x="52" y="40" fontSize="12" fontWeight="bold" fill="#ffffff" textAnchor="middle">ID</text>
          <rect x="20" y="65" width="65" height="6" rx="3" fill="#017374" opacity="0.8" />
          <rect x="25" y="78" width="55" height="4" rx="2" fill="#cbd5e1" />
          <rect x="30" y="88" width="45" height="4" rx="2" fill="#cbd5e1" />
          <rect x="20" y="105" width="65" height="14" rx="4" fill="#E5F0EC" />
          <text x="52" y="115" fontSize="8" fontWeight="bold" fill="#017374" textAnchor="middle">AUTHORISED</text>
        </g>

        {/* Inspector Senior Officer with Radio / Tablet */}
        <g id="seniorOfficer">
          <path
            d="M80 300 C80 210, 105 165, 170 155 C225 150, 265 185, 275 300 Z"
            fill="#017374"
          />
          <path d="M150 157 L175 195 L200 157" fill="#015758" />
          <path d="M175 195 L175 300" stroke="#015758" strokeWidth="4" strokeDasharray="6 4" />
          <path d="M162 140 L162 165 L188 165 L188 140 Z" fill="#fed7aa" />

          {/* Head */}
          <ellipse cx="175" cy="115" rx="26" ry="30" fill="#fed7aa" />
          <path
            d="M152 105 C150 85, 182 78, 200 95 C205 105, 202 120, 202 120 C202 120, 198 110, 192 110 C186 110, 180 115, 172 112 C164 109, 158 115, 152 105 Z"
            fill="#1e293b"
          />

          {/* Cap */}
          <path
            d="M146 100 C148 78, 200 75, 206 98 L226 104 C228 106, 224 110, 214 110 L148 108 C144 108, 142 104, 146 100 Z"
            fill="#017374"
          />
          <path d="M152 102 C170 96, 192 96, 204 102" stroke="#8EC8BA" strokeWidth="3" fill="none" />
          <circle cx="176" cy="92" r="3.5" fill="#FEB519" />

          {/* Facial features */}
          <ellipse cx="180" cy="114" rx="2.5" ry="3" fill="#1e293b" />
          <path d="M174 108 Q181 106 186 109" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M186 116 L188 122 L184 123" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M178 128 Q184 133 190 128" stroke="#c2410c" strokeWidth="1.6" strokeLinecap="round" fill="none" />

          {/* Officer Clipboard / Digital Roster */}
          <g transform="translate(195, 165) rotate(10)" filter="url(#glowOfficers)">
            <rect width="60" height="75" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
            <rect x="22" y="-4" width="16" height="8" rx="2" fill="#475569" />
            <rect x="8" y="14" width="44" height="5" rx="2.5" fill="#017374" />
            <rect x="8" y="24" width="36" height="4" rx="2" fill="#cbd5e1" />
            <circle cx="12" cy="38" r="3" fill="#10b981" />
            <rect x="20" y="36" width="30" height="4" rx="2" fill="#64748b" />
            <circle cx="12" cy="50" r="3" fill="#10b981" />
            <rect x="20" y="48" width="26" height="4" rx="2" fill="#64748b" />
            <circle cx="12" cy="62" r="3" fill="#E37820" />
            <rect x="20" y="60" width="32" height="4" rx="2" fill="#64748b" />
          </g>
        </g>

        {/* Shield Floating Badge */}
        <g transform="translate(360, 190)" filter="url(#glowOfficers)">
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
