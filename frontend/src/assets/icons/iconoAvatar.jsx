import React from 'react';

const IconoAvatar = ({ className = "h-16 w-16" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    fill="none"
    className={className}
  >
    <circle cx="32" cy="24" r="14" fill="#eaff00" />
    <ellipse cx="32" cy="48" rx="20" ry="12" fill="#bdbdbd" fillOpacity="0.85" />
  </svg>
);

export default IconoAvatar;