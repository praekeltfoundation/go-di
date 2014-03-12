var vumigo = require('vumigo_v02');
var app = require('../lib/app');
var GoDiApp = app.GoDiApp;
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures = require('./fixtures');

describe("app", function() {

    describe("GoDiApp", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new GoDiApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
            .setup.char_limit(180);

            app.get_date = function() {
                var d = new Date();
                d.setHours(0,0,0,0);
                return d.toISOString();
            };

            tester
                .setup.config.app({
                    name: 'test_app'
                })
                .setup(function(api) {
                    // Add all of the fixtures.
                    fixtures().forEach(api.http.fixtures.add);
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
                            .setup.user.addr('+273123')
                            .setup(function(api) {
                                api.contacts.add( {
                                    msisdn: '+273123',
                                    extra : {
                                        is_registered: 'true',
                                        ward: '1234'
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
                    .setup.user.state('states:registration:engagement')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.engagement_question,"yes");
                    }).run();
            });

            it("should save their interaction time",function() {
                return tester
                    .setup.user.state('states:registration:engagement')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.it_engagement_question,app.get_date());
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
                   .setup.user.state('states:registration:engagement')
                   .input('2')
                   .check(function(api){
                       var contact = api.contacts.store[0];
                       assert.equal(contact.extra.engagement_question,"no_vote_anyway");
                   }).run();
           }) ;
        });

        describe("when the user selects accept and join",function() {
            it("should register the user using contacts",function() {

                return tester
                    .setup.user.state('states:registration:tandc')
                    .input('1')
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.is_registered,"true");
                    }).run();

            });

            it("should take the user to a thank you message", function() {
                return tester.setup.user.state('states:registration:tandc')
                    .input('1')
                    .check.interaction({
                        state:'states:registration:accept',
                        reply: 'Thanks for volunteering to be a citizen reporter for the 2014 elections! Get started by answering questions to earn airtime!'
                    }).run();
            });
        });

        describe("when the user selects choose to read the terms and conditions",function() {
            it("should set user registration to false.",function() {
                return tester
                    .setup.user.state('states:registration:tandc')
                    .input('2')
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.is_registered,"false");
                    }).run();

            });


            it("should take the user to the t & c summary page", function() {
                return tester.setup.user.state('states:registration:tandc')
                    .input('2')
                    .check.interaction({
                        state:'states:registration:read',
                        reply: 'Terms and Conditions'
                    }).run();
            });
        });

        describe("when the user selects choose to quit",function() {
            it("should set user registration to false.",function() {
                return tester
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
                        state:'states:registration:end',
                        reply: 'Thank you for your time. Remember, you can always reconsider becoming a citizen reporter.'
                    }).run();
            });
        });

        describe("when a user has inputed their address",function() {
            it("should take them to the menu page",function() {
                return tester.setup.user.state('states:address')
                    .input('21 conduit street')
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

            it("should get the appropriate electoral ward",function() {
                return tester
                    .setup.user.state('states:address')
                    .input('21 conduit street')
                    .check(function(api){
                        var req = api.http.requests[0];
                        var url = req.url;
                        var param = req.params.param_list[0];
                        assert.equal(url,'http://wards.code4sa.org/');
                        assert.equal(param.value,'21 conduit street');
                    }).run();
            });

            it("should save the electoral ward",function() {
                return tester.setup.user.state('states:address')
                    .input('21 conduit street')
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.ward,"79400094");
                        assert.equal(contact.extra.it_ward,app.get_date());
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
                return tester.setup.user.state("states:menu")
                    .input('5')
                    .check.interaction({
                        state: 'states:end',
                        reply: 'Bye.'
                    }).run();
            });
        });

        describe("when the user has selected to do the quiz from the menu", function() {
           it("should take them to the first question",function() {
               return tester.setup.user.state('states:menu')
                   .input('1')
                   .check.interaction({
                       state: 'states:quiz:tier2:question1',
                       reply: [
                            'Are you registered to vote?',
                           '1. Yes',
                           '2. No',
                           '3. I am u18 and not able to register yet'
                       ].join('\n')
                   }).run();
           });
        });

        describe("when the user has answered the first question as 'Yes'", function() {
            it("should should save their response the first question as well as interaction time",function() {
                return tester.setup.user.state('states:quiz:tier2:question1')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question1,"yes");
                        assert.equal(contact.extra.it_question1,app.get_date());
                    }).run();
            });

            it("should take them to second question",function() {
                return tester.setup.user.state('states:quiz:tier2:question1')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:tier2:question2',
                        reply: [
                            'How old are you?',
                            '1. under 18',
                            '2. 19-20',
                            '3. 21-30',
                            '4. 31-40',
                            '5. 41-50',
                            '6. 51-60',
                            '7. 61-70',
                            '8. 71-80',
                            '9. 81-90',
                            '10. 90+'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the first question as 'No'", function() {
            it("should should save their response the first question as well as interaction time",function() {
                return tester.setup.user.state('states:quiz:tier2:question1')
                    .input('2')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question1,"no");
                        assert.equal(contact.extra.it_question1,app.get_date());
                    }).run();
            });
        });

        describe("when the user has answered the first question as 'under 18'", function() {
            it("should should save their response the first question as well as interaction time",function() {
                return tester.setup.user.state('states:quiz:tier2:question1')
                    .input('3')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question1,"u18");
                        assert.equal(contact.extra.it_question1,app.get_date());
                    }).run();
            });
        });

        describe("when the user has answered the second question as under 18", function() {
            it("should should save their response the 2nd question as well as interaction time",function() {
                return tester
                    .setup.user.state('states:quiz:tier2:question2')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question2,"u18");
                        assert.equal(contact.extra.it_question2,app.get_date());
                    }).run();
            });

            it("should take them to 3rd question",function() {
                return tester.setup.user.state('states:quiz:tier2:question2')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:tier2:question3',
                        reply: [
                            'How likely is it that you will vote in the upcoming election?',
                            '1. highly likely',
                            '2. likely',
                            '3. not likely',
                            '4. highly unlikely'
                        ].join('\n')
                    }).run();
            });

        });

        describe("when the user has answered the second question as 19-20", function() {
            it("should should save their response the 2nd question as well as interaction time",function() {
                return tester
                    .setup.user.state('states:quiz:tier2:question2')
                    .input('2')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question2,"19-20");
                        assert.equal(contact.extra.it_question2,app.get_date());
                    }).run();
            });
        });

        describe("when the user has answered the second question as 21-30", function() {
            it("should should save their response the 2nd question as well as interaction time",function() {
                return tester
                    .setup.user.state('states:quiz:tier2:question2')
                    .input('3')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question2,"21-30");
                        assert.equal(contact.extra.it_question2,app.get_date());
                    }).run();
            });
        });

        describe("when the user has answered the 3rd question as 'Highly Likely", function() {
            it("should should save their response 'highly_likely'  as well as interaction time",function() {
                return tester
                    .setup.user.state('states:quiz:tier2:question3')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question3,"highly_likely");
                        assert.equal(contact.extra.it_question3,app.get_date());
                    }).run();
            });

            it("should take them to 4th question",function() {
                return tester.setup.user.state('states:quiz:tier2:question3')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:tier2:question4',
                        reply: [
                            'What education level do you have?',
                            '1. Less than a matric',
                            '2. matric',
                            '3. diploma',
                            '4. degree',
                            '5. post-grad degree/diploma'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the 3rd question", function() {
            it("should should save their response 'likely' as well as interaction time",function() {
                return tester
                    .setup.user.state('states:quiz:tier2:question3')
                    .input('2')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question3,"likely");
                        assert.equal(contact.extra.it_question3,app.get_date());
                    }).run();
            });
        });

        describe("when the user has answered the 4th question as 'Less than a matric'", function() {
            it("should should save their response 'less_than_matric' as well as interaction time",function() {
                return tester
                    .setup.user.state('states:quiz:tier2:question4')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.question4,"less_than_matric");
                        assert.equal(contact.extra.it_question4,app.get_date());
                    }).run();
            });

            it("should take them back to the menu",function() {
                return tester.setup.user.state('states:quiz:tier2:question4')
                    .input('1')
                    .check.interaction({
                        state: 'states:menu'
                    }).run();
            });
        });


    });
});
