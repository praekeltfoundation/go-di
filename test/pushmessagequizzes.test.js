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
                                new_week_day: 'T'
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
                it("should serve the user a random quiz question",function() {
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
                it("should take the user to the end of the quiz",function() {
                    return tester
                        .setup.user.addr('m123')
                        .setup.user({
                            state: 'states:quiz:votingexperience:begin',
                            answers: get_answered_quiz_states(8)
                        })
                        .check.interaction({
                            state:'states:menu'
                        })
                        .run();
                });
            });


        });
    });

    describe.only("Mxit Group C Quiz Push App", function() {
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
                                group: 'C1'
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
                            reply: 'If your phone has a camera, pls mms us a photo of your inked finger to show your vote! U will be sent airtime for ur MMS'
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
                                group: 'B'
                            }
                        });
                    });
            });

            it("should not send them to the group c push conversation",function() {
                tester
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
});