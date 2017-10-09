const Glue = require("../Glue.js6.js");

class PermissionDispatcher {
    constructor() {
        this.identificationQueue = new Map();
        this.permissionQueue = new Map();
        this.permissionReceiverToPermissionRequests = new Map();
    }

    registerIdentification(permissionReceiver) {
        let session = permissionReceiver.getSession();
        if (session == null) {
            // Glue.logger.info("Establishment::PermissionDispatcher: tried to register identification for an " +
            //                  "permissionReceiver that does not have a session id. Skipping ...");
            return;
        }
        let permissionReceivers = null;
        if (this.identificationQueue.has(session)) {
            permissionReceivers = this.identificationQueue.get(session);
        } else {
            permissionReceivers = new Set();
            this.identificationQueue.set(session, permissionReceivers);
        }
        permissionReceivers.add(permissionReceiver);
    }

    registerPermission(permissionReceiver, channel) {
        let userId = permissionReceiver.getUserId();
        if (userId == -1) {
            // Glue.logger.info("Establishment::PermissionDispatcher: tried to register permission for an " +
            //                  "permissionReceiver that does not have a user id. SKipping ...");
            return;
        }
        let userIds = null;
        if (!this.permissionQueue.has(channel)) {
            userIds = new Map();
            this.permissionQueue.set(channel, userIds);
        } else {
            userIds = this.permissionQueue.get(channel);
        }

        let permissionReceivers = null;
        if (!userIds.has(userId)) {
            permissionReceivers = new Set();
            userIds.set(userId, permissionReceivers);
        } else {
            permissionReceivers = userIds.get(userId);
        }
        permissionReceivers.add(permissionReceiver);

        let channels = null;
        if (this.permissionReceiverToPermissionRequests.has(permissionReceiver)) {
            channels = this.permissionReceiverToPermissionRequests.get(permissionReceiver);
        } else {
            channels = new Map();
            this.permissionReceiverToPermissionRequests.set(permissionReceiver, channels);
        }

        userIds = null;
        if (channels.has(channel)) {
            userIds = channels.get(channel);
        } else {
            userIds = new Set();
            channels.set(channel, userIds);
        }
        userIds.add(userId);
    }

    unregisterIdentification(permissionReceiver) {
        let session = permissionReceiver.getSession();
        if (session != null) {
            if (this.identificationQueue.has(session)) {
                let permissionReceivers = this.identificationQueue.get(session);
                permissionReceivers.delete(permissionReceiver);
            }
        }
    }

    unregisterPermissionForward(permissionReceiver, userId, channel) {
        if (!this.permissionQueue.has(channel)) {
            return;
        }
        let userIds = this.permissionQueue.get(channel);

        if (!userIds.has(userId)) {
            return;
        }
        let permissionReceivers = userIds.get(userId);

        permissionReceivers.delete(permissionReceiver);
        if (permissionReceivers.size == 0) {
            userIds.delete(userId);
            if (userIds.size == 0) {
                this.permissionQueue.delete(channel);
            }
        }
    }

    unregisterPermissionReverse(permissionReceiver, userId, channel) {
        if (!this.permissionReceiverToPermissionRequests.has(permissionReceiver)) {
            return;
        }
        let channels = this.permissionReceiverToPermissionRequests.get(permissionReceiver);

        if (!channels.has(channel)) {
            return;
        }
        let userIds = channels.get(channel);

        userIds.delete(userId);
        if (userIds.size == 0) {
            channels.delete(channel);
            if (channels.size == 0) {
                this.permissionReceiverToPermissionRequests.delete(permissionReceiver);
            }
        }
    }

    unregisterPermission(permissionReceiver, userId, channel) {
        this.unregisterPermissionForward(permissionReceiver, userId, channel);
        this.unregisterPermissionReverse(permissionReceiver, userId, channel);
    }

    unregisterAllPermissions(permissionReceiver) {
        if (this.permissionReceiverToPermissionRequests.has(permissionReceiver)) {
            let permissionRequests = this.permissionReceiverToPermissionRequests.get(permissionReceiver);
            let temp = [];
            for (let permissionRequest of permissionRequests) {
                temp.push(permissionRequest);
            }
            for (let permissionRequest of temp) {
                this.unregisterPermission(permissionReceiver, permissionRequest.userId, permissionRequest.channel);
            }
        }
    }

    unregister(permissionReceiver) {
        this.unregisterIdentification(permissionReceiver);
        this.unregisterAllPermissions(permissionReceiver);
    }

    onIdentificationResult(sessionId, userId) {
        if (!this.identificationQueue.has(sessionId)) {
            return;
        }
        let permissionReceivers = this.identificationQueue.get(sessionId);
        for (let permissionReceiver of permissionReceivers) {
            permissionReceiver.processIdentificationResult(userId);
        }
        this.identificationQueue.delete(sessionId);
    }

    onPermissionResult(userId, channel, canRegister, reason) {
        if (!this.permissionQueue.has(channel)) {
            return;
        }
        let userIds = this.permissionQueue.get(channel);

        if (!userIds.has(userId)) {
            return;
        }
        let permissionReceivers = userIds.get(userId);
        let temp = [];
        for (let permissionReceiver of permissionReceivers) {
            temp.push(permissionReceiver);
        }
        for (let permissionReceiver of temp) {
            this.unregisterPermission(permissionReceiver, userId, channel);
            permissionReceiver.processPermissionResult(channel, canRegister, reason);
        }
    }
}

module.exports = PermissionDispatcher;
