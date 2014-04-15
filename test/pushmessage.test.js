var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures = require('./fixtures');
var ward_treatment = require('./ward_treatment');
var push_message_group = require('./push_message_group');
var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;


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

        describe("when the user replies to the push message",function() {

            beforeEach(function() {
                 tester
                    .setup.user.addr('+273123')
                    .setup.user.state('states:push:start')
                    .input('1')
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
    });
});