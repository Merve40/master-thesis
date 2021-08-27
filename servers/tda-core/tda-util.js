const { createLogger, format, transports } = require("winston");
const { combine, timestamp, label, printf, colorize, splat, json } = format;

module.exports = {
    readJson: function (json) {
        return {
            abi: json.abi,
            bytecode: json.bytecode,
            address: this.getAddress(json),
        };
    },
    stringToBytes32: function (web3, data) {
        var hex = web3.utils.asciiToHex(data);
        if (hex.length > 64) {
            throw "Input too long.";
        }
        return web3.utils.padLeft(hex, 64);
    },
    getAddress: function (json) {
        if (Object.keys(json.networks).length > 0) {
            return json.networks[
                Object.keys(json.networks)[
                    Object.keys(json.networks).length - 1
                ]
            ].address;
        } else {
            return null;
        }
    },
    getLogger: function (name, color) {
        const myFormat = printf(
            ({ level, message, label, timestamp, metadata }) => {
                metadata = metadata == undefined ? "" : metadata;
                if (typeof metadata === "object") {
                    metadata = JSON.stringify(metadata, 0, 2);
                }
                return `${timestamp} ${color}[${label}]\x1b[0m ${level}: ${message} ${metadata}`;
            }
        );

        return createLogger({
            level: "debug",
            format: combine(
                colorize(),
                label({ label: name }),
                timestamp(),
                splat(),
                json(),
                myFormat
            ),
            transports: [new transports.Console()],
            exitOnError: false,
        });
    },

    colors: {
        RED: "\x1b[31m",
        GREEN: "\x1b[32m",
        YELLOW: "\x1b[33m",
        BLUE: "\x1b[34m",
        MAGENTA: "\x1b[35m",
        CYAN: "\x1b[36m",
        BRIGHT_RED: "\x1b[91m",
        BRIGHT_GREEN: "\x1b[92m",
        BRIGHT_YELLOW: "\x1b[93m",
        BRIGHT_BLUE: "\x1b[94m",
        BRIGHT_MAGENTA: "\x1b[95m",
        BRIGHT_CYAN: "\x1b[96m",
    },
};
