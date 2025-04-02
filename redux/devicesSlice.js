import { createSlice } from '@reduxjs/toolkit';

const devicesSlice = createSlice({
  name: 'devices',
  initialState: {
    selectedDevices: [],
    userDevices: {},
  },
  reducers: {
    storeSelectedDevices: (state, action) => {
      state.selectedDevices = action.payload;
    },
    setUserDevices: (state, action) => {
      const { email, devices } = action.payload;
      state.userDevices[email] = devices;
    },
  },
});

export const { storeSelectedDevices, setUserDevices } = devicesSlice.actions;
export default devicesSlice.reducer;
