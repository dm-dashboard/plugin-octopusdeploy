'use strict';

angular.module('mean.edp-octopusdeploy').config(['$stateProvider',
    function($stateProvider) {
        $stateProvider.state('edpOctopus admin', {
            url: '/edpOctopus/admin',
            templateUrl: 'edp-octopusdeploy/views/admin.html'
        });

    }
]);
