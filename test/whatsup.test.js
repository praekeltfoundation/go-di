/**
 * Created by Jade on 2014/03/27.
 */
var vumigo = require('vumigo_v02');
var AppTester = vumigo.AppTester;
var assert = require('assert');
var fixtures = require('./fixtures');
var _ = require('lodash');

var messagestore = require('./messagestore');
var DummyMessageStoreResource = messagestore.DummyMessageStoreResource;

describe("app", function() {

    describe("Whatsup Quiz", function() {
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

        /**
         * Does setup to test the named question.
         * */
        function setup_question_test(state_name) {
            app.quizzes.whatsup.random_quiz_name = function(n) {
                return state_name;
            };
            tester
                .setup.user.state('states:quiz:whatsup:begin')
                .setup.user.addr("+273123");
        }

        var whatsup_states = [
            'states:quiz:whatsup:satisfied_democracy',
            'states:quiz:whatsup:frequency_campaign_rallies',
            'states:quiz:whatsup:frequency_party_agents',
            'states:quiz:whatsup:frequency_intimidation',
            'states:quiz:whatsup:trust_anc',
            'states:quiz:whatsup:trust_da',
            'states:quiz:whatsup:trust_eff',
            'states:quiz:whatsup:food_to_eat',
            'states:quiz:whatsup:violence_for_just_cause',
            'states:quiz:whatsup:not_voting'
        ];

        /**
         * Returns a n subset of the questions to be used as the answered questions.
         * */
        var get_answered_whatsup_quiz_states = function(n) {
            var states = whatsup_states.slice(0,n);
            var answers = {};
            _.forEach(states,function(value) {
                answers[value] = '1';
            });
            return answers;
        };

        /**
         * Returns a n subset of the questions to be used as the unanswered questions.
         * */
        var get_unanswered_whatsup_quiz_states = function(n) {
            var states = whatsup_states.slice(n,whatsup_states.length);
            var answers = {};
            _.forEach(states,function(value) {
                answers[value] = '1';
            });
            return answers;
        };

        describe("when the user selects to do the 'What's up' quiz",function() {
            it("should take them to a random whatsup question",function() {
                return tester
                    .setup.user.addr("+273123")
                    .setup.user({
                        state: 'states:quiz:whatsup:begin',
                        answers: get_answered_whatsup_quiz_states(0)
                    })
                    .check.user.state(function(state){
                        var unanswered = get_unanswered_whatsup_quiz_states(0);
                        assert.equal(_.has(unanswered,state.name),true);
                    }).run();
            });

            it("should NOT fire a 'whatsup.quiz.complete' metric",function() {
                return tester
                    .check(function(api) {
                        var metrics = api.metrics.stores.test_app;
                        assert.equal(_.isUndefined(metrics['whatsup.quiz.complete']), true);
                    }).run();
            });

            it("should NOT set the 'whatsup_complete' field of contact",function() {
                return tester
                    .check(function(api) {
                        var contact = api.contacts.store[0];
                        assert.equal(_.isUndefined(contact.extra.whatsup_complete),true);
                    }).run();
            });

            describe("when the user has already answered a random question",function() {
                it("should take them to another random whatsup question",function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user({
                            state: 'states:quiz:whatsup:begin',
                            answers: get_answered_whatsup_quiz_states(1)
                        })
                        .check.user.state(function(state){
                            var unanswered = get_unanswered_whatsup_quiz_states(1);
                            assert.equal(_.has(unanswered,state.name),true);
                        }).run();
                });
            });

            describe("when the user has already answered 4 random questions",function() {
                it("should ask them if they want to continue",function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user({
                            state: 'states:quiz:whatsup:begin',
                            answers: get_answered_whatsup_quiz_states(4)
                        })
                        .check.interaction({
                            state:'states:quiz:whatsup:continue'
                        }).run();
                });
            });

            describe("when the user has already answered 8 random questions",function() {
                it("should ask them if they want to continue",function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user({
                            state: 'states:quiz:whatsup:begin',
                            answers: get_answered_whatsup_quiz_states(8)
                        })
                        .check.interaction({
                            state:'states:quiz:whatsup:continue'
                        }).run();
                });
            });

            describe("when the user has answered all whatsup questions",function() {
                beforeEach(function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user({
                            state: 'states:quiz:whatsup:begin',
                            answers: get_answered_whatsup_quiz_states(9)
                        })
                        .input('1');
                });

                it("should take them to the end state",function() {
                    return tester
                        .check.interaction({
                            state:'states:quiz:end',
                            reply: [
                                'Thanks, u have answered all the questions in this section.',
                                '1. Main Menu'
                            ].join('\n')
                        }).run();
                });

                it("should fire a 'whatsup.quiz.complete' metric",function() {
                    return tester
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_app;
                            assert.deepEqual(metrics['whatsup.quiz.complete'].values, [1]);
                        }).run();
                });

                it("should fire a 'whatsup.total.questions' metric",function() {
                    return tester
                        .check(function(api) {
                            var metrics = api.metrics.stores.test_app;
                            assert.deepEqual(metrics['whatsup.total.questions'].values, [1]);
                        }).run();
                });
            });

            describe("when 'Satisfied Democracy' is randomly chosen as the next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:whatsup:satisfied_democracy');
                });
                it("should take them to question 'Satisfied Democracy'",function(){
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:whatsup:satisfied_democracy',
                            reply: [
                                "How satisfied are you with the way democracy works in South Africa?" ,
                                "1. Very satisfied" ,
                                "2. Somewhat satisfied" ,
                                "3. Dissatisfied" ,
                                "4. Very dissatisfied" ,
                                "5. Skip"
                            ].join("\n")
                        }).run();
                });

                describe("when the user has answered the what's up 'Satisfied Democracy'  as 'Very satisfied'", function() {
                    it("should should save their response 'very_satisfied' as well as interaction time",function() {
                        return tester
                            .input('1')
                            .check(function(api){
                                var contact = api.contacts.store[0];
                                assert.equal(contact.extra.whatsup_question_satisfied_democracy,"very_satisfied");
                                assert.equal(contact.extra.it_whatsup_question_satisfied_democracy,app.get_date_string());
                            }).run();
                    });
                });
            });

            describe("when the user has answered the previous question", function() {
                it("should take them to a new random question",function() {
                    return tester
                        .setup.user.addr("+273123")
                        .setup.user({
                            state: 'states:quiz:whatsup:satisfied_democracy',
                            answers: get_answered_whatsup_quiz_states(1)
                        })
                        .input('1')
                        .check.user.state(function(state){
                            var unanswered = get_unanswered_whatsup_quiz_states(1);
                            assert.equal(_.has(unanswered,state.name),true);
                        }).run();
                });
            });

            describe("when 'Frequency Campaign Rallies' is randomly chosen as the next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:whatsup:frequency_campaign_rallies');
                });
                it("should take them to question 'Frequency Campaign Rallies'",function(){
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:whatsup:frequency_campaign_rallies',
                            reply: [
                                "During the past two weeks, how frequently have campaign rallies occurred in your community?",
                                "1. Often",
                                "2. Several times",
                                "3. Once or twice",
                                "4. Never",
                                "5. Skip"
                            ].join("\n")
                        }).run();
                });

                describe("when the user has answered the question as 'Often'", function() {
                    it("should should save their response 'often' as well as interaction time",function() {
                        return tester
                            .input('1')
                            .check(function(api){
                                var contact = api.contacts.store[0];
                                assert.equal(contact.extra.whatsup_question_frequency_campaign_rallies,"often");
                                assert.equal(contact.extra.it_whatsup_question_frequency_campaign_rallies,app.get_date_string());
                            }).run();
                    });
                });
            });

            describe("when 'Frequency Party Agents' is randomly chosen as the next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:whatsup:frequency_party_agents');
                });
                it("should take them to question 'Frequency Party Agents'",function(){
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:whatsup:frequency_party_agents',
                            reply: [
                                "During the past two weeks, how frequently have party agents gone door to door in your community to mobilize voters?",
                                "1. Often",
                                "2. Several times",
                                "3. Once or twice",
                                "4. Never",
                                "5. Skip"
                            ].join("\n")
                        }).run();
                });

                describe("when the user has answered the question as 'Often'", function() {
                    it("should should save their response 'often' as well as interaction time",function() {
                        return tester
                            .input('1')
                            .check(function(api){
                                var contact = api.contacts.store[0];
                                assert.equal(contact.extra.whatsup_question_frequency_party_agents,"often");
                                assert.equal(contact.extra.it_whatsup_question_frequency_party_agents,app.get_date_string());
                            }).run();
                    });
                });
            });

            describe("when 'Frequency Intimidation' is randomly chosen as the next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:whatsup:frequency_intimidation');
                });
                it("should take them to question 'Frequency Intimidation'",function(){
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:whatsup:frequency_intimidation',
                            reply: [
                                "During the past two weeks, how frequently have party agents intimidated voters in your community?",
                                "1. Often",
                                "2. Several times",
                                "3. Once or twice",
                                "4. Never",
                                "5. Skip"
                            ].join("\n")
                        }).run();
                });

                describe("when the user has answered the question as 'Often'", function() {
                    it("should should save their response 'often' as well as interaction time",function() {
                        return tester
                            .input('1')
                            .check(function(api){
                                var contact = api.contacts.store[0];
                                assert.equal(contact.extra.whatsup_question_frequency_intimidation,"often");
                                assert.equal(contact.extra.it_whatsup_question_frequency_intimidation,app.get_date_string());
                            }).run();
                    });
                });
            });

            describe("when 'Trust ANC' is randomly chosen as the next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:whatsup:trust_anc');
                });
                it("should take them to question 'Trust ANC'",function(){
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:whatsup:trust_anc',
                            reply: [
                                "How much do you trust the ANC?" ,
                                "1. A lot" ,
                                "2. Some" ,
                                "3. Not much" ,
                                "4. Not at all" ,
                                "5. No opinion" ,
                                "6. Skip"
                            ].join("\n")
                        }).run();
                });

                describe("when the user has answered the question as 'A lot'", function() {
                    it("should should save their response 'a_lot' as well as interaction time",function() {
                        return tester
                            .input('1')
                            .check(function(api){
                                var contact = api.contacts.store[0];
                                assert.equal(contact.extra.whatsup_question_trust_anc,"a_lot");
                                assert.equal(contact.extra.it_whatsup_question_trust_anc,app.get_date_string());
                            }).run();
                    });
                });
            });

            describe("when 'Trust DA' is randomly chosen as the next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:whatsup:trust_da');
                });
                it("should take them to question 'Trust DA'",function(){
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:whatsup:trust_da',
                            reply: [
                                "How much do you trust the Democratic Alliance (DA)?" ,
                                "1. A lot" ,
                                "2. Some" ,
                                "3. Not much" ,
                                "4. Not at all" ,
                                "5. No opinion" ,
                                "6. Skip"
                            ].join("\n")
                        }).run();
                });

                describe("when the user has answered the question as 'A lot'", function() {
                    it("should should save their response 'a_lot' as well as interaction time",function() {
                        return tester
                            .input('1')
                            .check(function(api){
                                var contact = api.contacts.store[0];
                                assert.equal(contact.extra.whatsup_question_trust_da,"a_lot");
                                assert.equal(contact.extra.it_whatsup_question_trust_da,app.get_date_string());
                            }).run();
                    });
                });
            });

            describe("when 'Trust EFF' is randomly chosen as the next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:whatsup:trust_eff');
                });
                it("should take them to question 'Trust EFF'",function(){
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:whatsup:trust_eff',
                            reply: [
                                "How much do you trust the Economic Freedom Fighters (EFF)?" ,
                                "1. A lot" ,
                                "2. Some" ,
                                "3. Not much" ,
                                "4. Not at all" ,
                                "5. No opinion" ,
                                "6. Skip"
                            ].join("\n")
                        }).run();
                });

                describe("when the user has answered the question as 'A lot'", function() {
                    it("should should save their response 'a_lot' as well as interaction time",function() {
                        return tester
                            .input('1')
                            .check(function(api){
                                var contact = api.contacts.store[0];
                                assert.equal(contact.extra.whatsup_question_trust_eff,"a_lot");
                                assert.equal(contact.extra.it_whatsup_question_trust_eff,app.get_date_string());
                            }).run();
                    });
                });
            });

            describe("when 'Food to Eat' is randomly chosen as the next question",function() {
                beforeEach(function() {
                    setup_question_test('states:quiz:whatsup:food_to_eat');
                });
                it("should take them to question 'Food to Eat'",function(){
                    return tester
                        .start()
                        .check.interaction({
                            state: 'states:quiz:whatsup:food_to_eat',
                            reply: [
                                "During the past year, how often have you or anyone in your family gone without enough food to eat?" ,
                                "1. Never" ,
                                "2. Once or twice" ,
                                "3. Sometimes" ,
                                "4. Many times" ,
                                "5. Always" ,
                                "6. Skip"
                            ].join("\n")
                        }).run();
                });

                describe("when the user has answered the question as 'Never'", function() {
                    it("should should save their response 'never' as well as interaction time",function() {
                        return tester
                            .input('1')
                            .check(function(api){
                                var contact = api.contacts.store[0];
                                assert.equal(contact.extra.whatsup_question_food_to_eat,"never");
                                assert.equal(contact.extra.it_whatsup_question_food_to_eat,app.get_date_string());
                            }).run();
                    });
                });
            });
        });

        describe("when 'Food to Eat' is randomly chosen as the next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:whatsup:food_to_eat');
            });
            it("should take them to question 'Food to Eat'",function(){
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:whatsup:food_to_eat',
                        reply: [
                            "During the past year, how often have you or anyone in your family gone without enough food to eat?" ,
                            "1. Never" ,
                            "2. Once or twice" ,
                            "3. Sometimes" ,
                            "4. Many times" ,
                            "5. Always" ,
                            "6. Skip"
                        ].join("\n")
                    }).run();
            });

            describe("when the user has answered the question as 'Never'", function() {
                it("should should save their response 'never' as well as interaction time",function() {
                    return tester
                        .input('1')
                        .check(function(api){
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.whatsup_question_food_to_eat,"never");
                            assert.equal(contact.extra.it_whatsup_question_food_to_eat,app.get_date_string());
                        }).run();
                });
            });
        });

        describe("when 'Violence for Just Cause' is randomly chosen as the next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:whatsup:violence_for_just_cause');
            });
            it("should take them to question 'Violence for Just Cause'",function(){
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:whatsup:violence_for_just_cause',
                        reply: [
                            "In South Africa, it is sometimes necessary to use violence for a just cause:",
                            "1. Strongly agree" ,
                            "2. Somewhat agree" ,
                            "3. Somewhat disagree",
                            "4. Strongly disagree",
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });

            describe("when the user has answered the question as 'Strongly agree'", function() {
                it("should should save their response 'strongly_agree' as well as interaction time",function() {
                    return tester
                        .input('1')
                        .check(function(api){
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.whatsup_question_violence_for_just_cause,"strongly_agree");
                            assert.equal(contact.extra.it_whatsup_question_violence_for_just_cause,app.get_date_string());
                        }).run();
                });
            });
        });

        describe("when 'Not voting' is randomly chosen as the next question",function() {
            beforeEach(function() {
                setup_question_test('states:quiz:whatsup:not_voting');
            });
            it("should take them to question 'Not voting'",function(){
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:quiz:whatsup:not_voting',
                        reply: [
                            "Sometimes not voting is the best way to express your political preferences:",
                            "1. Strongly agree",
                            "2. Somewhat agree",
                            "3. Somewhat disagree",
                            "4. Strongly disagree",
                            "5. Skip"
                        ].join("\n")
                    }).run();
            });

            describe("when the user has answered the question as 'Strongly agree'", function() {
                it("should should save their response 'strongly_agree' as well as interaction time",function() {
                    return tester
                        .input('1')
                        .check(function(api){
                            var contact = api.contacts.store[0];
                            assert.equal(contact.extra.whatsup_question_not_voting,"strongly_agree");
                            assert.equal(contact.extra.it_whatsup_question_not_voting,app.get_date_string());
                        }).run();
                });
            });
        });
    });
});