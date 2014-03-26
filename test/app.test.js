var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures = require('./fixtures');
var _ = require('lodash');

var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;


describe("app", function() {

    describe("GoDiApp", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new di.app.GoDiApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
            .setup.char_limit(180);

            app.get_date = function() {
                var d = new Date();
                d.setHours(0,0,0,0);
                return d;
            };

            tester
                .setup(function(api) {
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);
                })
                .setup.config.app({
                    name: 'test_app',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    ushahidi_map: 'https://godi.crowdmap.com/api'
                })
                .setup(function(api) {
                    // Add all of the fixtures.
                    fixtures().forEach(api.http.fixtures.add);
                })
                .setup(function(api) {
                    api.contacts.add( {
                        msisdn: '+273123',
                        extra : {
                            is_registered: 'true',
                            vip_unanswered: '[1,2,3,4,5,6,7,8,9,10,11,12]',
                            register_sms_sent: 'true'
                        }
                    });
                });
        });
        
        describe("when a session is terminated", function() {
            describe("when they are registered",function() {
                describe("when they have not inputted their location",function() {
                    describe("when they have already been sent a registration sms",function() {
                        it("should not sent them an sms",function() {
                            tester
                                .setup.user.addr('+273123')
                                .setup(function(api) {
                                    api.contacts.add( {
                                        msisdn: '+273123',
                                        extra : {
                                            is_registered: 'true',
                                            register_sms_sent: 'true'
                                        }
                                    });
                                })
                                .setup.user.state('states:register')
                                .input('1')
                                .input.session_event('close')
                                .check(function(api) {
                                    var smses = _.where(api.outbound.store, {
                                        endpoint: 'sms'
                                    });
                                    assert.equal(smses.length,0);
                                }).run();
                        });
                     });

                    describe("when they have not been sent a registration sms",function() {
                        it ("should send them an sms asking them to input their location next time",function() {
                            tester
                                .setup.user.addr('+273123')
                                .setup.user.state('states:register')
                                .input('1')
                                .input.session_event('close')
                                .check(function(api) {
                                    var smses = _.where(api.outbound.store, {
                                        endpoint: 'sms'
                                    });

                                    var sms = smses[0];
                                    assert.equal(smses.length,1);
                                    assert.equal(sms.content, [
                                        "Hello VIP!2 begin we need ur voting ward.",
                                        "Dial *55555# & give us ur home address & we'll work it out.",
                                        "This will be kept private, only ur voting ward will be stored &u will be anonymous."
                                    ].join(' '));
                                    assert.equal(sms.to_addr,'+273123');
                                }).run();
                        });
                    });

                });

                describe("when they have inputted their location",function() {
                    describe("when they have already been sent a registration sms",function() {
                        it ("should not sent them an sms",function() {
                            tester
                                .setup.user.addr('+273123')
                                .setup(function(api) {
                                    api.contacts.add( {
                                        msisdn: '+273123',
                                        extra : {
                                            is_registered: 'true',
                                            register_sms_sent: 'true'
                                        }
                                    });
                                })
                                .setup.user.state('states:register')
                                .input('1')
                                .input.session_event('close')
                                .check(function(api) {
                                    var smses = _.where(api.outbound.store, {
                                        endpoint: 'sms'
                                    });
                                    assert.equal(smses.length,0);
                                }).run();
                        });
                    });
                   describe("when they have already been sent a registration sms",function() {
                       it("should send them an sms thanking them for their registration",function() {
                           tester
                               .setup.user.addr('+273000')
                               .setup.user.state('states:register')
                               .input('1')
                               .input.session_event('close')
                               .check(function(api) {
                                   var smses = _.where(api.outbound.store, {
                                       endpoint: 'sms'
                                   });

                                   var sms = smses[0];
                                   assert.equal(smses.length,1);
                                   assert.equal(sms.content,[
                                       'Thanks for volunteering to be a citizen reporter for the 2014 elections!',
                                       'Get started by answering questions or reporting election activity!',
                                       'Dial back in to *5555# to begin!'
                                   ].join(' '));
                                   assert.equal(sms.to_addr,'+273000');
                               }).run();
                       });
                   });
                });
            });
        });

        describe("when the user starts a session",function() {
            it("should fire a 'visits' metric",function() {
               return tester
                   .start()
                   .check(function(api) {
                       var metrics = api.metrics.stores.test_app;
                       assert.deepEqual(metrics['sum.visits'].values, [1]);
                       assert.deepEqual(metrics['avg.visits'].values, [1]);
                   }).run();
            });

            it("should fire a 'visits' metric",function() {
                return tester
                    .start()
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.deepEqual(metrics['sum.visits'].values, [1]);
                        assert.deepEqual(metrics['avg.visits'].values, [1]);
                    }).run();
            });

            it("should fire a 'unique.participants' metric",function() {
               return tester
                   .setup.user.addr('+273123')
                   .setup(function(api) {
                       api.messagestore.inbound_uniques = 42;
                   })
                   .start()
                   .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                       assert.deepEqual(metrics['unique.participants'].values,[42]);
                   }).run();
            });

            describe('if they are registered',function() {
                describe('if they have not filled in their address before',function() {
                    it("should tell take them to fill in address",function() {
                        return tester
                            .setup.user.addr('+273123')
                            .setup(function(api) {
                                api.contacts.add( {
                                    msisdn: '+273123',
                                    extra : {
                                        is_registered: 'true'
                                    }
                                });
                            }).start()
                            .check.interaction({
                                states:'states:address',
                                reply: "Thanks 4 joining!2 begin we need ur voting ward. " +
                                        "Reply with ur home address & we'll work it out. " +
                                        "This will be kept private, only ur voting ward will be stored " +
                                        "&u will be anonymous."
                            })
                            .run();
                    });
                });

                describe('if they have filled in their address before',function() {
                    it("should take them to the main menu",function() {
                        return tester
                            .setup.user.addr('+273456')
                            .setup(function(api) {
                                api.contacts.add( {
                                    msisdn: '+273456',
                                    extra : {
                                        is_registered: 'true',
                                        ward: '1234',
                                        vip_unanswered: '[1,2,3,4,5,6,7,8,9,10,11,12]'
                                    }
                                });
                            }).start()
                            .check.interaction({
                                state: 'states:menu',
                                reply: [
                                    'Welcome to the Campaign',
                                    '1. Take the quiz & win!',
                                    '2. Report an Election Activity',
                                    '3. View the results...',
                                    '4. About',
                                    '5. End'
                                ].join('\n')
                            }).run();
                    });
                });
            });

            describe("if they are not registered",function() {
               it ("should take them to the language page",function() {
                   return tester.setup.user.addr('+273321')
                       .setup(function(api) {
                          api.contacts.add( {
                              msisdn: '+273321',
                              extra : {
                                  is_registered: 'false'
                              }
                          });
                       })
                       .start()
                       .check.interaction({
                           state: 'states:register',
                           reply: ['Welcome to Voting is Power! Start by choosing your language:',
                               '1. English',
                               '2. Afrikaans',
                               '3. Zulu',
                               '4. Xhosa',
                               '5. Sotho'
                           ].join('\n')
                       })
                       .run();
               });
            });
        });

        describe("when the user is not registered", function() {
            it("should ask them to choose a language ", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:register',
                        reply: ['Welcome to Voting is Power! Start by choosing your language:',
                                '1. English',
                                '2. Afrikaans',
                                '3. Zulu',
                                '4. Xhosa',
                                '5. Sotho'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the user has submitted their language as english", function() {
            it("should set the user's language to english",function() {
                return tester
                    .setup.user.state('states:register')
                    .input('1')
                    .check.user.properties({lang: 'en'})
                    .run();
            });

            it("should show them the engagement question in in english",function() {
                return tester
                    .setup.user.state('states:register')
                    .input('1')
                    .check.interaction({
                        state:'states:registration:engagement',
                        reply:[
                            "It's election time! Do u think ur vote matters?",
                            "1. YES every vote matters",
                            "2. NO but I'll vote anyway",
                            "3. NO so I'm NOT voting",
                            "4. I'm NOT REGISTERED to vote",
                            "5. I'm TOO YOUNG to vote"].join("\n")
                    }).run();
            });
        });

        describe("when the user selects 'Yes' for the engagement question",function() {
           it("should take them to the terms and conditions menu",function() {
                return tester
                    .setup.user.state('states:registration:engagement')
                    .input('1')
                   .check.interaction({
                        state:'states:registration:tandc',
                        reply: ['Please accept the terms and conditions to get started.',
                            '1. Accept & Join',
                            '2. Read t&c',
                            '3. Quit'].join('\n')
                   }).run();
           });

            it("should save their answer as 'yes'",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:registration:engagement')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.engagement_question,"yes");
                    }).run();
            });

            it("should save their interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:registration:engagement')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.it_engagement_question,app.get_date_string());
                    }).run();
            });
        });

        describe("when the user selects 'NO but I’ll vote anyway' for the engagement question",function() {

            it("should take them to the terms and conditions menu",function() {
                return tester
                    .setup.user.state('states:registration:engagement')
                    .input('2')
                    .check.interaction({
                        state:'states:registration:tandc',
                        reply: ['Please accept the terms and conditions to get started.',
                            '1. Accept & Join',
                            '2. Read t&c',
                            '3. Quit'].join('\n')
                    }).run();
            });

           it("should save their answer as 'no_vote_anyway'",function() {
               return tester
                   .setup.user.addr("+273123")
                   .setup.user.state('states:registration:engagement')
                   .input('2')
                   .check(function(api){
                       var contact = api.contacts.store[0];
                       assert.equal(contact.extra.engagement_question,"no_vote_anyway");
                   }).run();
           }) ;
        });

        describe("when the user selects accept and join",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup(function(api) {
                        api.kv.store['registered.participants'] = 3;
                    })
                    .setup.user.state('states:registration:tandc')
                    .input('1');
            });
            it("should register the user using contacts",function() {
                return tester
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.is_registered,"true");
                        assert.equal(contact.extra.vip_unanswered,"[1,2,3,4,5,6,7,8,9,10,11,12]");
                    }).run();
            });

            it("should fire a 'registered.participants' metric",function() {
                return tester
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.deepEqual(metrics['registered.participants'].values, [4]);
                    }).run();
            });

            it("should increment 'registered.participants' kv store",function() {
                return tester
                    .check(function(api) {
                        assert.equal(api.kv.store['registered.participants'], 4);
                    }).run();
            });

            it("should take the user to the ward address state", function() {
                return tester
                    .check.interaction({
                        state:'states:address',
                        reply: "Thanks 4 joining!2 begin we need ur voting ward. " +
                            "Reply with ur home address & we'll work it out. " +
                            "This will be kept private, only ur voting ward will be " +
                            "stored &u will be anonymous."
                    }).run();
            });
        });

        describe("when the user chooses to read the terms and conditions",function() {
            it("should set user registration to false.",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:registration:tandc')
                    .input('2')
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.is_registered,"false");
                    }).run();

            });
        });

        describe("when the user selects choose to quit",function() {
            it("should set user registration to false.",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:registration:tandc')
                    .input('3')
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.is_registered,"false");
                    }).run();

            });

            it("should take the user to a thank you , please reconsider message", function() {
                return tester.setup.user.state('states:registration:tandc')
                    .input('3')
                    .check.interaction({
                        state:'states:start',
                        reply: 'Thank you for your time. Remember, you can always reconsider becoming a citizen reporter.'
                    }).run();
            });
        });

        describe("when a user has inputted their address",function() {

            it("should get a list of appropriate electoral wards",function() {
                return tester
                    .setup.user.state('states:address')
                    .input('21 conduit street')
                    .check(function(api){
                        var req = api.http.requests[0];
                        var url = req.url;
                        assert.equal(url,'http://wards.code4sa.org/');
                        assert.equal(req.params.address ,'21 conduit street');
                    }).run();
            });

            it("should return the list of appropriate electoral wards to the user",function() {
                return tester
                    .setup.user.state('states:address')
                    .input('21 conduit street')
                    .check.interaction({
                        state: "states:address:verify",
                        reply: [
                            'Please select your location from the options below:',
                            '1. 21 Conduit Street, Randburg 2188',
                            '2. 21 Conduit Street, Sandton 2191',
                            '3. 21 Conduit Street, Randburg 2194'
                        ].join("\n")
                    })
                    .run();

            });

            describe("when the list of appropriate electoral wards is too long to fit on one page",function() {
                it("should display the first page of choices with next buttons",function(){
                    return tester
                        .setup.user.state('states:address')
                        .input('main street')
                        .check.interaction({
                            state: "states:address:verify",
                            reply: [
                                'Please select your location from the options below:',
                                '1. Main Street, Paarl',
                                "2. Main Street, Lambert's Bay 8130",
                                '3. Main Street, Glencoe',
                                "4. More"
                            ].join("\n")
                        })
                        .run();
                });
            });
        describe("when the user has selected to view the second page of electoral options",function() {
                beforeEach(function() {
                    tester.setup.user.state({
                        name: 'states:address:verify',
                        metadata: {page_start: 0},
                        creator_opts: {
                            address_options:  [{
                                    "address": "Main Street, Paarl, South Africa",
                                    "ward": "10203019"
                                }, {
                                    "address": "Main Street, Lambert's Bay 8130, South Africa",
                                    "ward": "10102005"
                                }, {
                                    "address": "Main Street, Glencoe, South Africa",
                                    "ward": "52401001"
                                },{
                                    "address": "Main Street, Howick, South Africa",
                                    "ward": "52202009"
                                },{
                                    "address": "Main Street, Despatch 6220, South Africa",
                                    "ward": "29500060"
                                },{
                                    "address": "Main Street, Matatiele 4730, South Africa",
                                    "ward": "24401019"
                                },{
                                    "address": "Main Street, Emalahleni, South Africa",
                                    "ward": "83102017"
                                },{
                                    "address": "Main Street, Darling 7345, South Africa",
                                    "ward": "10105004"
                                }]
                        }
                    });
                });

                it("should display the 2nd page of choices",function(){
                    return tester
                        .setup.user.addr('+273123')
                        .input("4")
                        .check.interaction({
                            state: "states:address:verify",
                            reply: [
                                'Please select your location from the options below:',
                                '1. Main Street, Howick',
                                "2. Main Street, Despatch 6220",
                                '3. Main Street, Matatiele 4730',
                                "4. More",
                                "5. Back"
                            ].join("\n")
                        })
                        .run();
                });
            });

        describe("when the user is on the 2nd page and selects 'back",function() {
            beforeEach(function() {
                tester.setup.user.state({
                    name: 'states:address:verify',
                    metadata: {page_start: 3},
                    creator_opts: {
                        address_options:  [{
                            "address": "Main Street, Paarl, South Africa",
                            "ward": "10203019"
                        }, {
                            "address": "Main Street, Lambert's Bay 8130, South Africa",
                            "ward": "10102005"
                        }, {
                            "address": "Main Street, Glencoe, South Africa",
                            "ward": "52401001"
                        },{
                            "address": "Main Street, Howick, South Africa",
                            "ward": "52202009"
                        },{
                            "address": "Main Street, Despatch 6220, South Africa",
                            "ward": "29500060"
                        },{
                            "address": "Main Street, Matatiele 4730, South Africa",
                            "ward": "24401019"
                        },{
                            "address": "Main Street, Emalahleni, South Africa",
                            "ward": "83102017"
                        },{
                            "address": "Main Street, Darling 7345, South Africa",
                            "ward": "10105004"
                        }]
                    }
                });
            });

            it("should go to the first page",function(){
                return tester
                    .setup.user.addr('+273123')
                    .input("5")
                    .check.interaction({
                        state: "states:address:verify",
                        reply: [
                            'Please select your location from the options below:',
                            '1. Main Street, Paarl',
                            "2. Main Street, Lambert's Bay 8130",
                            '3. Main Street, Glencoe',
                            "4. More"
                        ].join("\n")
                    })
                    .run();
            });
        });
    });

        describe("when the user selects their address from the list provider",function(){
            it("should save their electoral ward",function() {
                return tester
                    .setup.user.addr('+273123')
                    .setup.user.state('states:address:verify',{
                        creator_opts: {
                            address_options: [{
                                "address": "21 Conduit Street, Randburg 2188, South Africa",
                                "ward": "79400094",
                                "voting_district": "32840591"
                            },{
                                "address": "21 Conduit Street, Sandton 2191, South Africa",
                                "ward": "79400104",
                                "voting_district": "32840489"
                            },{
                                "address": "21 Conduit Street, Randburg 2194, South Africa",
                                "ward": "79400094",
                                "voting_district": "32840445"
                            }]
                        }
                    })
                    .input("1")
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.ward,"79400094");
                        assert.equal(contact.extra.voting_district,"32840591");
                        assert.equal(contact.extra.it_ward,app.get_date_string());
                    }).run();
            });

            it("should take them to the menu page",function() {
                return tester
                    .setup.user.addr('+273123')
                    .setup.user.state('states:address:verify',{
                        creator_opts: {
                            address_options: [{
                                "address": "21 Conduit Street, Randburg 2188, South Africa",
                                "ward": "79400094",
                                "voting_district": "32840591"
                            },{
                                "address": "21 Conduit Street, Sandton 2191, South Africa",
                                "ward": "79400104",
                                "voting_district": "32840489"
                            },{
                                "address": "21 Conduit Street, Randburg 2194, South Africa",
                                "ward": "79400094",
                                "voting_district": "32840445"
                            }]
                        }
                    })
                    .input("1")
                    .check.interaction({
                        state: 'states:menu',
                        reply: [
                            'Welcome to the Campaign',
                            '1. Take the quiz & win!',
                            '2. Report an Election Activity',
                            '3. View the results...',
                            '4. About',
                            '5. End'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user inputs an address that cant be found",function() {
            it("should redirect them to the same address page, but show an error message",function() {
               return tester
                   .setup.user.addr('user_bad_input')
                   .setup.user.state('states:address')
                   .input('bad input')
                   .check.reply(
                       'Oops! Something went wrong! Please try again.'
                   )
                   .check.user.state('states:address')
                   .run();
            });
        });

        describe("when the user has selected 'quit' from the menu",function() {
            it ("should take them to the end state",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state("states:menu")
                    .input('5')
                    .check.interaction({
                        state: 'states:start',
                        reply: 'Bye.'
                    }).run();
            });
        });

        describe("when 1 is randomly chosen as the next question",function() {
            it("should take them to question 1",function(){
                app.get_unanswered_question = function() {
                    return 1;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:menu')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question1',
                        reply: [
                            'During the past year, have you attended a demonstration or protest?',
                            '1. Yes, many',
                            '2. Yes, a few',
                            '3. No',
                            '4. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the first question as 'Yes'", function() {
            it("should save their response the first question as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question1')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question1,"yes_many");
                        assert.equal(contact.extra.it_question1,app.get_date_string());
                    }).run();
            });
        });

        describe("when 2 is randomly chosen as the next question",function() {
            it("should take them to question 2",function(){
                app.get_unanswered_question = function() {
                    return 2;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question1')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question2',
                        reply: [
                            'Are you registered to vote in the upcoming elections?',
                            '1. Yes',
                            '2. No',
                            '3. Unsure',
                            '4. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the first question as 'Yes, a few'", function() {
            it("should should save their response the first question as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question1')
                    .input('2')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question1,"yes_few");
                        assert.equal(contact.extra.it_question1,app.get_date_string());
                    }).run();
            });
        });

        describe("when the user has answered the second question as Yes", function() {
            it("should save their response the 2nd question as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question2')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question2,"yes");
                        assert.equal(contact.extra.it_question2,app.get_date_string());
                    }).run();
            });

        });

        describe("when 3 is randomly chosen as the next question",function() {
            it("should take them to question 3",function(){
                app.get_unanswered_question = function() {
                    return 3;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question2')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question3',
                        reply: [
                            'How likely is it that you will vote in the upcoming election?',
                            '1. Very likely',
                            '2. Somewhat likely',
                            '3. Somewhat unlikely',
                            '4. Very unlikely',
                            '5. Unsure',
                            '6. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the 3rd question as 'Very Likely'", function() {
            it("should should save their response 'very_likely'  as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question3')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question3,"very_likely");
                        assert.equal(contact.extra.it_question3,app.get_date_string());
                    }).run();
            });

        });

        describe("when 4 is randomly chosen as the next question",function() {
            it("should take them to question 4",function(){
                app.get_unanswered_question = function() {
                    return 4;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question3')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question4',
                        reply: [
                            'Which political party do you feel close to?',
                            '1. ANC' ,
                            '2. Agang' ,
                            '3. COPE' ,
                            '4. DA' ,
                            '5. EFF' ,
                            '6. IFP' ,
                            '7. Other' ,
                            "8. I don't feel close to a party",
                            '9. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the 4th question as 'ANC'", function() {
            it("should should save their response 'anc' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question4')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question4,"anc");
                        assert.equal(contact.extra.it_question4,app.get_date_string());
                    }).run();
            });
        });

        describe("when the user has answered the continue question as 'Main Menu'", function() {
            it("should take them to the main menu",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:continue')
                    .input('2')
                    .check.interaction({
                        state: 'states:menu'
                    }).run();
            });
        });

        describe("when 5 is randomly chosen as the next question",function() {
            it("should take them to question 5",function(){
                app.get_unanswered_question = function() {
                    return 5;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:continue')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question5',
                        reply: [
                            "During the past year, has your community had demonstrations or protests?" ,
                            "1. Yes, several times" ,
                            "2. Yes, once or twice" ,
                            "3. No" ,
                            "4. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 5th question as 'Yes several times'", function() {
            it("should should save their response 'yes_several' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question5')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question5,"yes_several");
                        assert.equal(contact.extra.it_question5,app.get_date_string());
                    }).run();
            });
        });

        describe("when 6 is randomly chosen as the next question",function() {
            it("should take them to question 6",function(){
                app.get_unanswered_question = function() {
                    return 6;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question5')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question6',
                        reply: [
                            "If your community has had demonstrations or protests in the last year, were they violent?",
                            "1. Yes",
                            "2. No",
                            "3. Not applicable",
                            "4. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 6th question as 'Yes'", function() {
            it("should should save their response 'yes' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question6')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question6,"yes");
                        assert.equal(contact.extra.it_question6,app.get_date_string());
                    }).run();
            });
        });

        describe("when 7 is randomly chosen as the next question",function() {
            it("should take them to question 7",function(){
                app.get_unanswered_question = function() {
                    return 7;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question6')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question7',
                        reply: [
                            "How easy is it for your neighbors to find out if you voted?" ,
                            "1. Very easy" ,
                            "2. Somewhat easy" ,
                            "3. Somewhat difficult" ,
                            "4. Very difficult" ,
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 7th question as 'Very easy'", function() {
            it("should should save their response 'very_easy' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question7')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question7,"very_easy");
                        assert.equal(contact.extra.it_question7,app.get_date_string());
                    }).run();
            });
        });

        describe("when 8 is randomly chosen as the next question",function() {
            it("should take them to question 8",function(){
                app.get_unanswered_question = function() {
                    return 8;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question7')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question8',
                        reply: [
                            "People in my neighborhood look down on those who do not vote:" ,
                            "1. Strongly agree" ,
                            "2. Somewhat agree" ,
                            "3. Somewhat disagree" ,
                            "4. Strongly disagree" ,
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 8th question as 'Strongly agree'", function() {
            it("should should save their response 'strongly_agree' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question8')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question8,"strongly_agree");
                        assert.equal(contact.extra.it_question8,app.get_date_string());
                    }).run();
            });
        });

        describe("when 9 is randomly chosen as the next question",function() {
            it("should take them to question 9",function(){
                app.get_unanswered_question = function() {
                    return 9;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question8')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question9',
                        reply: [
                            "How do you rate the overall performance of President Zuma?" ,
                            "1. Excellent" ,
                            "2. Good" ,
                            "3. Just Fair" ,
                            "4. Poor" ,
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 9th question as 'Excellent'", function() {
            it("should should save their response 'excellent' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question9')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question9,"excellent");
                        assert.equal(contact.extra.it_question9,app.get_date_string());
                    }).run();
            });
        });

        describe("when 10 is randomly chosen as the next question",function() {
            it("should take them to question 10",function(){
                app.get_unanswered_question = function() {
                    return 10;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question9')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question10',
                        reply: [
                            "How do you rate the overall performance of your local government councillor?" ,
                            "1. Excellent" ,
                            "2. Good" ,
                            "3. Just Fair" ,
                            "4. Poor" ,
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 10th question as 'Good'", function() {
            it("should should save their response 'good' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question10')
                    .input('2')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question10,"good");
                        assert.equal(contact.extra.it_question10,app.get_date_string());
                    }).run();
            });
        });

        describe("when 11 is randomly chosen as the next question",function() {
            it("should take them to question 11",function(){
                app.get_unanswered_question = function() {
                    return 11;
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question10')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question11',
                        reply: [
                            "Which party has contacted you the most during this election campaign?" ,
                            "1. None, I have not been contacted" ,
                            "2. ANC" ,
                            "3. Agang" ,
                            "4. COPE" ,
                            "5. DA" ,
                            "6. EFF" ,
                            "7. IFP" ,
                            "8. Other" ,
                            "9. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 11th question as 'ANC'", function() {
            it("should should save their response 'anc' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question11')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question11,"none");
                        assert.equal(contact.extra.it_question11,app.get_date_string());
                    }).run();
            });
        });

        describe("when 12 is randomly chosen as the next question",function() {
           it("should take them to question 12",function(){
               app.get_unanswered_question = function() {
                   return 12;
               };
               return tester
                   .setup.user.addr("+273123")
                   .setup.user.state('states:quiz:vip:question11')
                   .input("1")
                   .check.interaction({
                       state: 'states:quiz:vip:question12',
                       reply: [
                           "During the past two weeks, have you attended a campaign rally?" ,
                           "1. Yes" ,
                           "2. No" ,
                           "3. Skip"
                       ].join("\n")
                   }).run();
           });
        });

        describe("when the user has answered the 12th question as 'Yes'", function() {
            it("should should save their response 'yes' as well as interaction time",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question12')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question12,"yes");
                        assert.equal(contact.extra.it_question12,app.get_date_string());
                    }).run();
            });
        });

        describe("when the user selects the report election activity option from main menu", function() {
            it("should take them to the report election activity page",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:menu')
                    .input('2')
                    .check.interaction({
                        state: 'states:report',
                        reply: [
                            'Choose a report type:',
                            '1. Party going door-to-door',
                            '2. Party intimidating voters',
                            '3. Party distributing food/money/gift',
                            '4. Campaign rally',
                            '5. Campaign violence',
                            '6. Protest/Demonstration'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user submits a category",function() {
            it("should save their category and description",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:report')
                    .input('1')
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.report_type,"1");
                        assert.equal(contact.extra.report_desc,"Party going door-to-door");
                    }).run();
            });

            it("should take them to the 'title' page",function(){
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:report')
                    .input('1')
                    .check.interaction({
                        state: 'states:report:title',
                        reply: 'What is the title of your report?'
                    }).run();
            });
        });

        describe("when the user submits a title",function() {
            it("should save their title",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:report:title')
                    .input('test')
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.report_title,"test");
                    }).run();
            });

            it("should take them to the 'location' page",function(){
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:report:title')
                    .input('test')
                    .check.interaction({
                        state: 'states:report:location',
                        reply: 'Where did this event happen? Please be as specific as possible and give address and city.'
                    }).run();
            });
        });

        describe("when the user enters their current location to the selection menu",function(){
            it("should send a request to the mapping api",function() {
                return tester
                    .setup.user.state('states:report:location')
                    .input("21 conduit street south africa")
                    .check(function(api) {
                        var req = api.http.requests[0];
                        var url = req.url;
                        assert.equal(url,"https://maps.googleapis.com/maps/api/geocode/json");
                        assert.equal(req.params.address,'21 conduit street south africa');
                        assert.equal(req.params.sensor,'false');
                    }).run();
            });

            describe("if they don't specify south africa",function() {
                it("should append 'south africa' to their request",function() {
                    return tester
                        .setup.user.state('states:report:location')
                        .input("21 conduit street")
                        .check(function(api) {
                            var req = api.http.requests[0];
                            var url = req.url;
                            assert.equal(url,"https://maps.googleapis.com/maps/api/geocode/json");
                            assert.equal(req.params.address,'21 conduit street south africa');
                            assert.equal(req.params.sensor,'false');
                        }).run();
                });
            });

            it("should provide them with a list of locations matching their input",function() {
                return tester
                    .setup.user.state('states:report:location')
                    .input("21 conduit street south africa")
                    .check.interaction({
                        state: "states:report:verify_location",
                        reply: [
                            "Please select your location from the options below:",
                            "1. 21 Conduit Street, Randburg 2188",
                            "2. 21 Conduit Street, Sandton 2191"
                        ].join("\n")
                    }).run();
            });

            describe("when user selects which a location from the list",function() {
                beforeEach(function() {
                    app.get_date = function() {
                        var d = new Date(2014,2,16);
                        d.setHours(0,0,0,0);
                        return d;
                    };
                    return tester
                        .setup.user.addr('+273131')
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+273131',
                                extra : {
                                    is_registered: 'true',
                                    register_sms_sent: 'true',
                                    report_title: "test",
                                    report_desc:"Party going door-to-door",
                                    report_type:"1"
                                }
                            });
                        })
                        .setup.user.state('states:report:verify_location',{
                            creator_opts: {
                                address_options: [
                                    {
                                        "formatted_address" : "21 Conduit Street, Randburg 2188, South Africa",
                                        "geometry" : { "location" : { "lat" : -26.02674,"lng" : 27.97532}}
                                    },{
                                        "formatted_address" : "21 Conduit Street, Sandton 2191, South Africa",
                                        "geometry" : {"location" : {"lat" : -26.0701361,"lng" : 27.9946541} }
                                    }
                                ]
                            }
                        })
                        .input("1");
                });

                it("should post their report to ushahidi",function() {
                   return tester
                        .check(function(api) {
                            var req = api.http.requests[0];
                            var url = req.url;
                            var body = req.body;
                            var date = encodeURIComponent( app.ushahidi.get_formatted_date(app.get_date()));
                            assert.equal(url,"https://godi.crowdmap.com/api");
                            assert.equal(body,[
                                "task=report",
                                "incident_title=test" ,
                                "incident_description=Party%20going%20door-to-door" ,
                                "incident_category=1" ,
                                "incident_date="+ date ,
                                "incident_hour=0" ,
                                "incident_minute=0" ,
                                "incident_ampm=am" ,
                                "latitude=-26.02674" ,
                                "longitude=27.97532" ,
                                "location_name=21%20Conduit%20Street%2C%20Randburg%202188%2C%20South%20Africa"
                            ].join('&'));

                        }).run();
                });

                it("should take them to the submit report thank you state",function() {
                    return tester
                        .check.interaction({
                            state: 'states:menu',
                            reply: [
                                'Thank you for your report! Keep up the reporting',
                                '& you may have a chance to be chosen as an official',
                                'election day reporter where you can earn airtime or cash',
                                'for your contribution.'
                            ].join(" ")
                        }).run();
                });

                it("should fire a 'reports' metric",function() {
                    return tester
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_app;
                            assert.deepEqual(metrics['total.reports'].values, [1]);
                        }).run();
                });

                it("should incr 'total.reports' in kv-store",function() {
                    return tester
                        .check(function(api) {
                            assert.equal(api.kv.store['total.reports'], 1);
                        }).run();
                });
            });

            describe("when the list of matching locations is too long to be displayed",function() {
                it("should only show 3 and then provide them with the ability to view more locations", function() {
                    return tester
                        .setup.user.state('states:report:location')
                        .input("main street south africa")
                        .check.interaction({
                            state: "states:report:verify_location",
                            reply: [
                                "Please select your location from the options below:",
                                "1. Main Street, Johannesburg",
                                "2. Main Street, Johannesburg 2192",
                                "3. Main Street, Johannesburg South 2190",
                                "4. More"
                            ].join("\n")
                        }).run();
                });
            });
        });

        var get_question_number = function(state) {
            return parseInt(state.state.name.split("question").pop());
        };

        describe("when the user has selected to do the quiz from the menu", function() {
            it("should take them to a random unanswered question",function() {
                var unanswered = [1,2,3,4,5,6,7,8,9,10,11,12];
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273101',
                            extra : {
                                is_registered: 'true',
                                vip_unanswered: JSON.stringify(unanswered),
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273101")
                    .setup.user.state('states:quiz:vip:continue')
                    .input('1')
                    .check.user.state(function(state){
                        var question_num = get_question_number(state) ;
                        assert.equal(_.contains(unanswered,question_num),true);
                    }).run();
            });
        });

        describe("when the user has answered the continue question as 'Continue'", function() {
            it("should take them to a random unanswered question",function() {
                var unanswered = [1,2,3,4];
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                vip_unanswered: JSON.stringify(unanswered),
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user.state('states:quiz:vip:continue')
                    .input('1')
                    .check.user.state(function(state){
                        var question_num = get_question_number(state);
                        assert.notEqual(state.name,'states:quiz:vip:continue');
                        assert.equal(_.contains(unanswered,question_num),true);
                    }).run();
            });
        });

        describe("when the user has answered a question", function() {

            describe("if it was the last question",function() {
                beforeEach(function() {
                    var unanswered = [6];
                    return tester
                        .setup( function(api) {
                            api.contacts.add( {
                                msisdn: '+273465',
                                extra : {
                                    is_registered: 'true',
                                    vip_unanswered: JSON.stringify(unanswered),
                                    register_sms_sent: 'true'
                                }
                            });
                        })
                        .setup.user.addr("+273465")
                        .setup.user.state('states:quiz:vip:question6')
                        .input('1');
                });

                it("should return them to the main menu",function() {
                    return tester
                        .check.interaction({
                            state: 'states:menu'
                        }).run();
                });

                it("should fire a 'quiz.complete' metric",function() {
                    return tester
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_app;
                            assert.deepEqual(metrics['quiz.complete'].values, [1]);
                        }).run();
                });
            });

            it("should fire a 'questions' metric",function() {
                var unanswered = [1,2,5,6,7,8];
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                vip_unanswered: JSON.stringify(unanswered),
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user.state('states:quiz:vip:question6')
                    .input('1')
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.deepEqual(metrics['total.questions'].values, [1]);
                    }).run();
            });

            it("should increment 'questions' kv store",function() {
                var unanswered = [1,2,5,6,7,8];
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                vip_unanswered: JSON.stringify(unanswered),
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user.state('states:quiz:vip:question6')
                    .input('1')
                    .check(function(api) {
                        assert.equal(api.kv.store['total.questions'], 1);
                    }).run();
            });

            it("should take them to a random unanswered question",function() {
                var unanswered = [1,2,5,6,7,8];
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                vip_unanswered: JSON.stringify(unanswered),
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user.state('states:quiz:vip:question6')
                    .input('1')
                    .check.user.state(function(state){
                        var question_num = get_question_number(state);
                        assert.equal(_.contains(unanswered,question_num),true);
                        assert.notEqual(question_num,6);
                    }).run();
            });

            it("should remove the question from the unanswered list",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question11')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(_.indexOf(JSON.parse(contact.extra.vip_unanswered),11),-1);
                    }).run();
            });
        });

        describe("when the user has answered their 4th question", function() {
            it("should take them if they want to continue",function() {
                var unanswered = [4,5,6,7,8,9,10,11,12];
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                vip_unanswered: JSON.stringify(unanswered),
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user.state('states:quiz:vip:question6')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:continue',
                        reply: [
                            'Would you like to continue answering questions? There are 12 in total.',
                            '1. Continue',
                            '2. Main Menu'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered their 8th question", function() {
            it("should take them if they want to continue",function() {
                var unanswered = [8,9,10,11,12];
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                vip_unanswered: JSON.stringify(unanswered),
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user.state('states:quiz:vip:question8')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:continue',
                        reply: [
                            'Would you like to continue answering questions? There are 12 in total.',
                            '1. Continue',
                            '2. Main Menu'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user selects 'Terms and conditions' from the terms and conditions menu", function() {
            it("should take the user to the first page of the terms",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:registration:tandc')
                    .input("2")
                    .check.interaction({
                        state: "states:registration:read",
                        reply: [
                            "University of California San Diego requests ur consent to act as a research subject for " +
                                "improving electoral performance through citizen engagement in SA.",
                            "1. Prev 2. Next 3. Exit"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user selects next on the terms and conditions page", function() {
            it("should take them to page 2 of the terms",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state("states:registration:read")
                    .input("2")
                    .check.interaction({
                        state: "states:registration:read",
                        reply: [
                            "Study provides evaluation on how 2 use marketing &recruitment strategies,with mobile technology " +
                                "to improve how elections r monitored by citizen volunteers.",
                            "1. Prev 2. Next 3. Exit"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user selects Exit", function() {
           it("should take them back to the terms and conditions choice page",function() {
               return tester
                   .setup.user.addr("+273123")
                   .setup.user.state("states:registration:read")
                   .input("3")
                   .check.interaction({
                       state: "states:registration:tandc"
                   }).run();
           });
        });

        describe("when the user selects 'About' from the main menu", function() {
            it("should take the user to the first page of the about section",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:menu')
                    .input("4")
                    .check.interaction({
                        state: "states:about",
                        reply: [
                            "The VIP-Ask is a multi-channel political engagement portal.VIP: " +
                                "Ask will engage South Africans from all walks of life to " +
                                "report on electoral activities,",
                            "1. Prev 2. Next 3. Exit"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user selects next on the 'About' page", function() {
            it("should take them to page 2 of the about section",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state("states:about")
                    .input("2")
                    .check.interaction({
                        state: "states:about",
                        reply: [
                            "voice their opinions on current issues surrounding the elections, " +
                                "and report on election processes on voting day.",
                            "1. Prev 2. Next 3. Exit"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user selects Exit", function() {
            it("should take them back to the menu page",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state("states:about")
                    .input("3")
                    .check.interaction({
                        state: "states:menu"
                    }).run();
            });
        });

        describe("when the user selects View results from the main menu",function() {
           it("should take them to view the results",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup(function(api) {
                        api.kv.store['registered.participants'] = 3;
                        api.kv.store['total.questions'] = 4;
                        api.kv.store['total.reports'] = 5;
                    })
                    .setup.user.state("states:menu")
                    .input("3")
                    .check.interaction({
                        state: "states:start",
                        reply: "You are 1 of 3 citizens who are active " +
                                "citizen election reporters! " +
                                "4 questions and 5 election activity posts " +
                                "have been submitted. View results at www.url.com"
                    }).run();
           });

            describe("if the the kv store value has not been set yet",function() {
                it("should default the values to 0",function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user.state("states:menu")
                        .input("3")
                        .check.interaction({
                            state: "states:start",
                            reply: "You are 1 of 0 citizens who are active " +
                                "citizen election reporters! " +
                                "0 questions and 0 election activity posts " +
                                "have been submitted. View results at www.url.com"
                        }).run();
                });
            });

        });
    });
});
