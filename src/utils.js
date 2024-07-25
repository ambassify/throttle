function noop() { return; }
function isFunction(v) { return typeof v === 'function'; }
function isNumber(v) { return typeof v === 'number'; }
function isPromise(v) { return v && isFunction(v.then) && isFunction(v.catch); }
function isNil(v) { return v === null || typeof v === 'undefined'; }

module.exports = {
    noop,
    isFunction,
    isNumber,
    isPromise,
    isNil,
};
