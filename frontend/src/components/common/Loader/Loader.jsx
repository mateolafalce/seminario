import React from 'react';

const Loader = ({ texto = "Cargando...", size = "md" }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
      <svg
        className={`${sizeClasses[size]} animate-spin text-yellow-400`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8z"
        ></path>
      </svg>
      <p className="mt-4 text-lg font-semibold">{texto}</p>
    </div>
  );
};

export default Loader;