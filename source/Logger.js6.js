const {Util} = require("establishment-node-core");

const RedisStreamPublisher = require("./RedisStreamPublisher.js6.js");

class Logger {
    constructor(redisAddress, name, minLevel) {
        if (redisAddress != -1) {
            this.redisStreamPublisher = new RedisStreamPublisher(redisAddress, "global_logging");
            this.redisStreamPublisher.setRaw(false);
            this.redisStreamPublisher.setPersistence(false);
        } else {
            this.redisStreamPublisher = null;
        }

        this.service = {};
        this.service["pid"] = -1;
        this.service["initTime"] = Util.getUnixTime();
        this.service["machineIP"] = Util.getNetworkAddress();
        this.service["name"] = name;
        this.minLevel = minLevel;
    }

    debug(message) {
        this.log(Logger.Level.debug, message);
    }

    info(message) {
        this.log(Logger.Level.info, message);
    }

    warn(message) {
        this.log(Logger.Level.warn, message);
    }

    warning(message) {
        this.warn(message);
    }

    error(message) {
        this.log(Logger.Level.error, message);
    }

    critical(message) {
        this.log(Logger.Level.critical, message);
    }

    log(level, message) {
        if (level.priority < this.minLevel.priority) {
            return;
        }

        if (level.printToConsole) {
            console.log("[" + level.tag + "] " + message);
        }

        if (this.redisStreamPublisher != null) {
            let logMessage = {};
            logMessage["levelname"] = level.tag;
            logMessage["message"] = message;
            logMessage["module"] = "not-supported";
            logMessage["created"] = Util.getUnixTime();
            logMessage["filename"] = "not-supported";
            logMessage["funcName"] = "not-supported";
            logMessage["lineno"] = -1;
            logMessage["processName"] = "not-supported";
            logMessage["service"] = this.service;
            logMessage["asctime"] = new Date().toISOString().replace('T', ' ').replace('Z', '').replace('.', ',');

            this.redisStreamPublisher.publish(JSON.stringify(logMessage));
        }
    }

    static getLevel(name) {
        let nameMapper = {  debug: Logger.Level.debug,
                            info: Logger.Level.info,
                            warn: Logger.Level.warn,
                            error: Logger.Level.error,
                            critical: Logger.Level.critical };

        return nameMapper[name.toLowerCase()];
    }

    static getDummyAPI() {
        return {
            debug: function(){},
            info: function(){},
            warn: function(){},
            error: function(){},
            critical: function(){},
            log: function(){},
            isDummy: true
        };
    }
}

Logger.Level = {
    none: {
        priority: 999
    },
    debug: {
        priority: 0,
        tag: "DEBUG",
        printToConsole: false
    },
    info: {
        priority: 1,
        tag: "INFO",
        printToConsole: false
    },
    warn: {
        priority: 2,
        tag: "WARN",
        printToConsole: false
    },
    error: {
        priority: 3,
        tag: "ERROR",
        printToConsole: true
    },
    critical: {
        priority: 4,
        tag: "CRITICAL",
        printToConsole: true
    }
};


module.exports = Logger;
