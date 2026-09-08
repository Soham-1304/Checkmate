import React from 'react';

export type ProductType =
  | 'amul'
  | 'britannia'
  | 'mdh'
  | 'parleg'
  | 'classmate'
  | 'maggi'
  | 'fortune'
  | 'haldirams'
  | 'tatatea'
  | 'tata';

interface ProductMockupProps {
  type: ProductType;
  className?: string;
}

export const ProductMockup: React.FC<ProductMockupProps> = ({ type, className = '' }) => {
  switch (type) {
    case 'amul':
      // Blue & White Milk Tetra Pak
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="10" y="12" width="40" height="64" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M10 12 L20 4 L50 4 L40 12 Z" fill="#e2e8f0" />
            <path d="M40 12 L50 4 L50 68 L40 76 Z" fill="#94a3b8" />
            <rect x="10" y="24" width="30" height="32" fill="#0284c7" />
            <ellipse cx="25" cy="40" rx="9" ry="9" fill="#ffffff" />
            <ellipse cx="25" cy="40" rx="7" ry="7" fill="#38bdf8" />
            <text x="25" y="20" fontSize="7" fontWeight="bold" fill="#dc2626" textAnchor="middle">Amul</text>
            <text x="25" y="32" fontSize="5" fontWeight="bold" fill="#ffffff" textAnchor="middle">TAAZA</text>
          </svg>
        </div>
      );

    case 'britannia':
      // Green & Gold Digestive pack
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="10" y="14" width="40" height="56" rx="4" fill="#15803d" stroke="#ca8a04" strokeWidth="1" />
            <ellipse cx="30" cy="42" rx="14" ry="14" fill="#ca8a04" />
            <ellipse cx="30" cy="42" rx="11" ry="11" fill="#eab308" />
            <text x="30" y="24" fontSize="5" fontWeight="bold" fill="#ffffff" textAnchor="middle">BRITANNIA</text>
            <text x="30" y="44" fontSize="4.5" fontWeight="black" fill="#15803d" textAnchor="middle">NutriChoice</text>
            <text x="30" y="60" fontSize="4" fontWeight="bold" fill="#ffffff" textAnchor="middle">DIGESTIVE</text>
          </svg>
        </div>
      );

    case 'mdh':
      // Red & White spice box
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="10" y="10" width="40" height="60" rx="3" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" />
            <rect x="14" y="24" width="32" height="32" rx="2" fill="#ffffff" />
            <circle cx="30" cy="18" r="5" fill="#ffffff" />
            <text x="30" y="20" fontSize="5" fontWeight="black" fill="#dc2626" textAnchor="middle">MDH</text>
            <text x="30" y="36" fontSize="4" fontWeight="bold" fill="#b91c1c" textAnchor="middle">GARAM</text>
            <text x="30" y="44" fontSize="4" fontWeight="bold" fill="#b91c1c" textAnchor="middle">MASALA</text>
          </svg>
        </div>
      );

    case 'parleg':
      // Yellow & White Parle-G Biscuit pack
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="8" y="12" width="44" height="56" rx="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
            <rect x="8" y="20" width="44" height="24" fill="#ffffff" />
            <rect x="8" y="20" width="44" height="4" fill="#dc2626" />
            <text x="30" y="34" fontSize="6.5" fontWeight="black" fill="#dc2626" textAnchor="middle">Parle-G</text>
            <text x="30" y="41" fontSize="3.5" fontWeight="bold" fill="#ca8a04" textAnchor="middle">Original Gluco</text>
          </svg>
        </div>
      );

    case 'classmate':
      // Blue ITC Notebook
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="10" y="10" width="40" height="60" rx="3" fill="#0369a1" stroke="#0284c7" strokeWidth="1" />
            <rect x="10" y="10" width="6" height="60" fill="#0284c7" />
            <rect x="20" y="25" width="25" height="15" rx="2" fill="#ffffff" />
            <text x="32" y="34" fontSize="4" fontWeight="bold" fill="#0369a1" textAnchor="middle">classmate</text>
            <rect x="20" y="48" width="25" height="2" fill="#ffffff" opacity="0.6" />
            <rect x="20" y="53" width="25" height="2" fill="#ffffff" opacity="0.6" />
          </svg>
        </div>
      );

    case 'maggi':
      // Yellow & Red Noodle Pack
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="8" y="12" width="44" height="56" rx="4" fill="#facc15" stroke="#eab308" strokeWidth="1" />
            <path d="M12 18 L48 18 L44 32 L16 32 Z" fill="#dc2626" />
            <text x="30" y="28" fontSize="6" fontWeight="black" fill="#facc15" textAnchor="middle">Maggi</text>
            <ellipse cx="30" cy="48" rx="14" ry="10" fill="#ea580c" />
            <text x="30" y="49" fontSize="3.5" fontWeight="bold" fill="#ffffff" textAnchor="middle">2-MINUTE</text>
          </svg>
        </div>
      );

    case 'fortune':
      // Yellow Sunflower Oil bottle
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="25" y="4" width="10" height="6" rx="2" fill="#eab308" />
            <path d="M26 10 L24 20 L36 20 L34 10 Z" fill="#fef08a" />
            <rect x="16" y="20" width="28" height="54" rx="6" fill="#fef08a" stroke="#facc15" strokeWidth="1" />
            <rect x="18" y="24" width="24" height="48" rx="4" fill="#facc15" />
            <rect x="17" y="32" width="26" height="28" rx="2" fill="#ffffff" />
            <rect x="17" y="32" width="26" height="6" fill="#15803d" />
            <circle cx="30" cy="47" r="6" fill="#eab308" />
            <text x="30" y="37" fontSize="4.5" fontWeight="bold" fill="#ffffff" textAnchor="middle">fortune</text>
          </svg>
        </div>
      );

    case 'haldirams':
      // Orange & Yellow namkeen packet
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="8" y="10" width="44" height="60" rx="4" fill="#FEB519" stroke="#E37820" strokeWidth="1" />
            <rect x="8" y="10" width="44" height="4" fill="#E37820" />
            <rect x="8" y="66" width="44" height="4" fill="#E37820" />
            <path d="M30 18 L44 26 L30 34 L16 26 Z" fill="#dc2626" />
            <text x="30" y="27" fontSize="4.5" fontWeight="bold" fill="#ffffff" textAnchor="middle">Haldiram's</text>
            <ellipse cx="30" cy="50" rx="14" ry="8" fill="#E37820" />
            <text x="30" y="42" fontSize="4" fontWeight="bold" fill="#78350f" textAnchor="middle">BHUJIA</text>
          </svg>
        </div>
      );

    case 'tatatea':
      // Green Tata Tea Pack
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="8" y="12" width="44" height="56" rx="4" fill="#166534" stroke="#15803d" strokeWidth="1" />
            <rect x="14" y="20" width="32" height="14" rx="2" fill="#ffffff" />
            <text x="30" y="27" fontSize="5" fontWeight="black" fill="#166534" textAnchor="middle">TATA TEA</text>
            <text x="30" y="32" fontSize="3" fontWeight="bold" fill="#ca8a04" textAnchor="middle">PREMIUM</text>
            <circle cx="30" cy="48" r="10" fill="#ca8a04" />
            <text x="30" y="51" fontSize="4" fontWeight="bold" fill="#ffffff" textAnchor="middle">TEA</text>
          </svg>
        </div>
      );

    default:
      return (
        <div className={`w-9 h-11 relative flex items-center justify-center ${className}`}>
          <svg viewBox="0 0 60 80" className="w-full h-full drop-shadow-xs" fill="none">
            <rect x="10" y="8" width="40" height="64" rx="4" fill="#dc2626" />
            <text x="30" y="22" fontSize="7" fontWeight="black" fill="#ffffff" textAnchor="middle">TATA</text>
            <text x="30" y="46" fontSize="6.5" fontWeight="black" fill="#ffffff" textAnchor="middle">SALT</text>
          </svg>
        </div>
      );
  }
};
