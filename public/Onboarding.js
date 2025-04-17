import React, { useState } from 'react';

const Onboarding = ({ onEmailSubmit }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState(''); // State for first name

  const handleSubmit = (event) => {
    event.preventDefault();
    if (firstName && email) {
      onEmailSubmit(email); // Ensure callback is invoked after dispatch
    } else {
      console.error('First Name and Email are required');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-6">Welcome</h1>
      <p className="mb-6 text-lg">Enter your details to get started:</p>
      <form onSubmit={handleSubmit} className="flex flex-col items-center w-full max-w-sm">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          required
          className="mb-4 p-3 w-full rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          className="mb-4 p-3 w-full rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gray-600"
        />
        <button type="submit" className="p-3 w-full rounded bg-gray-700 hover:bg-gray-600 text-white font-semibold">
          Submit
        </button>
      </form>
    </div>
  );
};

export default Onboarding;