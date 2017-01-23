'use strict';

var components = [];

var blacklist = [
    'octopus-lastrelease'
];

var refresh = function () {
    for (var index in components){
        components[index].refresh();
    }
};

var init = function(core, io, settings, assignedLogger, scheduler,watchdog){
    assignedLogger.info('Octopus Deploy package loaded, loading plugins');
    components = core.util.submoduleLoader(__dirname,'octopus-*.js',function(moduleName, module, watchdogKicker){
        module.init(core, io,settings,assignedLogger.fork(moduleName.replace('octopus-','')),scheduler, watchdogKicker);
    },assignedLogger, blacklist, watchdog, 'edp-octopusdeploy');
};

module.exports = {
    init : init,
    refresh : refresh
};