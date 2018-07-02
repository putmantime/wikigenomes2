angular
    .module('genesKeyword')
    .component('genesKeyword', {
        controller: function ($location, $filter, allChlamOrgs, allChlamydiaGenes, searchBuilder) {
            'use strict';
            var ctrl = this;

            ctrl.$onInit = function () {
                ctrl.loading = true;
                ctrl.chlamGenes = {};
                ctrl.keyword = $location.path().split("/")[2];
                ctrl.orgData = [];
                allChlamOrgs.getAllOrgs(function (data) {
                    angular.forEach(data, function (value) {
                        value.check = true;
                        ctrl.orgData.push(value);
                    });
                });
                ctrl.getChlamGenes = allChlamydiaGenes.getAllChlamGenes().then(
                    function (data) {

                        ctrl.chlamGenes.allGenes = data.data.results.bindings;
                        ctrl.chlamGenes.keywordAll = $filter('keywordFilter')(ctrl.chlamGenes.allGenes, ctrl.keyword);
                        ctrl.chlamGenes.currentKW = ctrl.chlamGenes.keywordAll;
                        
                        console.log(ctrl.chlamGenes.currentKW);
                    }).finally(function () {
                        ctrl.loading = false;
                    });
            };
            
            ctrl.facetOrganism = function (organism) {
                ctrl.currentOrgsList = [];
                angular.forEach(ctrl.orgData, function (value) {
                    if (value.check == true) {
                        ctrl.currentOrgsList.push(value.taxid);
                    }
                });
                ctrl.chlamGenes.currentKW = $filter('deleteJsonItemValuesList')('taxid', ctrl.currentOrgsList, ctrl.chlamGenes.keywordAll);
            };
        },
        templateUrl: '/static/wiki/js/angular_templates/genes-keyword-browser.html'
    }).factory('searchBuilder', function () {
    	
    	var buildQuery = function(binary_data, value_data) {
    		
    	};

        return {
            buildQuery: buildQuery
        };


    });
