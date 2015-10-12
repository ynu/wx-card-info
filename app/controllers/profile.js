var express = require('express'),
    router = express.Router();
var wxent = require('wechat-enterprise');
var wxerrmsg = require('wx-errmsg');
var config = require('../../config/config');

var EventProxy = require('eventproxy');
var proxy = new EventProxy();

var util = require('util');

// https://github.com/nomiddlename/log4js-node
var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('DEBUG');

var soap = require('soap');
var crypto = require('crypto');

// 修改一卡通密码的web service的URL
var url = config.webservice.url;
//分配的应用id
var id = config.webservice.id;
//分配的应用秘钥
var key = config.webservice.key;

var wxcfg = {
    token: config.profile.token,
    encodingAESKey: config.profile.aesKey,
    corpId: config.qyh.corpId,
    secret: config.qyh.secret,
    agentId: config.profile.agentId
};

var client;
soap.createClient(url, function (err, _client) {
    if (err) {
        console.info("soap.createClient error");
        // http://stackoverflow.com/questions/5266152/how-to-exit-in-node-js
        process.exit(1);
    }
    client = _client;
});

var last_token_request_time_in_seconds = 0;
var last_web_service_token;

var card_web_service_utils = {

    /**
     * 带缓存功能的获取token、
     */
    'request_token': function () {
        //获取当前时间戳(getTime返回距1970.01.01之间的毫秒数)，秒为单位
        var now_in_seconds = parseInt(new Date().getTime() / 1000);
        // 如果上次获取的token超过十分钟
        if (now_in_seconds - last_token_request_time_in_seconds > 10 * 60) {
            //组合以上参数使用MD5加密生成32位小写字符串作为签名
            var md5 = crypto.createHash('md5');
            md5.update(id + key + now_in_seconds);
            var sign = md5.digest('hex');
            var token_request_data = {id: id, sign: sign, time: now_in_seconds};
            //获取token
            client.get_token(token_request_data, function (err, result) {
                //console.log(JSON.stringify(JSON.parse(result.return.$value), null, 4));
                last_token_request_time_in_seconds = now_in_seconds;
                last_web_service_token = JSON.parse(result.return.$value).msg;
                logger.debug('last_web_service_token: ' + last_web_service_token);
                proxy.trigger("token", last_web_service_token);
                return last_web_service_token;
            });
        }
        else {
            proxy.trigger("token", last_web_service_token);
            return last_web_service_token;
        }
    },

    'validate_password' : function(password) {
        var reg = /^[A-Za-z0-9]{6,}$/;
        return reg.test(password);
    },
};

var handleEvent = function (eventHandlers) {
    return function (msg, req, res, next) {
        try {
            if (eventHandlers[msg.EventKey]) {
                eventHandlers[msg.EventKey](msg, req, res, next);
            } else {
                res.reply('正在建设中：' + msg.EventKey);
            }
        } catch (err) {
            res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + err.toString());
        }
    }
};

var handleText = function (textHandlers, sessionName) {
    return function (msg, req, res, next) {
        try {
            if (req.wxsession[sessionName]) {
                textHandlers[req.wxsession[sessionName]](msg, req, res, next);
            } else {
                res.reply('正在建设中~');
            }
        } catch (err) {
            res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + err.toString());
        }
    };
};

var EventHandlers = {

    /**
     * 提示修改用户密码信息
     */
    'user_password_info': function (msg, req, res, next) {
        var wxapi = require('wxent-api-redis')(wxcfg.corpId, wxcfg.secret, wxcfg.agentId, config.redis.host, config.redis.port);
        wxapi.getUser(msg.FromUserName, function (err, user) {
            req.wxsession.process = 'user_password_info';
            var user_attrs = user.extattr.attrs;
            //console.info(JSON.stringify(user, null, 4));
            // 获取用户的'一卡通号'卡号，保存在session中
            var attr_value;
            for (index in user_attrs) {
                if (user_attrs[index].name == '一卡通号') {
                    attr_value = user_attrs[index].value;
                }
            }
            if (attr_value) {
                res.reply(util.format('您的一卡通号是%s\n' +
                    '请直接回复新密码修改一卡通密码', attr_value));
                req.wxsession.card_num = attr_value;
                req.wxsession.save();
                //console.info(JSON.stringify(req.wxsession, null, 4));
            }
            else {
                res.reply(util.format('不小心发生点错误了，呜呜呜～～～'));
            }
        });
    },

    /**
     * 故障报修
     */
    'troublshooting': function (msg, req, res, next) {
        res.reply('网络故障请拨 65031141，网络与信息中心竭诚为您服务。');
    },

};

var TextProcessHandlers = {

    /**
     * 修改一卡通密码
     */
    'user_password_info': function (msg, req, res, next) {
        if(card_web_service_utils.validate_password(msg.Content) && req.wxsession.card_num) {
            function token_got(token) {
                var edit_user_request_data = {
                    'user_name': req.wxsession.card_num,
                    'user_data': JSON.stringify({'user_password': msg.Content}),
                    'token': token
                };
                client.edit_user(edit_user_request_data, function (err, result) {
                    // 清楚session信息
                    delete req.wxsession.process;;
                    delete req.wxsession.card_num;

                    if (err) {
                        res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + err.toString());
                    }
                    else if (JSON.parse(result.return.$value).msg !== '成功') {
                        res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + JSON.parse(result.return.$value).msg);
                    }
                    else {
                        res.reply('修改密码成功');
                    }
                });
            };
            proxy.assign("token", token_got);
            card_web_service_utils.request_token();
        }
        else {
            res.reply('修改的密码只能是数字字母的组合，且长度大于6');
        }
    },
};


module.exports = function (app, cfg) {
    app.use('/profile', router);
    router.use('/', wxent(wxcfg, wxent.event(handleEvent(EventHandlers)).text(handleText(TextProcessHandlers, 'process'))));
};