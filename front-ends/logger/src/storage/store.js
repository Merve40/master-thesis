import { configureStore } from "@reduxjs/toolkit";

import contractReducer from "./contracts-slice";
import eventReducer from "./events-slice";
import stepsReducer from "./steps-slice";
import serverEventsReducer from "./server-events-slice";

export default configureStore({
    reducer: {
        contracts: contractReducer,
        events: eventReducer,
        steps: stepsReducer,
        serverEvents: serverEventsReducer,
    },
});
