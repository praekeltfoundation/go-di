/**
 * Created by Jade on 2014/03/25.
 */
var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures = require('./fixtures');
var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;
var _ = require("lodash");

describe("app", function() {

    describe("VIP Quiz", function() {
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
                .setup.user.lang('en')
                .setup(function(api) {
                    api.resources.add(new DummyMessageStoreResource());
                    api.resources.attach(api);
                })
                .setup.config.app({
                    name: 'test_app',
                    endpoints: {
                        "sms": {"delivery_class": "sms"}
                    },
                    ushahidi_map: 'https://godi.crowdmap.com/api',
                    channel: "*120*8864*1321#"
                })
                .setup(function(api) {
                    // Add all of the fixtures.
                    fixtures().forEach(api.http.fixtures.add);
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

        describe("when 1 is randomly chosen as the next question",function() {
            it("should take them to question 1",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question1';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:menu')
                    .input('2')
                    .check.interaction({
                        state: 'states:quiz:vip:question1',
                        reply: [
                            'During the past year, have you attended a demonstration or protest?',
                            '1. Yes, many',
                            '2. Yes, a few',
                            '3. No',
                            '4. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the first question as 'Yes'", function() {
            it("should save their response the first question as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question1';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_1,"yes_many");
                        assert.equal(contact.extra.it_vip_question_1,app.get_date_string());
                    }).run();
            });
        });

        describe("when 2 is randomly chosen as the next question",function() {
            it("should take them to question 2",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question2';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:question1')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question2',
                        reply: [
                            'Are you registered to vote in the upcoming elections?',
                            '1. Yes',
                            '2. No',
                            '3. Unsure',
                            '4. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the second question as Yes", function() {
            it("should save their response the 2nd question as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question2';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_2,"yes");
                        assert.equal(contact.extra.it_vip_question_2,app.get_date_string());
                    }).run();
            });
        });

        describe("when 3 is randomly chosen as the next question",function() {
            it("should take them to question 3",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question3';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question3',
                        reply: [
                            'How likely is it that you will vote in the upcoming election?',
                            '1. Very likely',
                            '2. Somewhat likely',
                            '3. Somewhat unlikely',
                            '4. Very unlikely',
                            '5. Unsure',
                            '6. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the 3rd question as 'Very Likely'", function() {
            it("should should save their response 'very_likely'  as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question3';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_3,"very_likely");
                        assert.equal(contact.extra.it_vip_question_3,app.get_date_string());
                    }).run();
            });

        });

        describe("when 4 is randomly chosen as the next question",function() {
            it("should take them to question 4",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question4';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question4',
                        reply: [
                            'Which political party do you feel close to?',
                            '1. ANC' ,
                            '2. Agang' ,
                            '3. COPE' ,
                            '4. DA' ,
                            '5. EFF' ,
                            '6. IFP' ,
                            '7. Other' ,
                            "8. I don't feel close to a party",
                            '9. Skip'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered the 4th question as 'ANC'", function() {
            it("should should save their response 'anc' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question4';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_4,"anc");
                        assert.equal(contact.extra.it_vip_question_4,app.get_date_string());
                    }).run();
            });
        });

        describe("when 5 is randomly chosen as the next question",function() {
            it("should take them to question 5",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question5';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question5',
                        reply: [
                            "During the past year, has your community had demonstrations or protests?" ,
                            "1. Yes, several times" ,
                            "2. Yes, once or twice" ,
                            "3. No" ,
                            "4. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 5th question as 'Yes several times'", function() {
            it("should should save their response 'yes_several' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question5';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_5,"yes_several");
                        assert.equal(contact.extra.it_vip_question_5,app.get_date_string());
                    }).run();
            });
        });

        describe("when 6 is randomly chosen as the next question",function() {
            it("should take them to question 6",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question6';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question6',
                        reply: [
                            "If your community has had demonstrations or protests in the last year, were they violent?",
                            "1. Yes",
                            "2. No",
                            "3. Not applicable",
                            "4. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 6th question as 'Yes'", function() {
            it("should should save their response 'yes' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question6';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_6,"yes");
                        assert.equal(contact.extra.it_vip_question_6,app.get_date_string());
                    }).run();
            });
        });

        describe("when 7 is randomly chosen as the next question",function() {
            it("should take them to question 7",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question7';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question7',
                        reply: [
                            "How easy is it for your neighbors to find out if you voted?" ,
                            "1. Very easy" ,
                            "2. Somewhat easy" ,
                            "3. Somewhat difficult" ,
                            "4. Very difficult" ,
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 7th question as 'Very easy'", function() {
            it("should should save their response 'very_easy' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question7';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_7,"very_easy");
                        assert.equal(contact.extra.it_vip_question_7,app.get_date_string());
                    }).run();
            });
        });

        describe("when 8 is randomly chosen as the next question",function() {
            it("should take them to question 8",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question8';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question8',
                        reply: [
                            "People in my neighborhood look down on those who do not vote:" ,
                            "1. Strongly agree" ,
                            "2. Somewhat agree" ,
                            "3. Somewhat disagree" ,
                            "4. Strongly disagree" ,
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 8th question as 'Strongly agree'", function() {
            it("should should save their response 'strongly_agree' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question8';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_8,"strongly_agree");
                        assert.equal(contact.extra.it_vip_question_8,app.get_date_string());
                    }).run();
            });
        });

        describe("when 9 is randomly chosen as the next question",function() {
            it("should take them to question 9",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question9';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question9',
                        reply: [
                            "How do you rate the overall performance of President Zuma?" ,
                            "1. Excellent" ,
                            "2. Good" ,
                            "3. Just Fair" ,
                            "4. Poor" ,
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 9th question as 'Excellent'", function() {
            it("should should save their response 'excellent' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question9';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_9,"excellent");
                        assert.equal(contact.extra.it_vip_question_9,app.get_date_string());
                    }).run();
            });
        });

        describe("when 10 is randomly chosen as the next question",function() {
            it("should take them to question 10",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question10';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question10',
                        reply: [
                            "How do you rate the overall performance of your local government councillor?" ,
                            "1. Excellent" ,
                            "2. Good" ,
                            "3. Just Fair" ,
                            "4. Poor" ,
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 10th question as 'Good'", function() {
            it("should should save their response 'good' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question10';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_10,"excellent");
                        assert.equal(contact.extra.it_vip_question_10,app.get_date_string());
                    }).run();
            });
        });

        describe("when 11 is randomly chosen as the next question",function() {
            it("should take them to question 11",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question11';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question11',
                        reply: [
                            "Which party has contacted you the most during this election campaign?" ,
                            "1. None, I have not been contacted" ,
                            "2. ANC" ,
                            "3. Agang" ,
                            "4. COPE" ,
                            "5. DA" ,
                            "6. EFF" ,
                            "7. IFP" ,
                            "8. Other" ,
                            "9. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 11th question as 'ANC'", function() {
            it("should should save their response 'anc' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question11';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_11,"none");
                        assert.equal(contact.extra.it_vip_question_11,app.get_date_string());
                    }).run();
            });
        });

        describe("when 12 is randomly chosen as the next question",function() {
            it("should take them to question 12",function(){
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question12';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:question12',
                        reply: [
                            "During the past two weeks, have you attended a campaign rally?" ,
                            "1. Yes" ,
                            "2. No" ,
                            "3. Skip"
                        ].join("\n")
                    }).run();
            });
        });

        describe("when the user has answered the 12th question as 'Yes'", function() {
            it("should should save their response 'yes' as well as interaction time",function() {
                app.quizzes.vip.random_quiz_name = function(n) {
                    return 'states:quiz:vip:question12';
                };
                return tester
                    .setup.user.addr("+273123")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api){
                        var contact = api.contacts.store[0];
                        assert.equal(contact.extra.vip_question_12,"yes");
                        assert.equal(contact.extra.it_vip_question_12,app.get_date_string());
                    }).run();
            });
        });


        var get_question_number = function(state) {
            return parseInt(state.state.name.split("question").pop());
        };


        var get_question_states = function(n) {
            var states = {};
            for (var i=0; i < n; i++) {
                states['states:quiz:vip:question'+(i+1)] = '1';
            }
            return states;
        };

        describe("when the user has selected to do the quiz from the menu", function() {
            it("should take them to a random unanswered question",function() {
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273101',
                            extra : {
                                is_registered: 'true',
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273101")
                    .setup.user.state('states:menu')
                    .input('2')
                    .check.user.state(function(state){
                        var question_num = get_question_number(state) ;
                        assert.equal(0 < question_num && question_num <= 12,true);
                    }).run();
            });

            it("should NOT fire a 'vip.quiz.complete' metric",function() {
                return tester
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.deepEqual(_.isUndefined(metrics['vip.quiz.complete']), true);
                    }).run();
            });
        });
        describe("when the user has answered the continue question as 'Continue'", function() {
            it("should take them to a random unanswered question",function() {
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user({
                        answers: get_question_states(4)
                    })
                    .setup.user.state({
                        name: 'states:quiz:vip:begin',
                        creator_opts: {
                            from_continue: true
                        }
                    })
                    .input('1')
                    .check.user.state(function(state){
                        var question_num = get_question_number(state);
                        assert.notEqual(state.name,'states:quiz:vip:continue');
                        assert.equal(question_num > 4 && question_num <= 12 ,true);
                    }).run();
            });
        });

        describe("when the user has answered a question", function() {
            describe("if it was the last question",function() {
                beforeEach(function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user({
                            state: 'states:quiz:vip:begin',
                            answers: get_question_states(11)
                        })
                        .input('1');
                });

                it("should return them to the quiz end function",function() {
                    return tester
                        .check.interaction({
                            state: 'states:quiz:end',
                            reply: [
                                'Thanks, u have answered all the questions in this section.',
                                '1. Main Menu'
                            ].join('\n')
                        }).run();
                });

                it("should fire a 'vip.quiz.complete' metric",function() {
                    return tester
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_app;
                            assert.deepEqual(metrics['vip.quiz.complete'].values, [1]);
                        }).run();
                });

                it("should set the 'vip_complete' field of contact",function() {
                    return tester
                        .check(function(api) {
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.vip_complete,app.get_date_string());
                        }).run();
                });

            });

            it("should fire a 'questions' metric",function() {
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.deepEqual(metrics['vip.total.questions'].values, [1]);
                    }).run();
            });


            it("should NOT fire a 'vip.quiz.complete' metric",function() {
                return tester
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.equal(_.isUndefined(metrics['vip.quiz.complete']), true);
                    }).run();
            });

            it("should NOT set the 'vip_complete' field of contact",function() {
                return tester
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(_.isUndefined(contact.extra.vip_complete),true);
                    }).run();
            });

            it("should increment 'questions' kv store",function() {
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user.state('states:quiz:vip:begin')
                    .input('1')
                    .check(function(api) {
                        assert.equal(api.kv.store['test_app.vip.total.questions'], 1);
                    }).run();
            });
        });

        describe("when the user has answered their 4th question", function() {
            it("should ask them if they want to continue",function() {
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user({
                        state: 'states:quiz:vip:begin',
                        answers: get_question_states(3)
                    })
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:continue',
                        reply: [
                            'Would you like to continue answering questions? There are 12 in total.',
                            '1. Continue',
                            '2. Main Menu'
                        ].join('\n')
                    }).run();
            });
        });

        describe("when the user has answered their 8th question", function() {
            it("should ask them if they want to continue",function() {
                return tester
                    .setup( function(api) {
                        api.contacts.add( {
                            msisdn: '+273465',
                            extra : {
                                is_registered: 'true',
                                register_sms_sent: 'true'
                            }
                        });
                    })
                    .setup.user.addr("+273465")
                    .setup.user({
                        state: 'states:quiz:vip:begin',
                        answers: get_question_states(7)
                    })
                    .input('1')
                    .check.interaction({
                        state: 'states:quiz:vip:continue',
                        reply: [
                            'Would you like to continue answering questions? There are 12 in total.',
                            '1. Continue',
                            '2. Main Menu'
                        ].join('\n')
                    }).run();
            });
        });

        describe("if the user has answered questions 1 to 7", function() {
            it("should take the user to question in[8,12]",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user({
                        state: 'states:quiz:vip:begin',
                        answers: get_question_states(7)
                    })
                    .check.user.state(function(state){
                        var question_num = get_question_number(state);
                        assert.equal(question_num > 7,true);
                    }).run();
            });
        });

    });
});