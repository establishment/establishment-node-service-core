const EventEmitter = require('events');
const {RedisConnectionPool} = require("establishment-node-core");

const Glue = require("./Glue.js6.js");

class RPCServer extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.redisInputStream = config.redis.inputStream;
        this.redisOutputStream = config.redis.outputStream;

        this.redisSubscriber = null;
        this.redisClient = null;
    }

    start() {
        this.redisSubscriber = RedisConnectionPool.getConnection(this.config.redis.address);
        this.redisClient = RedisConnectionPool.getSharedConnection(this.config.redis.address);

        this.redisSubscriber.on("error", (err) => {
            Glue.logger.error("Establishment::RPCServer subscriber: " + err);
        });

        this.redisSubscriber.on("ready", () => {
            Glue.logger.info("Establishment::RPCServer subscriber ready!");
        });

        this.redisSubscriber.on("message", (channel, message) => {
            this.process(message);
        });

        this.redisSubscriber.subscribe(this.redisInputStream);
    }

    process(message) {
        let response;

        try {
            response = JSON.parse(message);
        } catch (error) {
            Glue.logger.critical("Establishment::RPCServer: bad RPC message \"" + message + "\": " + error);
            return;
        }

        if (!response.hasOwnProperty("command")) {
            Glue.logger.critical("Establishment::RPCServer: bad RPC message \"" + message + "\": no command property");
            return;
        }

        if (!response.hasOwnProperty("params")) {
            Glue.logger.critical("Establishment::RPCServer: bad RPC message \"" + message + "\": no params property");
            return;
        }

        this.emit(response.command, response.params, (message) => {
            this.rpcResponse(message);
        });
    }

    rpcResponse(message) {
        this.redisClient.publish(this.redisOutputStream, message);
    }
}

module.exports = RPCServer;
