const EventEmitter = require('events');

const Glue = require("../Glue.js6.js");
const {RedisConnectionPool} = require("establishment-node-core");

class PermissionChecker extends EventEmitter {
    constructor(config) {
        super();
        this.redisPermissionChannel = config.redis.stream.permission;
        this.redisIdentificationChannel = config.redis.stream.identification;
        this.redisSubscriberClient = RedisConnectionPool.getConnection(config.redis.address);
        this.redisPublisherClient = RedisConnectionPool.getSharedConnection(config.redis.address);

        this.redisPublisherClient.on("error", (err) => {
            Glue.logger.error("Establishment::PermissionChecker publisher: " + err);
        });

        this.redisSubscriberClient.on("error", (err) => {
            Glue.logger.error("Establishment::PermissionChecker subscriber: " + err);
        });

        this.redisSubscriberClient.on("ready", () => {
            Glue.logger.info("Establishment::PermissionChecker connected to Redis!");
        });

        this.redisSubscriberClient.on("subscribe", (channel, count) => {
        });

        this.redisSubscriberClient.on("unsubscribe", (channel, count) => {
        });

        this.redisSubscriberClient.on("message", (channel, message) => {
            this.processRedisMessage(channel, message);
        });

        this.redisPermissionChannelQuestion = this.redisPermissionChannel + "-q";
        this.redisPermissionChannelAnswer = this.redisPermissionChannel + "-a";

        this.redisIdentificationChannelQuestion = this.redisIdentificationChannel + "-q";
        this.redisIdentificationChannelAnswer = this.redisIdentificationChannel + "-a";

        this.redisSubscriberClient.subscribe(this.redisPermissionChannelAnswer);
        this.redisSubscriberClient.subscribe(this.redisIdentificationChannelAnswer);
    }

    processRedisMessage(channel, message) {
        if (channel == this.redisPermissionChannelAnswer) {
            this.processPermissionAnswer(message);
        } else if (channel == this.redisIdentificationChannelAnswer) {
            this.processIdentificationAnswer(message);
        }
    }

    processPermissionAnswer(message) {
        let response;

        try {
            response = JSON.parse(message);
        } catch (error) {
            Glue.logger.critical("Establishment::PermissionChecker: bad PermissionAnswer message \"" + message +
                                 "\": " + error);
            return;
        }

        if (!response.hasOwnProperty("userId")) {
            Glue.logger.critical("Establishment::PermissionChecker: bad PermissionAnswer message \"" + message +
                                 "\": no userId property");
            return;
        }

        if (!response.hasOwnProperty("streamName")) {
            Glue.logger.critical("Establishment::PermissionChecker: bad PermissionAnswer message \"" + message +
                                 "\": no streamName property");
            return;
        }

        if (!response.hasOwnProperty("canRegister")) {
            Glue.logger.critical("Establishment::PermissionChecker: bad PermissionAnswer message \"" + message +
                                 "\": no canRegister property");
            return;
        }

        if (!response.hasOwnProperty("reason")) {
            Glue.logger.critical("Establishment::PermissionChecker: bad PermissionAnswer message \"" + message +
                                 "\": no reason property");
            return;
        }

        this.emit("permissionResult", response.userId, response.streamName, response.canRegister, response.reason);
    }

    processIdentificationAnswer(message) {
        let response;

        try {
            response = JSON.parse(message);
        } catch (error) {
            Glue.logger.critical("Establishment::PermissionChecker: bad IdentificationAnswer message \"" + message +
                                 "\": " + error);
            return;
        }

        if (!response.hasOwnProperty("sessionKey")) {
            Glue.logger.critical("Establishment::PermissionChecker: bad IdentificationAnswer message \"" + message +
                                 "\": no sessionKey property");
            return;
        }
        if (!response.hasOwnProperty("userId")) {
            Glue.logger.critical("Establishment::PermissionChecker: bad IdentificationAnswer message \"" + message +
                                 "\": no userId property");
            return;
        }

        this.emit("identificationResult", response.sessionKey, response.userId);
    }

    requestPermission(userId, channel) {
        let request = {
            "userId": userId,
            "streamName": channel
        };
        this.redisPublisherClient.publish(this.redisPermissionChannelQuestion, JSON.stringify(request));
    }

    requestIdentification(sessionKey) {
        let request = {
            "sessionKey": sessionKey
        };
        this.redisPublisherClient.publish(this.redisIdentificationChannelQuestion, JSON.stringify(request));
    }

    link(permissionDispatcher) {
        this.on("identificationResult", (sessionId, userId) => {
            permissionDispatcher.onIdentificationResult(sessionId, userId);
        });
        this.on("permissionResult", (userId, channel, canRegister, reason) => {
            permissionDispatcher.onPermissionResult(userId, channel, canRegister, reason);
        });
    }
}

module.exports = PermissionChecker;
