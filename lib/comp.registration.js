/**
 * Created by ammarch on 4/24/14.
 */
'use strict';
var cloud;
var logger;
var common = require('./common'),
    schemaValidation = require('./schema-validator');



var sampleReg = { "s": "temp-sensor",
    "t": "float",
    "u": "Celsius" };


/**
 * Sample Message the will be built in order to registrate component to IOT Analytics
 * @type {{cid: string, name: string, type: string}}
 */
var sampleCompReg = {
    "cid": "436e7e74-6771-4898-9057-26932f5eb7e1",
    "name": "Temperature Sensor 1",
    "type": "temperature.v1"
};

var component = function (connector, SensorStore, logT) {
    var me = this;
    var logger = logT || {};
    me.connector = connector;
    me.store = SensorStore;
    me.validator = schemaValidation.validateSchema(schemaValidation.schemas.component.REG);

    /**
     * It will process a component registration if it is not a componet registration will return false
     * @param msg
     * @returns {boolean}
     */
    me.registration = function (msg) {
        if (me.validator(msg)) {
            logger.debug ("Component Registration detected ", msg);
            var sen = {name: msg.n,
                       type: msg.t};
            var comp = me.store.exist(sen);
            /**
             * if Component Exist an has different type
             */
            if (!comp) {
                sen = SensorStore.add(sen);
                me.connector.regComponent(sen);
                SensorStore.save(sen);
            }
            return true;
        } else {
            logger.error('Invalid message format. Expected %j got %j', sampleReg, msg, {});
            return false;
        }

    };

};

module.exports.handler = function (msg) {



};


var messageHandler = function(msg) {
    logger.debug("JSON Message: ", msg);
    if (msg === undefined) {
        logger.error('Invalid message received (empty)');
        return;
    }
    if (msg.v !== undefined) {
        // This is a metric message
        // Validate the input args
        if (msg.s === undefined  || msg.v === undefined) {
            logger.error('Invalid message format. Expected %j got %j', sampleMetric, msg, {});
            return;
        }
        if (!cloud.registrationCompleted) {
            logger.error('Cloud device registration has not been yet completed.');
            return;
        }
        if (cloud.sensorsList[msg.s] === undefined) {
            logger.error('The requested sensor: %s have not been registered.', msg.s);
            return;
        }
        // send it anyway
        cloud.metric(msg);
    } else {
        // This is a registration message
        // Validate the input args
        if (!msg.s) {
            logger.error('Invalid message format. Expected %j got %j', sampleReg, msg, {});
            return;
        }
        if (!cloud.registrationCompleted) {
            logger.error('Cloud device registration has not been yet completed.');
            return;
        }
        cloud.sensorsList[msg.s] = {
            units: msg.u || 'number',
            data_type: msg.t || 'float',
            name: msg.s,
            items: 1 };
        cloud.reg();
    }
};
var init = function(loggerObj, cloudObj) {
    logger = loggerObj;
    cloud = cloudObj;
};
module.exports.init = init;
module.exports.messageHandler = messageHandler;