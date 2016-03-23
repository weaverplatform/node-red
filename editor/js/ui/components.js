noflo = require('noflo')

var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

PlusOne = (function(superClass) {
    extend(PlusOne, superClass);

    function PlusOne(primary, res, inputType) {
        var calculate;
        if (primary == null) {
            primary = 'number';
        }
        if (res == null) {
            res = 'total';
        }
        if (inputType == null) {
            inputType = 'number';
        }
        this.inPorts = {};
        this.outPorts = {};
        this.inPorts[primary] = new noflo.Port(inputType);
        this.inPorts.clear = new noflo.Port('bang');
        this.inPorts['ping'] = new noflo.Port('bang');
        this.outPorts[res] = new noflo.Port('number');
        this.primary = {
            value: null,
            group: [],
            disconnect: false
        };
        this.groups = [];
        calculate = (function(_this) {
            return function() {
                var group, i, j, len, len1, ref, ref1;
                ref = _this.primary.group;
                for (i = 0, len = ref.length; i < len; i++) {
                    group = ref[i];
                    _this.outPorts[res].beginGroup(group);
                }
                if (_this.outPorts[res].isAttached()) {
                    _this.outPorts[res].send(_this.calculate(_this.primary.value));
                }
                ref1 = _this.primary.group;
                for (j = 0, len1 = ref1.length; j < len1; j++) {
                    group = ref1[j];
                    _this.outPorts[res].endGroup();
                }
                if (_this.outPorts[res].isConnected() && _this.primary.disconnect) {
                    return _this.outPorts[res].disconnect();
                }
            };
        })(this);
        this.inPorts[primary].on('begingroup', (function(_this) {
            return function(group) {
                return _this.groups.push(group);
            };
        })(this));
        this.inPorts[primary].on('data', (function(_this) {
            return function(data) {
                _this.primary = {
                    value: data,
                    group: _this.groups.slice(0),
                    disconnect: false
                };
                return calculate();
            };
        })(this));
        this.inPorts[primary].on('endgroup', (function(_this) {
            return function() {
                return _this.groups.pop();
            };
        })(this));
        this.inPorts[primary].on('disconnect', (function(_this) {
            return function() {
                _this.primary.disconnect = true;
                return _this.outPorts[res].disconnect();
            };
        })(this));
        this.inPorts['ping'].on('data', (function(_this) {
            return function(data) {
                return console.log('pong');
            };
        })(this));
        this.inPorts.clear.on('data', (function(_this) {
            return function(data) {
                var group, i, len, ref;
                if (_this.outPorts[res].isConnected()) {
                    ref = _this.primary.group;
                    for (i = 0, len = ref.length; i < len; i++) {
                        group = ref[i];
                        _this.outPorts[res].endGroup();
                    }
                    if (_this.primary.disconnect) {
                        _this.outPorts[res].disconnect();
                    }
                }
                _this.primary = {
                    value: null,
                    group: [],
                    disconnect: false
                };
                return _this.groups = [];
            };
        })(this));
    }

    PlusOne.prototype.calculate = function(number) {
        return Number(number) + 1;
    };

    return PlusOne;

})(noflo.Component);

Output = (function(superClass) {
    extend(Output, superClass);

    function Output() {
        this.inPorts = {
            "in": new noflo.Port('all')
        };
        this.inPorts['in'].on('data', (function(_this) {
            return function(data) {
                return console.log(data);
            };
        })(this));
    }

    return Output;

})(noflo.Component);

