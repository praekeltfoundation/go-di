var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require("lodash");

var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;

describe("app", function() {
    describe.only("Twitter Quiz test", function() {

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
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    api.contacts.add( {
                        twitter_handle: "@test",
                        extra : {
                            is_registered: 'true',
                            register_sms_sent: 'true'
                        }
                    });
                });
        });

        describe("when a session is started", function() {
            describe("when they are not registered",function() {
                it("should set the user's language to english",function() {
                    return tester
                        .setup.user.addr('@test1')
                        .setup(function(api) {
                            api.contacts.add( {
                                twitter_handle: "@test1",
                                extra : {
                                    is_registered: 'false'
                                }
                            });
                        })
                        .start()
                        .check.user.properties({lang:'en'})
                        .run();
                });

                it("should send them to the engagement question",function() {
                    return tester
                        .setup.user.addr('@test1')
                        .setup(function(api) {
                            api.contacts.add( {
                                twitter_handle: "@test1",
                                extra : {
                                    is_registered: 'false'
                                }
                            });
                        })
                        .start()
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
