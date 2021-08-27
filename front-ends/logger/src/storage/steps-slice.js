import { createSlice } from "@reduxjs/toolkit";

export const stepsSlice = createSlice({
    name: "steps",
    initialState: {
        array: [
            { finished: false, name: "Deploy C/P" },
            { finished: false, name: "Sign C/P" },
            { finished: false, name: "Issue B/L" },
            { finished: false, name: "Issue Credential" },
            { finished: false, name: "Deposit B/L" },
            { finished: false, name: "Sign B/L" },
            { finished: false, name: "Issue PoD" },
            { finished: false, name: "Verify Order" },
        ],
    },
    reducers: {
        finish: (state, index) => {
            state.array[index.payload].finished = true;
        },
    },
});

export const { finish } = stepsSlice.actions;

export default stepsSlice.reducer;
