"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.addError = exports.finish = exports.stepsSlice = void 0;

var _toolkit = require("@reduxjs/toolkit");

var stepsSlice = (0, _toolkit.createSlice)({
  name: "steps",
  initialState: {
    array: [{
      finished: false,
      current: true,
      error: false,
      name: "Deploy C/P"
    }, {
      finished: false,
      current: false,
      error: false,
      name: "Sign C/P"
    }, {
      finished: false,
      current: false,
      error: false,
      name: "Issue B/L"
    }, {
      finished: false,
      current: false,
      error: false,
      name: "Issue Credential"
    }, {
      finished: false,
      current: false,
      error: false,
      name: "Deposit B/L"
    }, {
      finished: false,
      current: false,
      error: false,
      name: "Sign B/L"
    }, {
      finished: false,
      current: false,
      error: false,
      name: "Issue PoD"
    }, {
      finished: false,
      current: false,
      error: false,
      name: "Verify Order"
    }]
  },
  reducers: {
    finish: function finish(state, index) {
      state.array[index.payload].finished = true; //state.array[index.payload].current = false;

      if (index.payload + 1 < state.array.length) {
        state.array[index.payload + 1].current = true;
      }

      var i = index.payload;

      while (i >= 0) {
        state.array[i].current = false;
        i--;
      }
    },
    addError: function addError(state, index) {
      if (state.array[index.payload].error) {
        state.array[index.payload].numError += 1;
      } else {
        state.array[index.payload].error = true;
        state.array[index.payload].numError = 1;
      }
    }
  }
});
exports.stepsSlice = stepsSlice;
var _stepsSlice$actions = stepsSlice.actions,
    finish = _stepsSlice$actions.finish,
    addError = _stepsSlice$actions.addError;
exports.addError = addError;
exports.finish = finish;
var _default = stepsSlice.reducer;
exports["default"] = _default;