const {RedisConnectionPool} = require("establishment-node-core");

const Glue = require("./Glue.js6.js");

class RegistryKeeper {
    constructor(config) {
        this.redisPrefix = config.redis.prefix;
        this.redisStream = config.redis.stream;
        this.redisSubscriber = RedisConnectionPool.getConnection(config.redis.address);
        this.redisClient = RedisConnectionPool.getSharedConnection(config.redis.address);
        this.cache = new Map();

        this.redisSubscriber.on("error", (err) => {
            Glue.logger.error("Establishment::RegistryKeeper subscriber: " + err);
        });

        this.redisSubscriber.on("ready", () => {
            Glue.logger.info("Establishment::RegistryKeeper subscriber ready!");
        });

        this.redisSubscriber.on("message", (channel, message) => {
            if (message == "reload") {
                Glue.logger.info("Establishment::RegistryKeeper reload issued!");
                this.reloadAll();
            }
        });

        this.redisSubscriber.subscribe(this.redisStream);

        if (config.redis.hasOwnProperty("keepTrack")) {
            this.keepTrack = config.redis.keepTrack;
        } else {
            this.keepTrack = [];
        }

        this.reloadAll();
    }

    get(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        } else {
            return null;
        }
    }

    reload(key) {
        this.redisClient.get(this.getRedisKey(key), (error, reply) => {
            this.cache.set(key, reply);
            Glue.logger.info("Establishment::RegistryKeeper: Hard reload '" + key + "' with '" + reply + "'");
        });
    }

    reloadAll() {
        for (let key of this.keepTrack) {
            this.reload(key);
        }
    }

    getRedisKey(key) {
        return this.redisPrefix + key;
    }

    static getDummyAPI() {
        return {
            get: function(){},
            reload: function(){},
            reloadAll: function(){},
            getRedisKey: function(){},
            isDummy: true
        };
    }
}

module.exports = RegistryKeeper;
