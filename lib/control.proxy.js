/*
Copyright (c) 2014, Intel Corporation

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

"use strict";
var Sensor = require('../lib/sensors-store'),
    common = require('./common'),
    conf = require('../config'),
    proxyConnector = require('@open-iot-service-platform/oisp-sdk-js')(conf).lib.proxies;

function IoTKitControl(conf, logger, deviceId, customProxy) {
    var me = this;
    me.logger = logger;
    if (customProxy) {
        me.proxy = customProxy;
    } else if (proxyConnector) {
        var deviceInfo = common.getDeviceConfig();
        proxyConnector.updateDeviceInfo(deviceInfo);
        me.proxy = proxyConnector;
    }
    me.proxy = customProxy || proxyConnector;
    me.deviceId = deviceId;
    me.store = Sensor.init("device.json", logger);
    me.gatewayId = conf.gateway_id || deviceId;
    me.logger.debug('Cloud Proxy Created with Cloud Handler ', me.proxy.type);
    me.receiverInfo = {port: conf.receivers.udp_port, address: conf.receivers.udp_address};

}

IoTKitControl.prototype.send = function (actuation) {
    var me = this;
    if(me.dispatcher) {
        me.dispatcher.send(me.receiverInfo, actuation);
    }

    return true;
};

IoTKitControl.prototype.controlAction = function () {
    var me = this;
    var handler = function(message) {
        var comp = me.store.byCid(message.content.componentId);
        if (comp) {
            var actuation = {
                component: comp.name,
                command: message.content.command,
                argv: message.content.params
            };
            me.logger.info("Sending actuation: " + JSON.stringify(actuation));
            return me.send(actuation);
        }
    };
    return handler;
};

IoTKitControl.prototype.bind = function (dispatcher, callback) {
    var me = this;
    var data = {deviceId: me.deviceId};
    me.dispatcher = dispatcher;
    me.proxy.controlCommandListen(data, me.controlAction(), function() {
        if (callback) {
            callback();
        }
    });
};

exports.init = function(conf, logger, deviceId) {
    if(conf.default_connector === 'rest+ws') {
        proxyConnector = proxyConnector.getControlConnector('ws');
    }
    
    return new IoTKitControl(conf, logger, deviceId);
};
