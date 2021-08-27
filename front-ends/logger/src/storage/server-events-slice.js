import { createSlice } from "@reduxjs/toolkit";

export const serverEventsSlice = createSlice({
    name: "serverEvents",
    initialState: {
        array: [
            /*{
                server: "charterer",
                name: "challenge",
                unfolded: false,
                time: Date.now(),
                content: (
                    <pre
                        style={{
                            height: "auto",
                            overflow: "auto",
                            maxHeight: "200px",
                            wordBreak: "break-word",
                            wordWrap: "normal",
                            whiteSpace: "pre-wrap",
                            display: "flex",
                        }}
                    >
                        {`> sending delivery update to customer: {
  "billOfLading": "0xa5191AB746969C2faB3c7cE655d6e37010646683",
  "proofOfDelivery": "0xFBaF02924F0E858eb8645bf18BBa87bC007f14F4",
  "loading_time": 1626534266143,
  "loading_port": "Duisburg",
  "description": "Oat, steel cut",
  "discharging_time": 1626516060000,
  "weight": "200",
  "moisture_level": "14",
  "nutrition_levels": "calories:290,protein:19.2 grams,carbs:67 grams,sugar:0.4 grams,fiber:14.7 grams,fat:2.5 grams,",
  "verified": false
}`}
                    </pre>
                ),
            },*/
        ],
    },
    reducers: {
        addServerEvent: (state, item) => {
            state.array.push(item.payload);
        },
    },
});

export const { addServerEvent } = serverEventsSlice.actions;

export default serverEventsSlice.reducer;
