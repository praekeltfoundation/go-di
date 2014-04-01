var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require("lodash");
describe("app", function() {
    describe("Twitter Quiz test", function() {

        var app;
        var tester;

        var assert_no_smses = function(api) {
            var smses = _.where(api.outbound.store, {
                endpoint: 'sms'
            });
            assert.equal(smses.length,0);
        };

        beforeEach(function() {
            app = new di.app.GoDiApp();

            tester = new AppTester(app,{
                api: {
                    http: {default_encoding: 'json'}
                }
            })
            .setup.char_limit(180);

            app.get_date = function() {
                var d = new Date();
                d.setHours(0,0,0,0);
                return d;
            };

            tester
                .setup.config.app({
                    name: 'test_app',
                    delivery_class: 'twitter'
                })
                .setup(function(api) {
                    api.contacts.add( {
                        twitter_handle: "@test",
                        extra : {
                            is_registered: 'true',
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
                                .setup.user.addr('@test')
                                .setup(function(api) {
                                    api.contacts.add( {
                                        twitter_handle: '@test',
                                        extra : {
                                            is_registered: 'true',
                                            register_sms_sent: 'true'
                                        }
                                    });
                                })
                                .setup.user.state('states:register')
                                .input('1')
                                .input.session_event('close')
                                .check(assert_no_smses)
                                .run();
                        });
                    });

                    describe("when they have not been sent a registration sms",function() {
                        it ("should not be sent an sms",function() {
                            tester
                                .setup.user.addr('@test')
                                .setup.user.state('states:register')
                                .input('1')
                                .input.session_event('close')
                                .check(assert_no_smses)
                                .run();
                        });
                    });
                });

                describe("when they have inputted their location",function() {
                    describe("when they have already been sent a registration sms",function() {
                        it ("should not send them an sms",function() {
                            tester
                                .setup.user.addr('@test')
                                .setup(function(api) {
                                    api.contacts.add( {
                                        twitter_handle: '@test',
                                        extra : {
                                            is_registered: 'true',
                                            register_sms_sent: 'true'
                                        }
                                    });
                                })
                                .setup.user.state('states:register')
                                .input('1')
                                .input.session_event('close')
                                .check(assert_no_smses)
                                .run();
                        });
                    });
                    describe("when they have already been sent a registration sms",function() {
                        it("should not send them an sms",function() {
                            tester
                                .setup.user.addr('@test')
                                .setup.user.state('states:register')
                                .input('1')
                                .input.session_event('close')
                                .check(assert_no_smses)
                                .run();
                        });
                    });
                });
            });
        });

        describe("when the user has answered the race question",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("@test")
                    .setup.user.state('states:quiz:answerwin:race')
                    .input('1');
            });

            it("should save their answer to the race question",function() {
                return tester
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.answerwin_question_race,"black_african");
                        assert.equal(contact.extra.it_answerwin_question_race,app.get_date_string());
                    })
                    .run();
            });

            it("should take them to the phone number question",function() {
                return tester
                    .check.interaction({
                        state: 'states:quiz:answerwin:phonenumber',
                        reply: [
                            'Please give us your cellphone number so we can send you your airtime!'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has provided their cell phone number",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("@test")
                    .setup.user.state('states:quiz:answerwin:phonenumber')
                    .input('0729042520');
            });

            it("should save their cell phone number",function() {
                return tester
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.msisdn,"+27729042520");
                    })
                    .run();
            });

            it("should take them to the thank you question",function() {
                return tester
                    .check.interaction({
                        state: 'states:quiz:answerwin:thankyou',
                        reply: [
                            'Thank you for telling VIP a bit more about yourself! Your airtime will be sent to you shortly!',
                            '1. Main Menu'
                        ].join('\n')
                    }).run();
            });
        });

    });
});