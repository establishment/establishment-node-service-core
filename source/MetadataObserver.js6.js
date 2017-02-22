const {RedisConnectionPool} = require("establishment-node-core");

const Glue = require("./Glue.js6.js");

class MetadataObserver {
    constructor(config) {
        this.redisConnection = RedisConnectionPool.getSharedConnection(config.redis.address);

        this.guestConnectionsKey = config.redis.key.guestConnections;

        this.guestConnectionCounter = 0;

        this.redisConnection.on("error", (err) => {
            Glue.logger.error("Establishment::MetaDataObserver redis connection: " + err);
        });
    }
    
    getTotalGuestConnections() {
        // TODO: this is not accurate, but good enough
        this.redisConnection.get(this.guestConnectionsKey, (error, reply) => {
            if (error) {
                Glue.logger.critical("Establishment::MetadataObserver error: failed to get Redis key \"" +
                                     this.guestConnectionsKey + "\"");
                return;
            }
            if (reply == null) {
                Glue.logger.critical("Establishment::MetadataObserver error: there is no value set to Redis key \"" +
                                     this.guestConnectionsKey + "\"");
                return;
            }
            this.guestConnectionCounter = reply;
        });
        return this.guestConnectionCounter;
    }
}

module.exports = MetadataObserver;