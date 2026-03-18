import React from 'react';

const modes = [
  { id: 'car', icon: '🚗', label: 'Car' },
  { id: 'motorbike', icon: '🏍️', label: 'Bike' },
  { id: 'pedestrian', icon: '🚶', label: 'Walk' }
];

const TransportToggle = ({ selected, onChange }) => {
  return (
    <div className="flex bg-gray-100/50 p-1.5 rounded-2xl gap-2 shadow-inner border border-gray-200">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 ${
            selected === mode.id
              ? 'bg-white shadow-xl scale-100 border border-gray-100'
              : 'opacity-40 grayscale scale-95 hover:opacity-100 hover:grayscale-0'
          }`}
        >
          <span className="text-2xl mb-1">{mode.icon}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${selected === mode.id ? 'text-blue-600' : 'text-gray-500'}`}>
            {mode.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default TransportToggle;
