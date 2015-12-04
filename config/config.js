/* global process */

var env = process.env.NODE_ENV || 'production';

var config = {
    development: {
        port: 50002,
        qyh: {
            corpId: process.env.QYH_CORPID,
            secret: process.env.QYH_SECRET
        },
        profile: {
            token: process.env.PROFILE_TOKEN,
            aesKey: process.env.PROFILE_AESKEY,
            agentId: process.env.PROFILE_AGENTID
        },
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT_6379_TCP_PORT || 6379
        },
        webservice: {
            url: process.env.WEBSERVICE_URL,
            id: process.env.WEBSERVICE_ID,
            key: process.env.WEBSERVICE_KEY
        }
    },

    production: {
        port: 50002,
        qyh: {
            corpId: process.env.QYH_CORPID,
            secret: process.env.QYH_SECRET
        },
        profile: {
            token: process.env.PROFILE_TOKEN,
            aesKey: process.env.PROFILE_AESKEY,
            agentId: process.env.PROFILE_AGENTID
        },
        redis: {
            host: process.env.REDIS_HOST || 'redis',
            port: process.env.REDIS_PORT_6379_TCP_PORT || 6379
        },
        webservice: {
            url: process.env.WEBSERVICE_URL,
            id: process.env.WEBSERVICE_ID,
            key: process.env.WEBSERVICE_KEY
        }
    }
};

module.exports = config[env];
