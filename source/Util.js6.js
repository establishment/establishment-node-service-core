const {Util} = require("establishment-node-core");

const Glue = require("./Glue.js6.js");

let machineIdScript = null;
let mockMachineId = -1;

module.exports.machineId = null;

module.exports.setMockMachineId = (machineId) => {
    mockMachineId = machineId;
};

module.exports.setMachineIdScript = (scriptPath) => {
    if (scriptPath && scriptPath.charAt(0) == "/") {
        machineIdScript = scriptPath;
    } else {
        if (process.env.DAEDALUS_PROJECT_PATH) {
            machineIdScript = process.env.DAEDALUS_PROJECT_PATH + "/" + scriptPath;
        } else {
            machineIdScript = scriptPath;
        }
    }
};

module.exports.queryMachineId = (callback) => {
    if (machineIdScript) {
        module.exports.machineId = Util.execute(machineIdScript, (error, stdout, stderr) => {
            if (error) {
                Glue.logger.critical("Establishment::Util: failed to execute getMachineId script!");
                return;
            }
            if (stdout.toUpperCase() != "NONE") {
                module.exports.machineId = parseInt(stdout);
            }
            callback(module.exports.machineId);
        });
    } else {
        module.exports.machineId = mockMachineId;
        callback(module.exports.machineId);
    }
};

module.exports.getMachineId = () => {
    if (module.exports.machineId == null) {
        module.exports.queryMachineId();
    }
    return module.exports.machineId;
};
