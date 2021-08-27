import { createSlice } from "@reduxjs/toolkit";

export const eventsSlice = createSlice({
    name: "events",
    initialState: {
        array: [],
    },
    reducers: {
        addEvent: (state, event) => {
            state.array.push(event.payload);
        },
    },
});

export const { addEvent } = eventsSlice.actions;

export default eventsSlice.reducer;
