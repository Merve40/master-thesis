import { createSlice } from "@reduxjs/toolkit";

export const contractsSlice = createSlice({
    name: "contracts",
    initialState: {
        array: [],
    },
    reducers: {
        add: (state, contract) => {
            state.array.push(contract.payload);
        },
    },
});

// Action creators are generated for each case reducer function
export const { add } = contractsSlice.actions;

export default contractsSlice.reducer;
