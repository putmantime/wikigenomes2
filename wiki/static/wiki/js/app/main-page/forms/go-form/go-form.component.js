angular
    .module('goForm')
    .component('goForm', {
        controller: function ($routeParams, $filter, $location, evidenceCodes, sendToView, pubMedData, allGoTerms, locusTag2QID, entrez2QID, orthoDataByLocusTag, orthoDataByEntrez, appData, taxidFilter) {
            var ctrl = this;
            
            ctrl.currentTaxid = $routeParams.taxid;
            ctrl.currentLocusTag = $routeParams.locusTag;
            ctrl.pageCount = 0;

            taxidFilter.map().then(function(data) {
                ctrl.tax2Name = data;
            });
            	
            var goClassMap = {
                    'mf_button': {
                        name: 'Molecular Function',
                        QID: 'Q14860489'
                    },
                    'cc_button': {
                        name: 'Cellular Component',
                        QID: 'Q5058355'
                    },
                    'bp_button': {
                        name: 'Biological Process',
                        QID: 'Q2996394'
                    }
            };
            
            ctrl.goFormModel = {
                    evi: null,
                    pub: null,
                    go: null,
                    proteinQID: null,
                    goClass: goClassMap[ctrl.goclass].QID
            };
            
            // data collection for form query sets
            evidenceCodes.getevidenceCodes(function (data) {
                ctrl.evidence = data;
            });

            ctrl.data = {};
            ctrl.projection = {};
            appData.getAppData(function (data) {

                ctrl.appData = data;

                var factory = orthoDataByLocusTag;

                if (data.primary_identifier == "entrez") {
                    factory = orthoDataByEntrez;
                }
                factory.getOrthologs(ctrl.currentLocusTag).then(function (response) {

                    // now add results from sparql query
                    angular.forEach(response.results.bindings, function(obj) {
                        var tax = obj.orthoTaxid.value;
                        var tag;
                        if (data.primary_identifier == "entrez") {
                            tag = obj.entrez.value;
                        } else {
                            tag = obj.orthoLocusTag.value;
                        }
                        ctrl.projection[tax] = tag == ctrl.currentLocusTag;
                        ctrl.data[tax] = tag;
                    });

                });
            });

            // controls for navigating form
            ctrl.nextClick = function () {
                ctrl.pageCount += 1;
            };
            ctrl.backClick = function () {
                ctrl.pageCount -= 1;
            };
            
            ctrl.selectGoTerm = function ($item, $model, $label) {
                ctrl.goFormModel.go = $item;
                ctrl.goValue = '';
            };

            ctrl.selectPub = function ($item, $model, $label) {
                ctrl.goFormModel.pub = $item;
                ctrl.pubValue = '';
            };
            
            ctrl.getGoTermsAll = function (val) {
                ctrl.goTermLoading = true;
                return allGoTerms.getGoTermsAll(val, goClassMap[ctrl.goclass].QID).then(
                    function (data) {
                        return data.data.results.bindings.map(function (item) {
                            return item;
                        });
                    }).finally(function(){
                        ctrl.goTermLoading = false;
                    }
                );
            };
            ctrl.getPMID = function (val) {
                return pubMedData.getPMID(val).then(
                    function (data) {

                        var resultData = [data.data.result[val]];
                        return resultData.map(function (item) {
                            return item;
                        });
                    }
                );
            };
            
            ctrl.resetForm = function () {
                ctrl.pageCount = 0;
                ctrl.goFormModel.evi = null;
                ctrl.goFormModel.pub = null;
                ctrl.goFormModel.go = null;
            };
            
            // form validation, must be true to allow submission
            ctrl.validateFields = function () {
                if (ctrl.goFormModel.evi && ctrl.goFormModel.pub && ctrl.goFormModel.go) {
                    return true;
                }
            };

            // send form data to server to edit wikidata
            ctrl.sendData = function () {
                ctrl.loading = true;
                
                var index = 0;
                var success = true;
                var authorize = false;
                
                var atleastone = false;
                angular.forEach(ctrl.projection, function(value) {
                	if (value == true) {
                		atleastone = true;
                	}
                });
                
                if (!atleastone) {
                	alert('Please select at least one gene to annotate!');
                	ctrl.loading = false;
                    return;
                }

                angular.forEach(ctrl.projection, function(value, key) {

                    var factory = locusTag2QID;

                    if (ctrl.appData.primary_identifier == "entrez") {
                        factory = entrez2QID;
                    }

                	if (value) {

                        factory.getQID(ctrl.data[key], key).then(function (data) {
                        	
                            var formData = {
                                    evi: ctrl.goFormModel.evi,
                                    pub: ctrl.goFormModel.pub,
                                    go: ctrl.goFormModel.go,
                                    proteinQID: null,
                                    goClass: ctrl.goFormModel.goClass
                            };

                            if (data.data.results.bindings[0].protein) {
                                formData.proteinQID = $filter('parseQID')(data.data.results.bindings[0].protein.value);
                            } 
                            
                            var url_suf = '/organism/' + key + '/gene/' + ctrl.data[key] +  '/wd_go_edit';
                            
                            console.log(url_suf);
                            sendToView.sendToView(url_suf, formData).then(function (data) {
                                if (data.data.authentication === false){
                                    authorize = true;
                                    success = false;
                                }
                                else if (!data.data.write_success){
                                    success = false;
                                }
                            }).finally(function () {
                            	index++;
                            	
                            	if (index == Object.keys(ctrl.projection).length) {
                            		if (success) {
                            			alert("Successfully Annotated! Well Done! The annotation will appear here in a few minutes.");
                            			ctrl.resetForm();
                            		} else if (authorize) {
                            			console.log("FAILURE: AUTHENTICATION");
                                        alert('Please authorize ChlamBase to edit Wikidata on your behalf!');
                            		} else {
                            			alert("Something went wrong.  Give it another shot!");
                            		}
                            		
                            		ctrl.loading = false;
                            	}
                            });

                        });
                	} else {
                		index++;
                		
                    	if (index == Object.keys(ctrl.projection).length) {
                    		if (success) {
                    			alert("Successfully Annotated! Well Done! The annotation will appear here in a few minutes.");
                    			ctrl.resetForm();
                    		} else if (authorize) {
                    			console.log("FAILURE: AUTHENTICATION");
                                alert('Please authorize ChlamBase to edit Wikidata on your behalf!');
                    		} else {
                    			alert("Something went wrong.  Give it another shot!");
                    		}
                    		
                    		ctrl.loading = false;
                    	}
                	}
                });
                
            };
            
        },
        templateUrl: '/static/build/js/angular_templates/guided-go-form.min.html',
        bindings: {
            goclass: '<',
            gene: '<'
        }

    });




