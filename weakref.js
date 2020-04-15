const nodeMajorVersion = parseInt(process.versions.node.replace(/\..*/, ''));

module.exports = nodeMajorVersion >= 12 ?
    require('./weakref-generic') : // https://github.com/node-ffi-napi/weak-napi/issues/16
    require('weak-napi');
