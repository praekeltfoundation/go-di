var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var ward_treatment = require('./ward_treatment');
var push_message_group = require('./push_message_group');
var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;
var _ = require('lodash');

describe("app", function() {
    describe("Mxit Voting Experience Quiz Push App", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new di.app.GoDiApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
                .setup.char_limit(180);

            app.get_date = function() {
                var d = new Date('15 April, 2014');
                d.setHours(0,0,0,0);
                return d;
            };

            tester
                .setup.user.lang('en')
                .setup(function(api) {
                    //Add the resources
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    //Add the configs
                    api.config.store.ward_treatment = ward_treatment();
                    api.config.store.push_message_group = push_message_group();

                })
                .setup.config.app({
                    name: 'test_push_app',
                    panel_messages: [0, 1, 4],
                    thermometer_messages: [2, 3],
                    panel_push_start: app.get_date_string(),
                    push_end_date: '6 May, 2014',
                    billing_code: 'incentive',
                    can_push: true,
                    delivery_class: 'mxit',
                    voting_turnout_push_day: '7 May, 2014',
                    group_c_push_day: '8 May, 2014'
                });
        });

        var quiz_states = [
            'states:quiz:votingexperience:adequate_privacy',
            'states:quiz:votingexperience:intimidation_incidents',
            'states:quiz:votingexperience:violence_observation',
            'states:quiz:votingexperience:environment_report',
            'states:quiz:votingexperience:party_campaigning_observation',
            'states:quiz:votingexperience:performance_iec_officials',
            'states:quiz:votingexperience:station_materials',
            'states:quiz:votingexperience:queue_wait'
        ];

        /**
         * Returns a n subset of the questions to be used as the answered questions.
         * */
        var get_answered_quiz_states = function(n) {
            var states = quiz_states.slice(0,n);
            var answers = {};
            _.forEach(states,function(value) {
                answers[value] = '1';
            });
            return answers;
        };

        describe("when it is the day for the voting turnout quiz",function() {
            beforeEach(function(){
                app.get_date = function() {
                    var d = new Date('7 May, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                tester
                    .setup(function(api){
                        //Add a contact
                        api.contacts.add( {
                            mxit_id: 'm123',
                            extra : {
                                is_registered: 'true',
                                delivery_class: 'mxit',
                                new_week_day: 'T',
                                C0: 'yes'
                            }
                        });
                    });
            });
            it("should start the voting turnout conversation",function() {
                return tester
                    .setup.user.addr('m123')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check.interaction({
                        state:'states:push:voting_turnout',
                        reply:[
                            'VIP wants to know if you voted?',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });

            it("should save the push round details",function() {
                return tester
                    .setup.user.addr('m123')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store,{mxit_id:'m123'});
                        assert.equal(contact.extra.it_voting_turnout_round_1,app.get_date_string());
                    })
                    .run();
            });

            describe("when the user replies to the voting turnout conversation with 'Yes'",function() {
                beforeEach(function() {
                    tester
                        .setup.user.addr('m123')
                        .setup.user.state('states:push:voting_turnout')
                        .input('1');
                });

                it("should start the voting turnout quiz",function() {
                    return tester
                        .check.user(function(user) {
                            assert.equal(user.state.name.indexOf('states:quiz:votingexperience')>= 0, true);
                        })
                        .run();
                });

                it("should save the reply to the push round",function() {
                    return tester
                        .check(function(api) {
                            var contact = _.find(api.contacts.store,{mxit_id:'m123'});
                            assert.equal(contact.extra.voting_turnout_round_1_reply,'yes');
                        })
                        .run();
                });
            });

            describe("when the user replies to the voting turnout conversation with 'No'",function() {
                it("should thank the user",function() {
                    return tester
                        .setup.user.addr('m123')
                        .setup.user.state('states:push:voting_turnout')
                        .input('2')
                        .check.interaction({
                            state: 'states:push:thanks'
                        })
                        .run();
                });
            });



            describe("when the user finishes the quiz",function() {
                it("should take the user to the main menu",function() {
                    return tester
                        .setup.user.addr('m123')
                        .setup.user({
                            state: 'states:quiz:votingexperience:begin',
                            answers: get_answered_quiz_states(7)
                        })
                        .input('1')
                        .check.interaction({
                            state:'states:menu'
                        })
                        .run();
                });
            });
        });

        function setup_question_test(state_name) {
            app.quizzes.votingexperience.random_quiz_name = function(n) {
                return state_name;
            };
            tester
                .setup.user.state('states:quiz:votingexperience:begin')
                .setup.user.addr("m123");
        }

        describe("when 'intimidation_incidents' question is randomly chosen to be next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:votingexperience:intimidation_incidents');
            });

            it("should show them the correct question",function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:votingexperience:intimidation_incidents',
                        reply: [
                            "Did you observe or hear about any incidents of intimidation in or around the polling station?",
                            "1. Yes",
                            "2. No",
                            "3. Skip"
                        ].join("\n")
                    }).run();
            });

            it("should save the correct fields",function() {
                return tester
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.votingexperience_question_intimidation_incidents,"yes");
                        assert.equal(contact.extra.it_votingexperience_question_intimidation_incidents,app.get_date_string());
                    }).run();
            });
        });

        describe("when 'queue_wait' question is randomly chosen to be next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:votingexperience:queue_wait');
            });

            it("should show them the correct question",function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:votingexperience:queue_wait',
                        reply: [
                            "How long are voters waiting in queue b4 voting?",
                            "1. less than 10min" ,
                            "2. 10-30 min" ,
                            "3. 30min to 1hr" ,
                            "4. more than 1hr",
                            "5. skip"
                        ].join("\n")
                    }).run();
            });

            it("should save the correct fields",function() {
                return tester
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.votingexperience_question_queue_wait,"less_than_10");
                        assert.equal(contact.extra.it_votingexperience_question_queue_wait,app.get_date_string());
                    }).run();
            });
        });

        describe("when 'station_materials' question is randomly chosen to be next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:votingexperience:station_materials');
            });

            it("should show them the correct question",function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:votingexperience:station_materials',
                        reply: [
                            "Did the voting station have all necessary materials and working equipment?",
                            "1. Yes" ,
                            "2. No" ,
                            "3. Don't know" ,
                            "4. Skip"
                        ].join("\n")
                    }).run();
            });

            it("should save the correct fields",function() {
                return tester
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.votingexperience_question_station_materials,"yes");
                        assert.equal(contact.extra.it_votingexperience_question_station_materials,app.get_date_string());
                    }).run();
            });
        });

        describe("when 'performance_iec_officials' question is randomly chosen to be next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:votingexperience:performance_iec_officials');
            });

            it("should show them the correct question",function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:votingexperience:performance_iec_officials',
                        reply: [
                            "How would you rate the overall performance of IEC officials at the voting station?",
                            "1. Excellent" ,
                            "2. Good" ,
                            "3. Fair",
                            "4. Poor",
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });

            it("should save the correct fields",function() {
                return tester
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.votingexperience_question_performance_iec_officials,"excellent");
                        assert.equal(contact.extra.it_votingexperience_question_performance_iec_officials,app.get_date_string());
                    }).run();
            });
        });

        describe("when 'party_campaigning_observation' question is randomly chosen to be next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:votingexperience:party_campaigning_observation');
            });

            it("should show them the correct question",function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:votingexperience:party_campaigning_observation',
                        reply: [
                            "Did you observe party agents campaigning outside of the voting station?",
                            "1. Yes" ,
                            "2. No" ,
                            "3. Skip"
                        ].join("\n")
                    }).run();
            });

            it("should save the correct fields",function() {
                return tester
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.votingexperience_question_party_campaigning_observation,"yes");
                        assert.equal(contact.extra.it_votingexperience_question_party_campaigning_observation,app.get_date_string());
                    }).run();
            });
        });

        describe("when 'environment_report' question is randomly chosen to be next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:votingexperience:environment_report');
            });

            it("should show them the correct question",function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:votingexperience:environment_report',
                        reply: [
                            "Please report the environment outside the polling station",
                            "1. Very tense" ,
                            "2. Somewhat tense" ,
                            "3. Not tense",
                            "4. Skip"
                        ].join("\n")
                    }).run();
            });

            it("should save the correct fields",function() {
                return tester
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.votingexperience_question_environment_report,"very_tense");
                        assert.equal(contact.extra.it_votingexperience_question_environment_report,app.get_date_string());
                    }).run();
            });
        });

        describe("when 'violence_observation' question is randomly chosen to be next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:votingexperience:violence_observation');
            });

            it("should show them the correct question",function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:votingexperience:violence_observation',
                        reply: [
                            "Did you observe or hear about any violence in or around the polling station?",
                            "1. Yes" ,
                            "2. No" ,
                            "3. Skip"
                        ].join("\n")
                    }).run();
            });

            it("should save the correct fields",function() {
                return tester
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.votingexperience_question_violence_observation,"yes");
                        assert.equal(contact.extra.it_votingexperience_question_violence_observation,app.get_date_string());
                    }).run();
            });
        });

        describe("when 'adequate_privacy' question is randomly chosen to be next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:votingexperience:adequate_privacy');
            });

            it("should show them the correct question",function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:votingexperience:adequate_privacy',
                        reply: [
                            "Did the voting station provide adequate privacy to ensure ballot secrecy?",
                            "1. Yes" ,
                            "2. No" ,
                            "3. Skip"
                        ].join("\n")
                    }).run();
            });

            it("should save the correct fields",function() {
                return tester
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.votingexperience_question_adequate_privacy,"yes");
                        assert.equal(contact.extra.it_votingexperience_question_adequate_privacy,app.get_date_string());
                    }).run();
            });
        });
    });

    describe("Mxit Group C Quiz Push App", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new di.app.GoDiApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
                .setup.char_limit(180);

            app.get_date = function() {
                var d = new Date('15 April, 2014');
                d.setHours(0,0,0,0);
                return d;
            };

            tester
                .setup.user.lang('en')
                .setup(function(api) {
                    //Add the resources
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    //Add the configs
                    api.config.store.ward_treatment = ward_treatment();
                    api.config.store.push_message_group = push_message_group();
                })
                .setup.config.app({
                    name: 'test_push_app',
                    panel_messages: [0, 1, 4],
                    thermometer_messages: [2, 3],
                    panel_push_start: app.get_date_string(),
                    push_end_date: '6 May, 2014',
                    billing_code: 'incentive',
                    can_push: true,
                    delivery_class: 'mxit',
                    voting_turnout_push_day: '7 May, 2014',
                    group_c_push_day: '8 May, 2014'
                });
        });

        function setup_question_test(state_name) {
            app.quizzes.groupc.random_quiz_name = function(n) {
                return state_name;
            };
            tester
                .setup.user.state('states:quiz:groupc:begin')
                .setup.user.addr("m123");
        }

        describe("when it is the day for the group c quiz and the user belongs to group c",function() {
            beforeEach(function(){
                app.get_date = function() {
                    var d = new Date('8 May, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                tester
                    .setup(function(api){
                        //Add a contact
                        api.contacts.add( {
                            mxit_id: 'm123',
                            extra : {
                                is_registered: 'true',
                                delivery_class: 'mxit',
                                new_week_day: 'T',
                                C1: 'yes'
                            }
                        });
                    });
            });

            it("should start the group c turnout conversation",function() {
                return tester
                    .setup.user.addr('m123')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check.interaction({
                        state:'states:push:group_c_turnout',
                        reply:[
                            'VIP wants to know if you voted?',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });

            it("should save the push round details",function() {
                return tester
                    .setup.user.addr('m123')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store,{mxit_id:'m123'});
                        assert.equal(contact.extra.it_group_c_turnout_round_1,app.get_date_string());
                    })
                    .run();
            });

            describe("when the user replies to the group c conversation with 'Yes'",function() {
                beforeEach(function() {
                    tester
                        .setup.user.addr('m123')
                        .setup.user.state('states:push:group_c_turnout')
                        .input('1');
                });

                it("should start the group c quiz",function() {
                    return tester
                        .check.user(function(user) {
                            assert.equal(user.state.name.indexOf('states:quiz:groupc')>= 0, true);
                        })
                        .run();
                });

                it("should save the reply to the push round",function() {
                    return tester
                        .check(function(api) {
                            var contact = _.find(api.contacts.store,{mxit_id:'m123'});
                            assert.equal(contact.extra.group_c_turnout_round_1_reply,'yes');
                        })
                        .run();
                });
            });

            describe("when the user replies to the group c conversation with 'No'",function() {
                it("take them to the push:thanks page",function() {
                    return tester
                        .setup.user.addr('m123')
                        .setup.user.state('states:push:group_c_turnout')
                        .input('2')
                        .check.interaction({
                            state: 'states:push:thanks'
                        })
                        .run();
                });
            });

            describe("when 'colours' question is randomly chosen to be next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:groupc:colours');
                });

                it("should show them the correct question",function() {
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:groupc:colours',
                            reply: [
                                "What colours were the ballots at your voting station?",
                                "1. white&pink" ,
                                "2. green&yellow" ,
                                "3. pink&blue" ,
                                "4. blue&yellow" ,
                                "5. none of above" ,
                                "6. skip"
                            ].join("\n")
                        }).run();
                });

                it("should save the correct fields",function() {
                    return tester
                        .input('1')
                        .check(function(api){
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.groupc_question_colours,"white_pink");
                            assert.equal(contact.extra.it_groupc_question_colours,app.get_date_string());
                        }).run();
                });
            });

            describe("when the user answers the colours question",function() {
                beforeEach(function() {
                    tester
                        .setup.user.addr('m123')
                        .setup.user({
                            state: 'states:quiz:groupc:begin'
                        })
                        .input('1');
                });

                it("should take the user to the end of the quiz",function() {
                    return tester
                        .check.interaction({
                            state: 'states:quiz:groupc:end',
                            reply: 'If your phone has a camera, pls mms us a photo of your inked finger to show your vote! U will be sent airtime for ur MMS.Send to vipvoice2014@gmail.com'
                        })
                        .run();
                });

                it("should save the answer to the quiz",function() {
                    return tester
                        .check(function(api){
                            var contact = _.find(api.contacts.store,{mxit_id:'m123'});
                            assert.equal(contact.extra.groupc_question_colours,'white_pink');
                        })
                        .run();
                });
            });

        });
        describe("when the it is the day for the group c quiz but the user does not belong to group c",function() {
            beforeEach(function(){
                app.get_date = function() {
                    var d = new Date('8 May, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                tester
                    .setup(function(api){
                        //Add a contact
                        api.contacts.add( {
                            mxit_id: 'm321',
                            extra : {
                                is_registered: 'true',
                                delivery_class: 'mxit',
                                new_week_day: 'T',
                                B: 'yes'
                            }
                        });
                    });
            });

            it("should not send them to the group c push conversation",function() {
                return tester
                    .setup.user.state('states:menu')
                    .setup.user.addr('m321')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check.user.state('states:menu')
                    .check.no_reply()
                    .run();
            });
        });
    });

    describe("SMS Voting Experience Conversation App",function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new di.base.DiSmsApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
                .setup.char_limit(180);

            app.get_date = function() {
                var d = new Date('15 April, 2014');
                d.setHours(0,0,0,0);
                return d;
            };

            tester
                .setup.user.lang('en')
                .setup(function(api) {
                    //Add the resources
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    //Add the configs
                    api.config.store.ward_treatment = ward_treatment();
                    api.config.store.push_message_group = push_message_group();
                })
                .setup.config.app({
                    name: 'test_push_app',
                    panel_messages: [0, 1, 4],
                    thermometer_messages: [2, 3],
                    panel_push_start: app.get_date_string(),
                    push_end_date: '6 May, 2014',
                    billing_code: 'incentive',
                    can_push: true,
                    delivery_class: 'sms',
                    quiz: 'votingexperience',
                    voting_turnout_push_day: '7 May, 2014',
                    group_c_push_day: '8 May, 2014'
                });
        });

        describe("when it is the day for the voting turnout quiz",function() {
            beforeEach(function(){
                app.get_date = function() {
                    var d = new Date('7 May, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                tester
                    .setup(function(api){
                        //Add a contact
                        api.contacts.add( {
                            msisdn: '+2772',
                            extra : {
                                is_registered: 'true',
                                delivery_class: 'ussd',
                                new_week_day: 'T',
                                C0: 'yes'
                            }
                        });
                    });
            });
            it("should start the voting turnout conversation",function() {
                return tester
                    .setup.user.addr('+2772')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check.interaction({
                        state:'states:push:voting_turnout',
                        reply:[
                            'VIP wants to know if you voted?',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });

            it("should save the push round details",function() {
                return tester
                    .setup.user.addr('+2772')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store,{msisdn:'+2772'});
                        assert.equal(contact.extra.it_voting_turnout_round_1,app.get_date_string());
                    })
                    .run();
            });

            describe("when the user replies to the voting turnout conversation with 'Yes'",function() {
                beforeEach(function() {
                    tester
                        .setup.user.addr('+2772')
                        .setup.user.state('states:push:voting_turnout')
                        .input('1');
                });

                it("should prompt the user with instruction to dial in",function() {
                    return tester
                        .check.interaction({
                            state:'states:quiz:votingexperience:prompt',
                            reply: "Join thousands of other South Africans and tell us about your experience on " +
                                "election day! Dial *120*4729*1# It's free to dial!"
                        })
                        .run();
                });

                it("should save the reply to the push round",function() {
                    return tester
                        .check(function(api) {
                            var contact = _.find(api.contacts.store,{msisdn:'+2772'});
                            assert.equal(contact.extra.voting_turnout_round_1_reply,'yes');
                        })
                        .run();
                });
            });

            describe("when the user replies to the voting turnout conversation with 'No'",function() {
                it("should thank the user",function() {
                    return tester
                        .setup.user.addr('+2772')
                        .setup.user.state('states:push:voting_turnout')
                        .input('2')
                        .check.interaction({
                            state: 'states:push:thanks'
                        })
                        .run();
                });
            });
        });
    });

    describe("USSD Voting Experience Quiz Push App",function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new di.app.GoDiApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
                .setup.char_limit(180);

            app.get_date = function() {
                var d = new Date('15 April, 2014');
                d.setHours(0,0,0,0);
                return d;
            };

            tester
                .setup.user.lang('en')
                .setup(function(api) {
                    //Add the resources
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    //Add the configs
                    api.config.store.ward_treatment = ward_treatment();
                    api.config.store.push_message_group = push_message_group();

                    //Add a contact
                    api.contacts.add( {
                        msisdn: '+2772',
                        extra : {
                            is_registered: 'true',
                            register_sms_sent: 'true',
                            delivery_class: 'ussd',
                            new_week_day: 'T',
                            C0: 'yes'
                        }
                    });
                })
                .setup.config.app({
                    name: 'test_push_app',
                    panel_messages: [0, 1, 4],
                    thermometer_messages: [2, 3],
                    panel_push_start: app.get_date_string(),
                    push_end_date: '6 May, 2014',
                    billing_code: 'incentive',
                    can_push: true,
                    delivery_class: 'ussd',
                    quiz: 'votingexperience',
                    channel: "*120*4792*1#",
                    voting_turnout_push_day: '7 May, 2014',
                    group_c_push_day: '8 May, 2014'
                });
        });

        describe("when the user accesses the ussd channel",function() {
            it("should take the user to the quiz",function() {
                return tester
                    .setup.user.addr('+2772')
                    .start()
                    .check.user(function(user) {
                        assert.equal(_.contains(user.state.name,'states:quiz:votingexperience'), true);
                    })
                    .run();
            });
        });

        var quiz_states = [
            'states:quiz:votingexperience:adequate_privacy',
            'states:quiz:votingexperience:intimidation_incidents',
            'states:quiz:votingexperience:violence_observation',
            'states:quiz:votingexperience:environment_report',
            'states:quiz:votingexperience:party_campaigning_observation',
            'states:quiz:votingexperience:performance_iec_officials',
            'states:quiz:votingexperience:station_materials',
            'states:quiz:votingexperience:queue_wait'
        ];

        /**
         * Returns a n subset of the questions to be used as the answered questions.
         * */
        var get_answered_quiz_states = function(n) {
            var states = quiz_states.slice(0,n);
            var answers = {};
            _.forEach(states,function(value) {
                answers[value] = '1';
            });
            return answers;
        };

        describe("when the user finishes the quiz",function() {
            it("should thank the user",function() {
                return tester
                    .setup.user.addr('+2772')
                    .setup.user({
                        state: 'states:quiz:votingexperience:begin',
                        answers: get_answered_quiz_states(7)
                    })
                    .input('1')
                    .check.interaction({
                        state:'states:quiz:votingexperience:end'
                    })
                    .run();
            });
        });

        describe("when the user times out but has not completed the quiz",function() {
            it("should send them a reminder prompt message",function() {
                return tester
                    .setup.user.addr('+2772')
                    .setup.user({
                        state: 'states:quiz:votingexperience:begin',
                        answers: get_answered_quiz_states(6)
                    })
                    .input.session_event('close')
                    .check(function(api) {
                        var smses = _.where(api.outbound.store, {
                            endpoint: 'sms'
                        });
                        var sms = smses[0];
                        assert.equal(smses.length,1);
                        assert.equal(sms.to_addr,'+2772');
                    })
                    .run();
            });
        });

        describe("when the user times out but has completed the quiz and is on the thank you screen",function() {
            it("should not send them a reminder prompt message",function() {
                return tester
                    .setup.user.addr('+2772')
                    .setup.user({
                        state: 'states:quiz:votingexperience:begin',
                        answers: get_answered_quiz_states(8)
                    })
                    .input.session_event('close')
                    .check(function(api) {
                        var smses = _.where(api.outbound.store, {
                            endpoint: 'sms'
                        });
                        assert.equal(smses.length,0);
                    })
                    .run();
            });
        });
    });

    describe("SMS Group C Conversation App",function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new di.base.DiSmsApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
           .setup.char_limit(180);

            tester
                .setup.user.lang('en')
                .setup(function(api) {
                    //Add the resources
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    //Add the configs
                    api.config.store.ward_treatment = ward_treatment();
                    api.config.store.push_message_group = push_message_group();
                })
                .setup.config.app({
                    name: 'test_push_app',
                    panel_messages: [0, 1, 4],
                    thermometer_messages: [2, 3],
                    panel_push_start: app.get_date_string(),
                    push_end_date: '6 May, 2014',
                    billing_code: 'incentive',
                    can_push: true,
                    delivery_class: 'sms',
                    quiz: 'groupc',
                    voting_turnout_push_day: '7 May, 2014',
                    group_c_push_day: '8 May, 2014'
                });
        });

        describe("when it is the day for the group conversation quiz",function() {
            beforeEach(function(){
                app.get_date = function() {
                    var d = new Date('8 May, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                tester
                    .setup(function(api){
                        //Add a contact
                        api.contacts.add( {
                            msisdn: '+2772',
                            extra : {
                                is_registered: 'true',
                                delivery_class: 'ussd',
                                new_week_day: 'T',
                                C0: 'yes'
                            }
                        });
                    });
            });
            it("should start the group c conversation",function() {
                return tester
                    .setup.user.addr('+2772')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check.interaction({
                        state:'states:push:group_c_turnout',
                        reply:[
                            'VIP wants to know if you voted?',
                            '1. Yes',
                            '2. No'
                        ].join('\n')
                    })
                    .run();
            });

            it("should save the push round details",function() {
                return tester
                    .setup.user.addr('+2772')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check(function(api) {
                        var contact = _.find(api.contacts.store,{msisdn:'+2772'});
                        assert.equal(contact.extra.it_group_c_turnout_round_1,app.get_date_string());
                    })
                    .run();
            });

            describe("when the user replies to the group c conversation with 'Yes'",function() {
                beforeEach(function() {
                    tester
                        .setup.user.addr('+2772')
                        .setup.user.state('states:push:group_c_turnout')
                        .input('1');
                });

                it("should prompt the user with instruction to dial in",function() {
                    return tester
                        .check.interaction({
                            state:'states:quiz:groupc:prompt',
                            reply: "Join thousands of other South Africans and report about ur voting experience! " +
                                "Dial *120*4729*2# to have ur voice count."
                        })
                        .run();
                });

                it("should save the reply to the push round",function() {
                    return tester
                        .check(function(api) {
                            var contact = _.find(api.contacts.store,{msisdn:'+2772'});
                            assert.equal(contact.extra.group_c_turnout_round_1_reply,'yes');
                        })
                        .run();
                });
            });

            describe("when the user replies to the group c conversation with 'No'",function() {
                it("should thank the user",function() {
                    return tester
                        .setup.user.addr('+2772')
                        .setup.user.state('states:push:group_c_turnout')
                        .input('2')
                        .check.interaction({
                            state: 'states:push:thanks'
                        })
                        .run();
                });
            });
        });
    });

    describe("USSD Group C Quiz Push App",function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new di.app.GoDiApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
                .setup.char_limit(180);

            app.get_date = function() {
                var d = new Date('15 April, 2014');
                d.setHours(0,0,0,0);
                return d;
            };

            tester
                .setup.user.lang('en')
                .setup(function(api) {
                    //Add the resources
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    //Add the configs
                    api.config.store.ward_treatment = ward_treatment();
                    api.config.store.push_message_group = push_message_group();

                    //Add a contact
                    api.contacts.add( {
                        msisdn: '+2772',
                        extra : {
                            is_registered: 'true',
                            delivery_class: 'ussd',
                            new_week_day: 'T',
                            C0: 'yes'
                        }
                    });
                })
                .setup.config.app({
                    name: 'test_push_app',
                    panel_messages: [0, 1, 4],
                    thermometer_messages: [2, 3],
                    panel_push_start: app.get_date_string(),
                    push_end_date: '6 May, 2014',
                    billing_code: 'incentive',
                    can_push: true,
                    delivery_class: 'ussd',
                    quiz: 'groupc',
                    channel: "*120*4792*2#",
                    voting_turnout_push_day: '7 May, 2014',
                    group_c_push_day: '8 May, 2014'
                });
        });

        describe("when the user accesses the ussd channel",function() {
            it("should take the user to a random quiz question",function() {
                return tester
                    .setup.user.addr('+2772')
                    .start()
                    .check.user(function(user) {
                        assert.equal(_.contains(user.state.name,'states:quiz:groupc'), true);
                    })
                    .run();
            });
        });

        describe("when the user answers the colours question",function() {
            beforeEach(function() {
                tester
                    .setup.user.addr('+2772')
                    .setup.user({
                        state: 'states:quiz:groupc:begin'
                    })
                    .input('1');
            });

            it("should take the user to the end of the quiz",function() {
                return tester
                    .check.interaction({
                        state: 'states:quiz:groupc:end',
                        reply: 'If your phone has a camera, pls mms us a photo of your inked finger to show your vote! U will be sent airtime for ur MMS.Send to vipvoice2014@gmail.com'
                    })
                    .run();
            });

            it("should save the answer to the quiz",function() {
                return tester
                    .check(function(api){
                        var contact = _.find(api.contacts.store,{msisdn:'+2772'});
                        assert.equal(contact.extra.groupc_question_colours,'white_pink');
                    })
                    .run();
            });
        });
    });

});