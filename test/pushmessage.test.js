var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures = require('./fixtures');
var ward_treatment = require('./ward_treatment');
var push_message_group = require('./push_message_group');
var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;
var _ = require('lodash');

describe("app", function() {

    describe("Push Message app", function() {
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
                .setup(function(api) {
                    //Add the resources
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    //Add the configs
                    api.config.store.ward_treatment = ward_treatment();
                    api.config.store.push_message_group = push_message_group();

                    // Add all of the fixtures.
                    fixtures().forEach(api.http.fixtures.add);

                    //Add a contact - Tuesday  new week day
                    api.contacts.add( {
                        msisdn: '+273123',
                        extra : {
                            is_registered: 'true',
                            sms_1: '1',
                            sms_2: '2',
                            sms_3: '1',
                            monitoring_group: 'true',
                            new_week_day: 'T',
                            delivery_class: 'ussd',
                            USSD_number: '*120*8864*1321#'
                        }
                    });

                    //Add a contact
                    api.contacts.add( {
                        msisdn: '+273321',
                        extra : {
                            is_registered: 'true',
                            delivery_class: 'ussd',
                            USSD_number: '*120*8864*1321#'
                        }
                    });

                    //Add a contact
                    api.contacts.add( {
                        msisdn: '+273101',
                        extra : {
                            is_registered: 'true',
                            monitoring_group: 'false',
                            delivery_class: 'ussd',
                            USSD_number: '*120*8864*1321#'
                        }
                    });

                    //Add a contact
                    api.contacts.add( {
                        msisdn: '+273444',
                        extra : {
                            is_registered: 'true',
                            sms_1: '1',
                            sms_2: '2',
                            sms_3: '1',
                            monitoring_group: 'true',
                            week_day: 'M',
                            delivery_class: 'ussd',
                            USSD_number: '*120*8864*1321#'
                        }
                    });
                })
                .setup.config.app({
                    name: 'test_push_app',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    ushahidi_map: 'https://godi.crowdmap.com/api',
                    kv_group: 'tests',
                    channel: "*120*8864*1321#",
                    display_results_date: '4 April, 2014',
                    panel_messages: [0, 1, 4],
                    thermometer_messages: [2, 3],
                    panel_push_start: app.get_date_string(),
                    push_end_date: app.get_date().addDays(7).toISOString(),
                    billing_code: 'incentive',
                    can_push: true
                });
        });

        describe("when the push message trigger is sent",function() {
            beforeEach(function() {
                 tester
                    .setup.user.addr('+273123')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    });
            });

            it("should send the user a question",function() {
                return tester
                    .check.user.state('states:push:start')
                    .run();
            });

            it("should fire a 'total.push.sent' metric",function() {
                return tester
                    .check(function(api){
                        var metrics = api.metrics.stores.test_push_app;
                        assert.deepEqual(metrics['total.push.sent'].values, [1]);
                    })
                    .run();
            });

            it("should save the user's interaction time for that particular push",function() {
                return tester
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.it_panel_round_1,app.get_date_string());
                    })
                    .run();
            });
        });

        describe("when the user does not match when the push message trigger occurs",function() {
            it("should not do anything for that contact",function() {
                return tester
                    .setup.user.addr('+273321')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check.user.state('states:menu')
                    .check.no_reply()
                    .run();
            });
        });

        describe("when the user has monitoring_group set to false",function() {
            it("should not do anything for that contact",function() {
                return tester
                    .setup.user.addr('+273101')
                    .setup.user.state('states:menu')
                    .input({
                        content: null,
                        inbound_push_trigger: true
                    })
                    .check.user.state('states:menu')
                    .check.no_reply()
                    .run();
            });
        });

        describe("when the user's push date is on a tuesday",function() {
            it('should send the user the first push message on the tuesday',function() {
                //check that it is the first push message for that group
                return tester
                    .setup.user.addr('+273123')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    })
                    .check.interaction({
                        state:'states:push:start',
                        reply:'panel_question_1_incentive'
                    })
                    .run();
            });

            describe("when the first push has already been sent",function() {
                beforeEach(function() {
                    app.get_date = function() {
                        var d = new Date('16 April, 2014');
                        d.setHours(0,0,0,0);
                        return d;
                    };
                    tester
                        .setup(function(api){
                            api.contacts.add({
                                msisdn: '+27321',
                                extra: {
                                    is_registered: 'true',
                                    it_panel_round_1: 'some_date',
                                    sms_1: '1',
                                    sms_2: '3',
                                    sms_3: '1',
                                    monitoring_group: 'true',
                                    new_week_day: 'T',
                                    delivery_class: 'ussd',
                                    USSD_number: '*120*8864*1321#'
                                }
                            });
                        })
                        .setup.user.addr('+27321')
                        .input({
                            content:null,
                            inbound_push_trigger:true
                        });
                });

                it('should send the user the 2nd push message `panel_messages[1]` days later sending the message specified by sms_2',function() {
                    return tester
                        .check.interaction({
                            state:'states:push:start',
                            reply:'panel_question_3_incentive'
                        })
                        .run();
                });

                it('should save the interaction time that the message is sent',function() {
                    return tester
                        .check(function(api){
                            var contact = _.find(api.contacts.store,{msisdn:'+27321'});
                            assert.equal(contact.extra.it_panel_round_2,app.get_date_string());
                        })
                        .run();
                });
            });

            describe("when the user submits a reply",function() {
                beforeEach(function() {
                    app.get_date = function() {
                        var d = new Date('16 April, 2014');
                        d.setHours(0,0,0,0);
                        return d;
                    };
                    tester
                        .setup(function(api){
                            api.contacts.add({
                                msisdn: '+27321',
                                extra: {
                                    is_registered: 'true',
                                    it_panel_round_1: 'some_date',
                                    sms_1: '1',
                                    sms_2: '3',
                                    sms_3: '1',
                                    monitoring_group: 'true',
                                    new_week_day: 'T',
                                    delivery_class: 'ussd',
                                    USSD_number: '*120*8864*1321#'
                                }
                            });

                        })
                        .setup.user.addr('+27321')
                        .setup.user.state('states:push:start')
                        .input('1');
                });
                it("should save the reply to push message number 2",function() {
                    return tester
                        .check(function(api){
                            var contact = _.find(api.contacts.store,{msisdn:'+27321'});
                            assert.equal(contact.extra.panel_round_2_reply,'1');
                            assert.equal(contact.extra.it_panel_round_2_reply,app.get_date_string());
                        })
                        .run();
                });

                it("should fire a 'total.push.replies' metric",function() {
                    return tester
                        .check(function(api){
                            var metrics = api.metrics.stores.test_push_app;
                            assert.deepEqual(metrics['total.push.replies'].values, [1]);
                        })
                        .run();
                });
            });

            it("should send the user thermometer message number 1 `thermometer_messages[0]` days later",function() {
                app.get_date = function() {
                    var d = new Date('17 April, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .setup(function(api){
                        api.contacts.add({
                            msisdn: '+27321',
                            extra: {
                                is_registered: 'true',
                                it_panel_round_1: 'some_date',
                                it_panel_round_2: 'some_other_date',
                                sms_1: '1',
                                sms_2: '3',
                                sms_3: '1',
                                monitoring_group: 'true',
                                new_week_day: 'T',
                                delivery_class: 'ussd',
                                USSD_number: '*120*8864*1321#'
                            }
                        });

                    })
                    .setup.user.addr('+27321')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    })
                    .check.interaction({
                        state:'states:push:start',
                        reply:'thermometer_question_1_incentive'
                    })
                    .run();
            });

            it("should save the reply to thermometer message number 1",function() {
                app.get_date = function() {
                    var d = new Date('17 April, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .setup(function(api){
                        api.contacts.add({
                            msisdn: '+27321',
                            extra: {
                                is_registered: 'true',
                                it_panel_round_1: 'some_date',
                                it_panel_round_2: 'some_other_date',
                                sms_1: '1',
                                sms_2: '3',
                                sms_3: '1',
                                monitoring_group: 'true',
                                new_week_day: 'T',
                                delivery_class: 'ussd',
                                USSD_number: '*120*8864*1321#'
                            }
                        });

                    })
                    .setup.user.addr('+27321')
                    .setup.user.state('states:push:start')
                    .input('1')
                    .check(function(api){
                        var contact = _.find(api.contacts.store,{msisdn:'+27321'});
                        assert.equal(contact.extra.pre_thermometer_round_1_reply,'1');
                        assert.equal(contact.extra.it_pre_thermometer_round_1_reply,app.get_date_string());
                    })
                    .run();
            });

            it("should send the user the 3rd push message `panel_messages[2]` days later, and it should be push message 1",function() {
                app.get_date = function() {
                    var d = new Date('19 April, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .setup(function(api){
                        api.contacts.add({
                            msisdn: '+27321',
                            extra: {
                                is_registered: 'true',
                                it_panel_round_1: 'some_date',
                                it_panel_round_2: 'some_other_date',
                                it_pre_thermometer_round_1: 'even_later_date',
                                it_pre_thermometer_round_2: 'even_later_date',
                                sms_1: '1',
                                sms_2: '3',
                                sms_3: '1',
                                monitoring_group: 'true',
                                new_week_day: 'T',
                                delivery_class: 'ussd',
                                USSD_number: '*120*8864*1321#'
                            }
                        });

                    })
                    .setup.user.addr('+27321')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    })
                    .check.interaction({
                        state:'states:push:start',
                        reply:'panel_question_1_incentive'
                    })
                    .run();
            });

            it("should send the user the 2nd thermometer message `thermometer_messages[1]` days layer",function() {
                app.get_date = function() {
                    var d = new Date('18 April, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .setup(function(api){
                        api.contacts.add({
                            msisdn: '+27456',
                            extra: {
                                is_registered: 'true',
                                it_panel_round_1: 'some_date',
                                it_panel_round_2: 'some_other_date',
                                it_pre_thermometer_round_1: 'even_later_date',
                                sms_1: '1',
                                sms_2: '3',
                                sms_3: '1',
                                monitoring_group: 'true',
                                new_week_day: 'T',
                                delivery_class: 'ussd',
                                USSD_number: '*120*8864*1321#'
                            }
                        });

                    })
                    .setup.user.addr('+27456')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    })
                    .check.interaction({
                        state:'states:push:start',
                        reply:'thermometer_question_2_incentive'
                    })
                    .run();
            });

            describe("if they have 'incentive' billing code",function() {
               it("should send them the incentive message for push 1",function() {
                   app.get_date = function() {
                       var d = new Date('15 April, 2014');
                       d.setHours(0,0,0,0);
                       return d;
                   };
                   return tester
                       .setup.config.app({
                           billing_code: 'incentive'
                       })
                       .setup(function(api){
                           api.contacts.add({
                               msisdn: '+27456',
                               extra: {
                                   is_registered: 'true',
                                   sms_1: '1',
                                   sms_2: '3',
                                   sms_3: '1',
                                   monitoring_group: 'true',
                                   new_week_day: 'T',
                                   delivery_class: 'ussd',
                                   USSD_number: '*120*8864*1321#'
                               }
                           });

                       })
                       .setup.user.addr('+27456')
                       .input({
                           content:null,
                           inbound_push_trigger:true
                       })
                       .check.interaction({
                           state:'states:push:start',
                           reply:'panel_question_1_incentive'
                       })
                       .run();
               });
            });

            describe("if they have the 'end_user' billing code",function() {
               it("should send them the 'end_user' msg for push 1",function() {
                   app.get_date = function() {
                       var d = new Date('15 April, 2014');
                       d.setHours(0,0,0,0);
                       return d;
                   };
                   return tester
                       .setup.config.app({
                           billing_code: 'end_user'
                       })
                       .setup(function(api){
                           api.contacts.add({
                               msisdn: '+27456',
                               extra: {
                                   is_registered: 'true',
                                   sms_1: '1',
                                   sms_2: '3',
                                   sms_3: '1',
                                   monitoring_group: 'true',
                                   new_week_day: 'T',
                                   delivery_class: 'ussd',
                                   USSD_number: '*120*8864*1321#'
                               }
                           });

                       })
                       .setup.user.addr('+27456')
                       .input({
                           content:null,
                           inbound_push_trigger:true
                       })
                       .check.interaction({
                           state:'states:push:start',
                           reply:'panel_question_1_end_user'
                       })
                       .run();
               });
            });

            describe("if they have the 'reverse_billed' billing code",function() {
                it("should send them the 'reverse_billed' msg for push 1",function() {
                    app.get_date = function() {
                        var d = new Date('15 April, 2014');
                        d.setHours(0,0,0,0);
                        return d;
                    };
                    return tester
                        .setup.config.app({
                            billing_code: 'reverse_billed'
                        })
                        .setup(function(api){
                            api.contacts.add({
                                msisdn: '+27456',
                                extra: {
                                    is_registered: 'true',
                                    sms_1: '1',
                                    sms_2: '3',
                                    sms_3: '1',
                                    monitoring_group: 'true',
                                    new_week_day: 'T',
                                    delivery_class: 'ussd',
                                    USSD_number: '*120*8864*1321#'
                                }
                            });

                        })
                        .setup.user.addr('+27456')
                        .input({
                            content:null,
                            inbound_push_trigger:true
                        })
                        .check.interaction({
                            state:'states:push:start',
                            reply:'panel_question_1_reverse_billed'
                        })
                        .run();
                });
            });
        });

        describe("when the user replies to the push message",function() {
            beforeEach(function() {
                 tester
                    .setup.user.addr('+273123')
                    .setup.user.state('states:push:start')
                    .input('1');
            });

            it("should save the interaction time and content",function() {
               return tester
                   .check(function(api) {
                       var contact = api.contacts.store[0];
                       assert.equal(contact.extra.panel_round_1_reply,'1');
                       assert.equal(contact.extra.it_panel_round_1_reply,app.get_date_string());
                   })
                   .run();
            });

            it("should send the user to the states:push:endstate",function() {
                return tester
                    .check.interaction({
                        state: 'states:push:end'
                    })
                    .run();
            });
        });

        describe("when the user is on the states:push:end",function() {
            it("should start the user at the start state of the next session",function() {
                return tester
                    .setup.user.state('states:push:end')
                    .start()
                    .check.user.state('states:register')
                    .run();
            });
        });

        describe("when a user has not been allocated a .new_week_day",function() {
            beforeEach(function() {
                app.random = function(begin,end,float) {
                    return 1;
                };
                tester
                    .setup.user.addr('+273444')
                    .setup.config.app({
                        panel_messages: [0, 2, 5],
                        thermometer_messages: [3, 4]
                    })
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    });
            });
            it("should allocated them 'T','Th' or 'S' for new_week_day",function() {
               return tester
                   .check(function(api){
                       var contact = _.find(api.contacts.store,{msisdn:'+273444'});
                       assert.equal(contact.extra.new_week_day,'Th');
                   })
                   .run();
            });

            it("should send push message 1 based on that new_week_day day",function(){
                app.get_date = function() {
                    var d = new Date('17 April, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .check.interaction({
                        state: 'states:push:start',
                        reply: 'panel_question_1_incentive'
                    })
                    .run();
            });

            it("should not send push message 1 before that day",function(){
                app.get_date = function() {
                    var d = new Date('16 April, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .check.no_reply()
                    .run();
            });

            it("should not send push message 1 after that day",function(){
                app.get_date = function() {
                    var d = new Date('18 April, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .check.no_reply()
                    .run();
            });
        });

        describe("if the push message trigger is sent after the push_end_date",function() {
            //Thursday in May after the push_end_date despite being unsent.
            it("should not send a reply",function() {
                app.get_date = function() {
                    var d = new Date('1 May, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .setup.user.addr('+273444')
                    .setup.config.app({
                        panel_messages: [0, 2, 5],
                        thermometer_messages: [3, 4]
                    })
                    .setup.user.state('states:menu')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    })
                    .check.user.state('states:menu')
                    .check.no_reply()
                    .run();
            });
        });

        describe("if the push message trigger is to an app without the 'can_push' flag",function() {
            it("should not send a reply",function() {
                app.get_date = function() {
                    var d = new Date('15 April, 2014');
                    d.setHours(0,0,0,0);
                    return d;
                };
                return tester
                    .setup.user.addr('+273123')
                    .setup.config.app({
                        can_push: false
                    })
                    .setup.user.state('states:menu')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    })
                    .check.user.state('states:menu')
                    .check.no_reply()
                    .run();
            });
        });

        describe("when the push message start date is on a Friday - the 18th",function() {
            beforeEach(function() {
               tester
                   .setup.config.app({
                       panel_push_start: '18 April, 2014'
                   });
            });
            describe("when the 'new_week_day' is a Tuesday",function() {
                it("should send the 1st push message on the 22nd of April",function() {
                    app.get_date = function() {
                        var d = new Date('22 April, 2014');
                        d.setHours(0,0,0,0);
                        return d;
                    };
                    return tester
                        .setup(function(api){
                            api.contacts.add({
                                msisdn: '+27456',
                                extra: {
                                    is_registered: 'true',
                                    sms_1: '1',
                                    sms_2: '3',
                                    sms_3: '1',
                                    monitoring_group: 'true',
                                    new_week_day: 'T',
                                    delivery_class: 'ussd',
                                    USSD_number: '*120*8864*1321#'
                                }
                            });

                        })
                        .setup.user.addr('+27456')
                        .input({
                            content:null,
                            inbound_push_trigger:true
                        })
                        .check.interaction({
                            state:'states:push:start',
                            reply:'panel_question_1_incentive'
                        })
                        .run();
                });
            });
            describe("when the 'new_week_day' is a Thursday",function() {
                it("should send the 1st push message on the 24th of April",function() {
                    app.get_date = function() {
                        var d = new Date('24 April, 2014');
                        d.setHours(0,0,0,0);
                        return d;
                    };
                    return tester
                        .setup(function(api){
                            api.contacts.add({
                                msisdn: '+27456',
                                extra: {
                                    is_registered: 'true',
                                    sms_1: '1',
                                    sms_2: '3',
                                    sms_3: '1',
                                    monitoring_group: 'true',
                                    new_week_day: 'Th',
                                    delivery_class: 'ussd',
                                    USSD_number: '*120*8864*1321#'
                                }
                            });

                        })
                        .setup.user.addr('+27456')
                        .input({
                            content:null,
                            inbound_push_trigger:true
                        })
                        .check.interaction({
                            state:'states:push:start',
                            reply:'panel_question_1_incentive'
                        })
                        .run();
                });
            });
            describe("when the 'new_week_day' is a Saturday",function() {
                it("should send the 1st push message on the 19th of April",function() {
                    app.get_date = function() {
                        var d = new Date('19 April, 2014');
                        d.setHours(0,0,0,0);
                        return d;
                    };
                    return tester
                        .setup(function(api){
                            api.contacts.add({
                                msisdn: '+27456',
                                extra: {
                                    is_registered: 'true',
                                    sms_1: '1',
                                    sms_2: '3',
                                    sms_3: '1',
                                    monitoring_group: 'true',
                                    new_week_day: 'S',
                                    delivery_class: 'ussd',
                                    USSD_number: '*120*8864*1321#'
                                }
                            });

                        })
                        .setup.user.addr('+27456')
                        .input({
                            content:null,
                            inbound_push_trigger:true
                        })
                        .check.interaction({
                            state:'states:push:start',
                            reply:'panel_question_1_incentive'
                        })
                        .run();
                });
            });

            describe("when a user is from a different delivery class than the app",function() {
                it("should not do anything for that contact",function() {
                    return tester
                        .setup(function(api){
                            //Add a contact
                            api.contacts.add( {
                                twitter_handle: '@twitter',
                                extra : {
                                    is_registered: 'true',
                                    delivery_class: 'twitter'
                                }
                            });
                        })
                        .setup.user.addr('@twitter')
                        .setup.user.state('states:menu')
                        .input({
                            content: null,
                            inbound_push_trigger: true
                        })
                        .check.user.state('states:menu')
                        .check.no_reply()
                        .run();
                });
            });

            describe("when a user is from the same delivery class as a ussd app but a different channe",function() {
                it("should not do anything for that contact",function() {
                    return tester
                        .setup(function(api){
                            //Add a contact
                            api.contacts.add( {
                                msisdn: '+2772',
                                extra : {
                                    is_registered: 'true',
                                    delivery_class: 'ussd',
                                    USSD_number: '*120*1234#'
                                }
                            });
                        })
                        .setup.user.addr('+2772')
                        .setup.user.state('states:menu')
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
});