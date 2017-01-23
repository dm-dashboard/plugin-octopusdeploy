'use strict';

angular.module('mean.edp-octopus').controller('EdpOctopusController', ['$scope', 'Global', 'EdpOctopus',
    function($scope, Global, EdpOctopus) {
        $scope.global = Global;
        $scope.package = {
            name: 'edp-octopus'
        };
    }
]);
