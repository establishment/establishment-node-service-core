const fs = require("fs");
const {RedisConnectionPool} = require("establishment-node-core");

const Logger = require("./Logger.js6.js");
const RegistryKeeper = require("./RegistryKeeper.js6.js");
const Status = require("./Status.js6.js");
const UniqueIdentifierFactory = require("./UniqueIdentifierFactory.js6.js");

module.exports.logger = Logger.getDummyAPI();
module.exports.registryKeeper = RegistryKeeper.getDummyAPI();
module.exports.rpcId = null;
module.exports.serviceInstanceId = null;
module.exports.name = null;
module.exports.serviceStatus = null;

let serviceInstanceUidFactory = null;

module.exports.initLogger = (config) => {
    if (module.exports.logger.hasOwnProperty("isDummy")) {
        module.exports.logger = new Logger(config.redisAddress, config.name, Logger.getLevel(config.level));
    }
};

module.exports.initRegistryKeeper = (config) => {
    if (module.exports.registryKeeper.hasOwnProperty("isDummy")) {
        module.exports.registryKeeper = new RegistryKeeper(config);
    }
};

module.exports.initService = (config) => {
    if (!config.hasOwnProperty("name")) {
        console.log("ServiceGlue::initService failed to setup: missing field \"name\"");
        return;
    }
    module.exports.setName(config.name);
    if (config.hasOwnProperty("status")) {
        let statusServiceConfig = {
            "name": config.name,
            "redis": {
                "address": config.status.redis.address
            }
        };
        module.exports.initServiceStatus(statusServiceConfig);
    }
    if (config.hasOwnProperty("instanceId")) {
        let uidFactoryConfig = {
            "redis": {
                "address": config.instanceId.uidFactory.redis.address,
                "prefix": "meta-unique-identifier-nodejs-instance"
            }
        };
        serviceInstanceUidFactory = new UniqueIdentifierFactory(uidFactoryConfig);
        serviceInstanceUidFactory.requestUID((id) => {
            module.exports.serviceInstanceId = id;
            if (config.instanceId.hasOwnProperty("path")) {
                let path = config.instanceId.path;
                path = path.replace("$SERVICE_NAME", config.name);
                fs.writeFile(path, id, (err) => {
                    if (err) {
                        console.log("ServiceGlue::initService failed to save service instance id to file \"" + path + "\"");
                    }
                });
            }
            serviceInstanceUidFactory.destroy();
            serviceInstanceUidFactory = null;
        });
    }
};

module.exports.initServiceStatus = (config) => {
    if (module.exports.serviceStatus == null) {
        module.exports.serviceStatus = new Status(config);
        module.exports.serviceStatus.start();
    }
};

module.exports.setName = (name) => {
    module.exports.rpcId = name;
    module.exports.name = name;
};

module.exports.stop = (params, rpcCallback) => {
    let validRequest = true;

    if (params.hasOwnProperty("serviceInstanceId") && module.exports.serviceInstanceId != null) {
        if (params["serviceInstanceId"] != String(module.exports.serviceInstanceId)) {
            validRequest = false;
        }
    }
    if (params.hasOwnProperty("id") && module.exports.rpcId != null) {
        if (params["id"] != String(module.exports.rpcId)) {
            validRequest = false;
        }
    }

    if (!validRequest) {
        return;
    }

    if (module.exports.serviceStatus != null) {
        module.exports.serviceStatus.destroy();
        module.exports.serviceStatus = null;
    }

    if (serviceInstanceUidFactory != null) {
        serviceInstanceUidFactory.destroy();
        serviceInstanceUidFactory = null;
    }

    rpcCallback("Establishment::Glue::stop: Exit from process with rpcId " + module.exports.rpcId);
    RedisConnectionPool.quit();
    process.exit();
};
