angular
    .module('mainPage')
    .component('mainPage', {
        controller: function ($filter,
                              $routeParams,
                              $location,
                              allChlamOrgs,
                              wdGetEntities,
                              entrez2QID,
                              orthoData,
                              GOTerms,
                              InterPro,
                              OperonData,
                              expasyData,
                              mutantData,
                              locusTag2Pub,
                              locusTag2QID,
                              abstractSPARQL) {

            // Main gene page component. Loaded when a gene is selected.  Parses the url for taxid and locus tag and uses
            // those to make API calls to wikidata.
            var ctrl = this;
            ctrl.$onInit = function () {
                //parse url for taxid and locus tag
                ctrl.currentTaxid = $routeParams.taxid;
                ctrl.currentLocusTag = $routeParams.locusTag;


                ctrl.currentGene = {};
                ctrl.annotations = {};

                // retrieve wikidata gene item qid with SPARQL query to make API call to wikidata
                locusTag2QID.getLocusTag2QID(ctrl.currentLocusTag, ctrl.currentTaxid).then(function (data) {
                    var gene_json = data.data.results.bindings;
                    if (gene_json.length > 0) {
                        ctrl.currentGene.geneQID = $filter('parseQID')(gene_json[0].gene.value);
                        // API call to retrieve gene document from Wikidata
                        wdGetEntities.wdGetEntities(ctrl.currentGene.geneQID).then(function (data) {
                            var entity = data.entities[ctrl.currentGene.geneQID];
                            ctrl.currentGene.entrez = entity.claims.P351[0].mainsnak.datavalue.value;
                            ctrl.currentGene.geneLabel = entity.labels.en.value;
                            ctrl.currentGene.locusTag = entity.claims.P2393[0].mainsnak.datavalue.value;
                            ctrl.currentGene.geneDescription = entity.descriptions.en.value;
                            ctrl.currentGene.genStart = entity.claims.P644[0].mainsnak.datavalue.value;
                            ctrl.currentGene.genEnd = entity.claims.P645[0].mainsnak.datavalue.value;
                            ctrl.currentGene.strand = entity.claims.P2548[0].mainsnak.datavalue.value;
                            ctrl.currentGene.refseqGenome = entity.claims.P644[0].qualifiers.P2249[0].datavalue.value;
                            ctrl.currentGene.geneType = entity.claims.P279[0].mainsnak.datavalue.value;
                            ctrl.currentGene.geneAliases = [];
                            angular.forEach(entity.aliases.en, function (alias) {
                                if (alias.value != ctrl.currentGene.locusTag) {
                                    ctrl.currentGene.geneAliases.push(alias.value);
                                }
                            });

                            // Get operon data from wikidata sparql query
                            OperonData.getOperonData(ctrl.currentGene.entrez).then(
                                function (data) {
                                    var dataResults = data.data.results.bindings;
                                    if (dataResults.length > 0) {
                                        console.log(dataResults);
                                        ctrl.annotations.currentOperon = dataResults[0].operonItemLabel.value;
                                        console.log(ctrl.annotations.currentOperon);
                                        ctrl.opData = dataResults;
                                        ctrl.annotations.operons = dataResults;
                                    } else {
                                        ctrl.opData = [];
                                        ctrl.annotations.operons = [];
                                    }
                                });

                            // Get ortholog data from local json file
                            orthoData.getOrthologs(function (data) {
                                ctrl.orthologs = data;
                                var current = $filter('keywordFilter')(data, ctrl.currentLocusTag);
                                ctrl.currentOrtholog = {};
                                angular.forEach(current[0], function (value, key) {
                                    if (key != '_id' && key != '$oid' && key != 'timestamp') {
                                        ctrl.currentOrtholog[key] = value
                                    }
                                });
                                ctrl.annotations.orthologs = ctrl.currentOrtholog;
                            });

                            // Get ortholog data from local json file
                            mutantData.getKokesMutants(function (data) {
                                var mutants = [];
                                ctrl.mutantData = [];
                                mutants.push($filter('getJsonItemNoWD')('locus_tag_L2', ctrl.currentGene.locusTag, data));
                                if (ctrl.currentGene.locusTag) {
                                    mutants.push($filter('getJsonItemNoWD')('locus_tag_DUW3', ctrl.currentGene.locusTag, data));
                                    angular.forEach(mutants, function (value) {
                                        angular.forEach(value, function (val2) {
                                            ctrl.mutantData.push(val2);
                                        });
                                    });
                                }
                                ctrl.annotations.mutants = ctrl.mutantData;
                            });

                            // Get related publications from eutils
                            var locus_tag = ctrl.currentGene.locusTag.replace('_', '');
                            locusTag2Pub.getlocusTag2Pub(locus_tag).then(function (data) {
                                ctrl.annotations.pubList = data.data.resultList.result;
                            });

                        });

                        // SPARQL to return protein qid
                        ctrl.currentGene.proteinQID = $filter('parseQID')(gene_json[0].protein.value);


                        // API call to return protein document from Wikidata
                        wdGetEntities.wdGetEntities(ctrl.currentGene.proteinQID).then(function (data) {
                            var entity = data.entities[ctrl.currentGene.proteinQID];
                            ctrl.currentGene.proteinLabel = entity.labels.en.value;
                            ctrl.currentGene.description = entity.descriptions.en.value;
                            ctrl.currentGene.uniprot = entity.claims.P352[0].mainsnak.datavalue.value;
                            ctrl.currentGene.refseqProt = entity.claims.P637[0].mainsnak.datavalue.value;
                            ctrl.currentGene.productType = entity.claims.P279[0].mainsnak.datavalue.value;
                            ctrl.currentGene.proteinAliases = [];
                            angular.forEach(entity.aliases.en, function (alias) {
                                ctrl.currentGene.proteinAliases.push(alias.value);
                            });

                            //abstractSPARQL.getAbstractSPARQL(ctrl.currentGene.proteinQID, 'P527', 'P2926').then(function (data) {
                            //    console.log('interproAbstract', data.data.results.bindings);
                            //    var ipData = data.data.results.bindings;
                            //    ctrl.ipConfig = {
                            //        title: 'InterPro Domains',
                            //        fields: {
                            //            'InterPro Domain': ipData.objLabel.value,
                            //            'InterPro ID': ipData.obj_id.value,
                            //            'Reference': {
                            //                Source: ipData.stated_inLabel.value
                            //            }
                            //        }
                            //    };
                            //
                            //});
                            //
                            //abstractSPARQL.getAbstractSPARQL(ctrl.currentGene.proteinQID, 'P680', 'P686').then(function (data) {
                            //    console.log('goAbstract', data.data.results.bindings);
                            //
                            //});

                            // Get InterPro Domains from Wikidata SPARQL
                            InterPro.getInterPro(ctrl.currentGene.uniprot).then(
                                function (data) {
                                    ctrl.ipData = data;
                                    ctrl.annotations.interpro = data;
                                });

                            // Get GO Terms  from Wikidata SPARQL
                            GOTerms.getGoTerms(ctrl.currentGene.uniprot).then(
                                function (data) {
                                    ctrl.annotations.go = {
                                        cellcomp: [],
                                        bioproc: [],
                                        molfunc: []
                                    };
                                    ctrl.annotations.reaction = {};
                                    ctrl.mf = 'mf_button';
                                    ctrl.bp = 'bp_button';
                                    ctrl.cc = 'cc_button';

                                    var dataResults = data.data.results.bindings;
                                    ctrl.annotations.ecnumber = [];

                                    // gather ec numbers from go terms
                                    angular.forEach(dataResults, function (value, key) {
                                        if (value.hasOwnProperty('ecnumber')) {
                                            ctrl.annotations.ecnumber.push(value.ecnumber.value);
                                            angular.forEach(ctrl.annotations.ecnumber, function (value) {
                                                if (value.indexOf('-') > -1) {
                                                    var multiReactions = "view reactions hierarchy at: http://enzyme.expasy.org/EC/" + value;
                                                    ctrl.annotations.reaction[value] = [multiReactions];
                                                } else {
                                                    expasyData.getReactionData(value).then(function (data) {
                                                        ctrl.annotations.reaction[data.ecnumber] = data.reaction;
                                                    });
                                                }
                                            });
                                        }
                                        if (value.goclass.value === 'http://www.wikidata.org/entity/Q5058355') {
                                            ctrl.annotations.go.cellcomp.push(value);

                                        }
                                        if (value.goclass.value === 'http://www.wikidata.org/entity/Q14860489') {
                                            ctrl.annotations.go.molfunc.push(value);

                                        }
                                        if (value.goclass.value === 'http://www.wikidata.org/entity/Q2996394') {
                                            ctrl.annotations.go.bioproc.push(value);
                                        }

                                    });
                                });

                        });

                        allChlamOrgs.getAllOrgs(function (data) {
                            ctrl.orgList = data;
                            ctrl.currentOrg = $filter('getJsonItemOrg')('taxid', ctrl.currentTaxid, ctrl.orgList);
                            console.log(ctrl.currentOrg);
                            if (ctrl.currentOrg == undefined) {
                                alert("not a valid taxonomy id");
                                $location.path('/');
                            }
                        });

                    }
                    else {
                        alert(ctrl.currentLocusTag + " doesn't seem to be a gene in this genome.");
                        $location.path('/organism/' + ctrl.currentTaxid);
                    }
                });

            };
        },
        templateUrl: '/static/wiki/js/angular_templates/main-page_new.html'
    });


