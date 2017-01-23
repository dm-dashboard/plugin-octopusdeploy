'use strict';

var _ = require('lodash'),
    BBPromise = require('bluebird'),
    mongoose = BBPromise.promisifyAll(require('mongoose')),
    moment = require('moment'),
    Client = require('node-rest-client').Client;

var wrapRestCall,
    socketIO,
    settingsGetter,
    _cachedMessage,
    lastSettings,
    octopusServers,
    logger,
    _watchdogKicker;

var projectsToWatch = [];

var requestArgs = {
    headers: {
        'Accept': 'application/json'
    }
};

var messageReceived = function (message, callback) {
    sendToSockets();
};

var refresh = function () {
    if (_cachedMessage !== null) {
        socketIO.sendMessageToAllSockets(_cachedMessage);
    }
};

var processRelease = function (releaseDetails, threshold) {
    var timeSinceDeploy = moment().diff(moment(releaseDetails.Created),'hours');
    return {
        name : releaseDetails.Name,
        deployDate : releaseDetails.Created,
        project : releaseDetails.projectName,
        environment : releaseDetails.environmentName,
        status : timeSinceDeploy > threshold ? 'stale' : 'fresh'
    };
};

function getRelease(server, project) {
    var url = 'api/deployments?take=1&taskState=Success&apikey=' + server.apikey + '&projects=' +
        project.project + '&environments=' + project.environment;

    return new BBPromise(function (resolve, reject) {
        server.client.get(server.url + url, function (data, response) {
            resolve(JSON.parse(data.toString()));
        }).on('error', function (error) {
            reject(error);
        });
    })
        .then(function (result) {
            return result.Items[0];
        });
}


function getReleaseProject(release, server, projectUrl) {
    var url = projectUrl +  '?apikey=' + server.apikey;

    return new BBPromise(function (resolve, reject) {
        server.client.get(server.url + url, function (data, response) {
            resolve(JSON.parse(data.toString()));
        }).on('error', function (error) {
            reject(error);
        });
    })
        .then(function (result) {
            release.projectName = result.Name;
            return release;
        });
}

function getReleaseEnvironment(release, server, projectUrl) {
    var url = projectUrl +  '?apikey=' + server.apikey;

    return new BBPromise(function (resolve, reject) {
        server.client.get(server.url + url, function (data, response) {
            resolve(JSON.parse(data.toString()));
        }).on('error', function (error) {
            reject(error);
        });
    })
        .then(function (result) {
            release.environmentName = result.Name;
            return release;
        });
}


var getReleases = function (server) {

    var projectsForServer = projectsToWatch.filter(function(project){
       return project.server === server.name;
    });

    return BBPromise.map(projectsForServer, function(project){
        return getRelease(server,project)
            .then(function(release){
                return getReleaseProject(release, server, release.Links.Project);
            })
            .then(function(release){
                return getReleaseEnvironment(release, server, release.Links.Environment);
            })
            .then(function(release){
                return processRelease(release,project.threshold);
            });
    });
};

var _newCache = {};



var createMessage = function (releases) {
    _newCache.releases = [];
    _.forEach(releases, function(serverReleases){
        _newCache.releases = _newCache.releases.concat(serverReleases);
    });
    _cachedMessage = _newCache;
};

var sendToSockets = function () {
    var message = {
        name: 'octopus-lastrelease',
        payload: _cachedMessage
    };
    socketIO.sendMessageToAllSockets(message);
};

var _requestInProgress = false;
var refreshReleaseStatus = function () {
    if (_requestInProgress){
        logger.debug('Not refreshing as a request is already in progress');
        return;
    }
    _watchdogKicker();
    _requestInProgress = true;
    logger.debug('Getting latest release status from Octopus Deploy');
    _newCache.releases = [];
    refreshSettings()
        .then(function () {
            return BBPromise.map(octopusServers, function (server) {
                return getReleases(server);
            });
        })
        .then(createMessage)
        .then(sendToSockets)
        .catch(function (err) {
            logger.error(err);
        })
        .finally(function () {
            _requestInProgress = false;
        });
};


var loadServerDetails = function(newSettings, customCallback){
    var servers = [];
    _.forEach(newSettings.servers, function (server) {
        if (server.active) {
            var client = new Client();
            var newServer = {
                name: server.name,
                url: server.url,
                apikey : server.apikey,
                client: client
            };
            newServer.rest_generic_get = wrapRestCall(client.get);
            customCallback(newServer);
            servers.push(newServer);
        }
    });
    return servers;
};

var refreshSettings = function () {
    return new BBPromise(function (resolve, reject) {
        settingsGetter()
            .then(function (newSettings) {
                if (newSettings === null) {
                    reject(new Error('Plugin load error - missing settings [octopus]'));
                }
                if (!_.isEqual(lastSettings, newSettings)) {
                    logger.debug('Settings changed, recreating client');

                    octopusServers = loadServerDetails(newSettings, function (newServer) {
                        newServer.rest_lastrelease = wrapRestCall(newServer.client, 'lastrelease', newServer.url + 'api/deployments?take=1&taskState=Success&apikey=' + newServer.apikey, 'GET');
                    });

                    projectsToWatch = newSettings.lastReleaseTracking || [];

                    lastSettings = newSettings;
                    resolve(true);
                }
                resolve(false);
            })
            .catch(reject);
    });
};

var init = function (core, io, settings, assignedLogger, scheduler, watchdogKicker) {
    wrapRestCall = core.util.promiseRestWrapper;
    logger = assignedLogger;
    settingsGetter = settings;
    socketIO = io;
    socketIO.registerListener('octopus-lastrelease', messageReceived);
    _cachedMessage = {};
    _watchdogKicker = watchdogKicker;

    refreshSettings().then(function () {
        refreshReleaseStatus();
        setInterval(refreshReleaseStatus, 60*1000);
    });

};

module.exports = {
    init: init,
    refresh: refresh,
    messageReceived: messageReceived
};