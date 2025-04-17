import { configureStore } from '@reduxjs/toolkit';
import devicesReducer from './devicesSlice';

const store = configureStore({
  reducer: {
    devices: devicesReducer,
  },
  devTools: process.env.NODE_ENV !== 'production', // Enable DevTools in development
});

export default store; // Ensure default export
