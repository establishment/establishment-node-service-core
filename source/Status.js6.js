const {Util} = require("establishment-node-core");

const RedisStreamPublisher = require("./RedisStreamPublisher.js6.js");
const ServiceUtil = require("./Util.js6.js");

class ServiceStatus {
    constructor(config) {
        this.streamPublisher = new RedisStreamPublisher(config.redis.address, "service_status");
        this.streamPublisher.setPersistence(false);

        this.statusBroadcastInterval = null;
        this.serviceName = config.name;
        if (config.hasOwnProperty("updateInterval")) {
            this.updateInterval = config.updateInterval;
        } else {
            this.updateInterval = 1000;
        }

        this.machineId = null;
        this.initTime = 0.0;
    }

    publish(eventType) {
        let status = {};

        // TODO: investigate how to get more info about process and machine in NodeJS, just like in Python
        /*
        status["uid"] = cls.mac_address;
        status["machineAddress"] = cls.machine_address;
        status["pid"] = cls.pid;
        */

        status["service"] = this.serviceName;
        status["time"] = Util.getUnixTime();
        status["updateInterval"] = this.updateInterval;

        /*
        status["peakMemUsage"] = rusage.ru_maxrss * resource.getpagesize();
        status["userCPU"] = rusage.ru_utime;
        status["systemCPU"] = rusage.ru_stime;
        status["softPageFaults"] = rusage.ru_minflt;
        status["hardPageFaults"] = rusage.ru_majflt;
        status["swapouts"] = rusage.ru_nswap;
        status["voluntaryContextSwitches"] = rusage.ru_nvcsw;
        status["involuntaryContextSwitches"] = rusage.ru_nivcsw;
        */

        status["uptime"] = Util.getUnixTime() - this.initTime;

        if (eventType == null) {
            eventType = "MachineInstance-serviceStatusUpdate";
        }

        let response = {
            "objectType": "MachineInstance",
            "type": eventType,
            "objectId": this.machineId,
            "data": {},
            "serviceStatus": status
        };

        this.streamPublisher.publish(JSON.stringify(response));
    }

    start() {
        ServiceUtil.queryMachineId((id) => {
            this.machineId = id;
            this.startPhase2();
        });
    }

    startPhase2() {
        this.initTime = Util.getUnixTime();

        this.publish("MachineInstance-serviceStatusStart");

        this.statusBroadcastInterval = setInterval(() => {
            this.publish();
        }, this.updateInterval);
    }

    stop() {
        this.publish("MachineInstance-serviceStatusStop");
        if (this.statusBroadcastInterval != null) {
            clearInterval(this.statusBroadcastInterval);
            this.statusBroadcastInterval = null;
        }
    }

    destroy() {
        this.stop();

        this.streamPublisher = null;
        this.statusBroadcastInterval = null;
        this.serviceName = null;
        this.updateInterval = null;
        this.machineId = null;
        this.initTime = null;
    }
}

module.exports = ServiceStatus;
