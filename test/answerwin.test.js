var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var _ = require("lodash");

describe("app", function() {
    describe("Answer & Win Quiz", function() {

        var app;
        var tester;

        beforeEach(function() {
            app = new di.app.GoDiApp();

            tester = new AppTester(app,{
                api: {http: {default_encoding: 'json'}}
            })
            .setup.char_limit(180)
            .setup.user.lang('en');

            app.get_date = function() {
                var d = new Date();
                d.setHours(0,0,0,0);
                return d;
            };

            tester
                .setup.config.app({
                    name: 'test_app',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    channel: "*120*8864*1321#"
                })
                .setup(function(api) {
                    api.contacts.add( {
                        msisdn: '+273123',
                        extra : {
                            is_registered: 'true',
                            register_sms_sent: 'true'
                        }
                    });
                });
        });

        var answerwin_states = [
            'states:quiz:answerwin:gender',
            'states:quiz:answerwin:age',
            'states:quiz:answerwin:2009election',
            'states:quiz:answerwin:race'
        ];

        /**
         * Returns a n subset of the questions to be used as the answered questions.
         * */
        var get_answered_answerwin_quiz_states = function(n) {
            var states = answerwin_states.slice(0,n);
            var answers = {};
            _.forEach(states,function(value) {
                answers[value] = '1';
            });
            return answers;
        };

        describe("when the user chooses to do the Answer & Win quiz from the main menu",function() {
            describe("if they have not done the quiz before",function() {
                it("should take them to the gender question of the quiz",function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user.state('states:menu')
                        .input('1')
                        .check.interaction({
                            state: 'states:quiz:answerwin:gender',
                            reply: [
                                'I am...',
                                '1. Male',
                                '2. Female'
                            ].join('\n')
                        }).run();
                });
            });

            describe("if they have done the quiz before",function() {
                it("should take them to the end of the quiz state",function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user({
                            state: 'states:menu',
                            answers: get_answered_answerwin_quiz_states(4)
                        })
                        .input('1')
                        .check.interaction({
                            state: 'states:quiz:end'
                        }).run();
                });
            });
        });

        describe("when the user has answered the gender question",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:answerwin:gender')
                    .input('1');
            });

            it("should save their answer to the gender question",function() {
                return tester
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.answerwin_question_gender,"male");
                        assert.equal(contact.extra.it_answerwin_question_gender,app.get_date_string());
                    });
            });

            it("should take them to the age question",function() {
                return tester
                    .check.interaction({
                        state: 'states:quiz:answerwin:age',
                        reply: [
                            'How old are you?',
                            '1. u14',
                            '2. 15-19',
                            '3. 20-29',
                            '4. 30-39',
                            '5. 40-49',
                            '6. 50+'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the age question",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:answerwin:age');
            });

            it("should save their answer to the age question",function() {
                return tester
                    .input("1")
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.answerwin_question_age,"u14");
                        assert.equal(contact.extra.it_answerwin_question_age,app.get_date_string());
                    });
            });

            it("should take them to the 2009 election question ",function() {
                return tester
                    .input("1")
                    .check.interaction({
                        state: 'states:quiz:answerwin:2009election',
                        reply: [
                            'Did you vote in the 2009 election?',
                            '1. Yes',
                            '2. No, could not/was not registered',
                            '3. No, did not want to',
                            '4. No, other',
                            '5. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the 2009 election question",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:answerwin:2009election')
                    .input('1');
            });

            it("should save their answer to the  2009 election question",function() {
                return tester
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.answerwin_question_2009election,"yes");
                        assert.equal(contact.extra.it_answerwin_question_2009election,app.get_date_string());
                    });
            });

            it("should take them to the race question",function() {
                return tester
                    .check.interaction({
                        state: 'states:quiz:answerwin:race',
                        reply: [
                            'I am...',
                            '1. Black African',
                            '2. Coloured',
                            '3. Indian/Asian',
                            '4. White',
                            '5. Other',
                            '6. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the 2009 election question",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:answerwin:2009election')
                    .input('1');
            });

            it("should save their answer to the  2009 election question",function() {
                return tester
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.answerwin_question_2009election,"yes");
                        assert.equal(contact.extra.it_answerwin_question_2009election,app.get_date_string());
                    });
            });

            it("should take them to the race question",function() {
                return tester
                    .check.interaction({
                        state: 'states:quiz:answerwin:race',
                        reply: [
                            'I am...',
                            '1. Black African',
                            '2. Coloured',
                            '3. Indian/Asian',
                            '4. White',
                            '5. Other',
                            '6. Skip'
                        ].join('\n')
                    }).run();
            });

            it("should NOT fire a 'answerwin.quiz.complete' metric",function() {
                return tester
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.equal(_.isUndefined(metrics['answerwin.quiz.complete']), true);
                    }).run();
            });

            it("should NOT set the 'answerwin_complete' field of contact",function() {
                return tester
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(_.isUndefined(contact.extra.answerwin_complete),true);
                    }).run();
            });
        });

        describe("when the user has answered the race question",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user({
                        answers: {
                            'states:quiz:answerwin:2009election': '1',
                            'states:quiz:answerwin:age': '1',
                            'states:quiz:answerwin:gender': '1'
                        }
                    })
                    .setup.user.state('states:quiz:answerwin:race')
                    .input('1');
            });

            it("should save their answer to the race question",function() {
                return tester
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.answerwin_question_race,"black_african");
                        assert.equal(contact.extra.it_answerwin_question_race,app.get_date_string());
                    });
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

            it("should fire a 'answerwin.total.questions' metric",function() {
                return tester
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.deepEqual(metrics['answerwin.total.questions'].values, [1]);
                    }).run();
            });

            it("should fire a 'answerwin.quiz.complete' metric",function() {
                return tester
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.deepEqual(metrics['answerwin.quiz.complete'].values, [1]);
                    }).run();
            });

            it("should set the 'answerwin_complete' field of contact",function() {
                return tester
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.answerwin_complete,app.get_date_string());
                    }).run();
            });
        });

        describe("when the user has selected to go to the main menu",function() {
            beforeEach(function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:answerwin:thankyou')
                    .input('1');
            });

            it("should take them to the main menu",function() {
                return tester
                    .check.interaction({
                        state: 'states:menu'
                    }).run();
            });
        });
    });
});