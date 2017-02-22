const {RedisConnectionPool} = require("establishment-node-core");

class RedisStreamPublisher {
    constructor(redisAddress, streamName) {
        this.redisClient = RedisConnectionPool.getSharedConnection(redisAddress);
        this.raw = false;
        this.persistence = true;
        this.streamName = streamName;
        this.expireTime = RedisStreamPublisher.MESSAGE_TIMEOUT;
    }

    setRaw(raw) {
        this.raw = raw;
    }

    setPersistence(persistence) {
        this.persistence = persistence;
    }

    setExpireTime(expireTime) {
        this.expireTime = expireTime;
    }

    publish(message) {
        if (this.raw) {
            this.redisClient.publish(this.streamName, message)
        } else {
            if (this.persistence) {
                this.redisClient.incr(RedisStreamPublisher.getStreamIdCounter(this.streamName), (error, reply) => {
                    if (error != null) {
                        return;
                    }
                    this.redisClient.setex(RedisStreamPublisher.getStreamMessageIdPrefix(this.streamName) + reply,
                                           this.expireTime, message);
                    this.redisClient.publish(this.streamName, RedisStreamPublisher.formatMessageWithId(message, reply));
                });
            } else {
                this.redisClient.publish(this.streamName, RedisStreamPublisher.formatMessageVanilla(message))
            }
        }
    }

    static getStreamIdCounter(streamName) {
        return "meta-" + streamName + "-id-counter";
    }

    static getStreamMessageIdPrefix(streamName) {
        return "meta-" + streamName + "-msg-id-";
    }

    static formatMessageWithId(message, messageId) {
        return "i " + messageId + " " + message;
    }

    static formatMessageVanilla(message) {
        return "v " + message;
    }
}

RedisStreamPublisher.MESSAGE_TIMEOUT = 60 * 60 * 5;

module.exports = RedisStreamPublisher;
