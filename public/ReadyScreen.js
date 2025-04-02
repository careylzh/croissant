import React from 'react';

const ReadyScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-6">You are ready!</h1>
      <p className="text-lg">When an engineer approaches you, you will be notified on this screen.</p>
    </div>
  );
};

export default ReadyScreen;
