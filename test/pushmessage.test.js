var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures = require('./fixtures');
var ward_treatment = require('./ward_treatment');
var push_message_group = require('./push_message_group');
var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;


describe("app", function() {

    describe.only("Push Message app", function() {
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
                    //Add the resources
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);

                    //Add the configs
                    api.config.store.ward_treatment = ward_treatment();
                    api.config.store.push_message_group = push_message_group();

                    // Add all of the fixtures.
                    fixtures().forEach(api.http.fixtures.add);

                    //Add a contact
                    api.contacts.add( {
                        msisdn: '+273123',
                        extra : {
                            is_registered: 'true',
                            sms_1: '1',
                            sms_2: '2',
                            sms_3: '1',
                            monitoring_group: 'true',
                            new_week_day: 'T'
                        }
                    });

                    //Add a contact
                    api.contacts.add( {
                        msisdn: '+273321',
                        extra : {
                            is_registered: 'true'
                        }
                    });
                })
                .setup.config.app({
                    name: 'test_app',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    ushahidi_map: 'https://godi.crowdmap.com/api',
                    kv_group: 'tests',
                    channel: "*120*8864*1321#",
                    display_results_date: '4 April, 2014',
                    panel_messages: '[0, 1, 2]',
                    thermometer_messages: '[3, 4]',
                    panel_push_start: app.get_date_string(),
                    push_end_date: app.get_date().addDays(1).toISOString(),
                    billing_code: 'incentive'
                });
        });

        describe("when the push message trigger is sent",function() {
            it("should send the user a question",function() {
                return tester
                    .setup.user.addr('+273123')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    })
                    .check.user.state('states:push:start')
                    .run();
            });

            it("should save the user's interaction time for that particular push",function() {
                return tester
                    .setup.user.addr('+273123')
                    .input({
                        content:null,
                        inbound_push_trigger:true
                    })
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
                    .setup(function(api) {
                        api.contacts.add({
                            msisdn: '+27321',
                            extra: {delivery_class: 'sms'}
                        });
                    })
                    .setup.user.addr('+27321')
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

        describe("when the user's push date is on a thursday",function() {
            it('should send the user the first push message on the thursday',function() {
                //check that it is the first push message for that group

            });

            it('should send the user push message number 2 `x` days later',function() {

            });

            it("should save the reply to push message number 2",function() {

            });

            it("should send the user thermometer message number 1 `y` days later",function() {

            });

            it("should save the reply to thermometer message number 1",function() {

            });

            it("should send the user the 3rd push message `w` days later",function() {

            });

            it("should send the user the 2nd thermometer message 'z' days layer",function() {

            });

            describe("if they are in monitoring group 1",function() {
                it("should send them push message 1 for the first panel push",function(){

                });

                it("should send them push message 2 for the 2nd panel push",function() {

                });

                it("should send them push message 1 for the 3rd panel push",function() {

                });
            });

            describe("if they have 'incentive' billing code",function() {
               it("should send them the incentive message for push 1",function() {

               });
            });

            describe("if they have the 'end_user' billing code",function() {
               it("should send them the 'end_user' msg for push 1",function() {

               });
            });

            describe("if they have the 'reverse_billed' billing code",function() {
                it("should send them the 'reverse_billed' msg for push 1",function() {

                });
            });
        });

        describe("when it is the 'whatever' of May after the election",function() {
           it("should send the 3rd thermometer message",function() {

           });
        });

        describe("when it is the next push message day after the election",function() {
           it("should send them the 4th thermometer message",function(){

           });
        });

        describe("when it is the last push message day after the election",function() {
           it("should send them the 5th thermometer message",function() {

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
           it("should allocated them 'T','Th' or 'S' for new_week_day",function() {

           });

            it("should send push message 1 based on those days",function(){

            });
        });
    });
});