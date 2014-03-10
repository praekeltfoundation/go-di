var vumigo = require('vumigo_v02');
var app = require('../lib/app');
var GoDiApp = app.GoDiApp;
var AppTester = vumigo.AppTester;
var assert = require('assert');

describe("app", function() {

    describe("GoDiApp", function() {
        var app;
        var tester;
        
        beforeEach(function() {
            app = new GoDiApp();

            tester = new AppTester(app);

            tester.setup.config.app({
                name: 'test_app'
            });
        });

        describe("when the user starts a session",function() {
            describe('if they are registered',function() {
                it("should tell take them to a quiz",function() {
                    return tester.setup.user.addr('+273123')
                        .setup(function(api) {
                            api.contacts.add( {
                                msisdn: '+273123',
                                extra : {
                                    is_registered: 'true'
                                }
                            });
                        }).start().check.interaction({
                            states:'states:location'
                        })
                        .run();
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
                        reply:['Are you excited about the election?','1. Yes','2. No'].join('\n')
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
                        assert.equal(contact.extra.question1,"yes");
                    }).run();
            });
        });

        describe("when the user selects 'no' for the engagement question",function() {

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

           it("should save their answer as 'no'",function() {
               return tester
                   .setup.user.state('states:registration:engagement')
                   .input('2')
                   .check(function(api){
                       var contact = api.contacts.store[0];
                       assert.equal(contact.extra.question1,"no");
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


    });
});
