(function(){
    'use strict';

    angular.module('mean.edp-octopusdeploy')
        .directive('octopusLastRelease', function(messageService, $timeout, $window){
            var link = function($scope, element, attrs){

                /*Status*/
                function resizeText(){
                    $timeout(function() {

                        var latestReleaseHeight = angular.element('.octo-release-date').height();
                        if (!latestReleaseHeight){
                            setTimeout(resizeText,100);
                            return;
                        }
                        var projectName = latestReleaseHeight * 0.8;
                        $scope.releaseFontSize = projectName;

                    },100);
                }


                messageService.registerPlugin('octopus-lastrelease', function(data){
                    handleReleases(data.releases);
                    $timeout(resizeText,1000);
                });

                $scope.$watch('releases', function(newValue, oldValue){
                    if ($scope.releases && !oldValue){
                        messageService.ready('octopus-lastrelease');
                        resizeText();
                    }
                });

                function handleReleases(releaseData){
                    $scope.projectHeight = 100.0 / releaseData.length;
                    angular.forEach(releaseData, function(release){
                       release.label = release.project + ' released to ' + release.environment;
                    });
                    $scope.releases = releaseData;
                }

                /********************************/

                $scope.hoursAgo = function(dateString){
                    var now = window.moment();
                    var release = window.moment(dateString);
                    var hours = now.diff(release, 'hour');
                    if (hours > 24){
                        return now.diff(release, 'day') + ' days ago';    
                    } 
                    return hours + ' hours ago';
                };

                angular.element($window).bind('resize', function(){
                    resizeText();
                });
            };

            return {
                restrict : 'A',
                link : link,
                templateUrl : '/edp-octopusdeploy/views/octopus-lastrelease.html'
            };
        });
})();
