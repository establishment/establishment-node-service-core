class PermissionReceiver {
    constructor() {
    }

    getSession() {
        return null;
    }

    getUserId() {
        return -1;
    }

    processIdentificationResult(userId) {
    }

    processPermissionResult(channel, canRegister, reason) {
    }
}

module.exports = PermissionReceiver;
