import React from 'react';

const RouteSkeleton = () => {
  return (
    <div className="w-full p-3 rounded-xl border border-gray-100 bg-white/50 animate-pulse flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="w-20 h-2 bg-gray-200 rounded" />
        <div className="w-12 h-4 bg-gray-100 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="w-24 h-5 bg-gray-200 rounded" />
          <div className="w-12 h-2 bg-gray-100 rounded" />
        </div>
        <div className="w-6 h-6 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
};

export default RouteSkeleton;
