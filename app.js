'use strict';

/*
 * Defining the Package
 */
var Module = require('meanio').Module;

var EdpOctopus = new Module('edp-octopusdeploy');

/*
 * All MEAN packages require registration
 * Dependency injection is used to define required modules
 */
EdpOctopus.register(function(app, auth, database, dashcore) {

    //We enable routing. By default the Package Object is passed to the routes
    EdpOctopus.routes(app, auth, database);

    //We are adding a link to the main menu for all authenticated users
    EdpOctopus.menus.add({
        title: 'Octopus Deploy',
        link: 'edpOctopus admin',
        roles: ['admin'],
        menu: 'plugins'
    });

    EdpOctopus.aggregateAsset('css', 'edpOctopus.css');


    return EdpOctopus;
});
