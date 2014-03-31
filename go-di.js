var di = {};

di.ushahidi = function() {
    /**
     * Created by Jade on 2014/03/16.
     */
    var _ = require('lodash');
    var vumigo = require('vumigo_v02');
    var querystring = require("querystring");
    var HttpApi = vumigo.http.api.HttpApi;

    var UshahidiApi = HttpApi.extend(function(self, im, opts) {

        opts = _.defaults(opts || {}, {headers: {}});
        opts.headers['Content-Type'] = ['application/x-www-form-urlencoded'];

        HttpApi.call(self, im, opts);

        self.decode_response_body = function(body) {
            return JSON.parse(body);
        };

        self.encode_request_data = function(data) {
            return querystring.encode(data);
        };

        self.get_formatted_date = function(date) {
            var month = date.getMonth() + 1;
            var day = date.getDate();
            var year =  date.getFullYear();
            return ([
                (month <10) ? "0" + month  : month ,
                (day < 10) ? "0" + day     : day,
                year
            ].join('/'));
        };

        self.post_report = function(url, opts) {
            var task = opts.task;
            var incident = opts.incident;
            var place = opts.place;
            var date = opts.date;
            return self.post(url, {
                "data": {
                    "task": task,
                    "incident_title": incident.title,
                    "incident_description": incident.description,
                    "incident_category": incident.category,
                    "incident_date":self.get_formatted_date(date),
                    "incident_hour": date.getHours() % 12,
                    "incident_minute": date.getMinutes(),
                    "incident_ampm": (date.getHours() < 12 ? 'am': 'pm'),
                    "latitude": place.geometry.location.lat ,
                    "longitude": place.geometry.location.lng ,
                    "location_name": place.formatted_address
                }
            });
        };

        self.ushahidi_get = function(url, opts) {
            return self.get(url,{
                "data": {
                    "task": opts.task
                }
            });
        };

        self.get_reports = function(url) {
            return self.ushahidi_get(url,"report");
        };

        self.get_categories = function(url) {
            return self.ushahidi_get(url,"categories");
        };
    });

    return {
        UshahidiApi: UshahidiApi
    };
}();

di.quiz = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var AppStates = vumigo.app.AppStates;

    var QuizStates = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);

        self.continue_interval = opts.continue_interval;
        self.name = opts.name;
        self.questions = [];

        self.is_complete = function() {
            return self.count_answered() === self.questions.length;
        };

        self.count_answered = function() {
            var unanswered = self.get_unanswered_questions();
            return self.questions.length - unanswered.length;
        };

        self.count_unanswered = function() {
            var unanswered = self.get_unanswered_questions();
            return unanswered.length;
        };

        self.construct_state_name = function(name) {
            var state = [
                'states:quiz',
                self.name,
                name
            ].join(':');
            return state;
        };

        self.add_question = function(name,state) {
            var question = self.construct_state_name(name);
            self.questions.push(question);
            app.states.add(question,state);
        };

        self.add_continue = function(name,state) {
            self.continue = self.construct_state_name(name);
            app.states.add(self.continue,state);
        };

        self.add_next = function(name,state) {
            self.next = self.construct_state_name(name);
            app.states.add(self.next,state);
        };

        self.add_begin = function(name) {
            self.begin = [
                'states:quiz',
                self.name,
                name
            ].join(':');
            /*
             * This needs to be part of the app for testing.
             * My test cases wont initialize to it otherwise.
             * */
            app.states.add(self.begin,function(name,opts) {
                return self.create.random(opts);
            });
        };

        self.get_next_quiz_state = function(from_continue) {
            return {
                name:self.begin,
                creator_opts: {
                    from_continue: from_continue || false
                }
            };
        };

        self.random = function(n) {
            return _.random(n-1);
        };

        self.get_unanswered_questions = function() {
            return _.filter(self.questions,function(state) {
                return !_.has(app.im.user.answers,state);
            });
        };

        self.random_quiz_name = function() {
            var unanswered = self.get_unanswered_questions();
            var index = self.random(unanswered.length);
            return unanswered[index] || self.next ;
        };

        //If an interval of the questions save for last and first question
        //If not from a continue state.
        self.create_continue = function(opts) {
            var count = self.count_answered();
            return (
                count > 0
                    && count < self.questions.length
                    && (count % self.continue_interval) === 0
                    && !opts.from_continue
                );
        };

        self.create.random = function(opts) {
            if (self.create_continue(opts)) {
                return app.states.create(self.continue,opts);
            }
            return app.states.create(self.random_quiz_name(), opts);
        };

        self.incr_quiz_metrics = function() {
            //Increment total.questions: kv store + metric
            var promise =  app.incr_kv(self.name+'.total.questions').then(function(result) {
                return app.im.metrics.fire.last(self.name+'.total.questions',result.value);
            });

            //Check if all questions have been answered and increment total quiz's completed
            if (self.is_complete()) {
                promise = promise.then(function(result) {
                    return app.im.metrics.fire.inc(self.name+'.quiz.complete');
                });
            }
            return promise;
        };

        self.next_quiz = function(n,content) {
            return self
                .answer(n,content.value)
                .then(function() {
                    return self.set_quiz_completion();
                })
                .then(function() {
                    return self.incr_quiz_metrics();
                })
                .then(function() {
                    return self.get_next_quiz_state();
                });
        };

        self.answer = function(n,value) {
            var contact_field = [
                self.name,
                "question",
                n
            ].join('_');
            app.contact.extra[contact_field] = value;
            app.contact.extra["it_"+contact_field] = app.get_date_string();
            return app.im.contacts.save(app.contact);
        };

        self.set_quiz_completion = function(n,value) {
            if (self.is_complete()) {
                app.contact.extra[self.name+'_complete'] = app.get_date_string();
            }
            return app.im.contacts.save(app.contact);
        };
    });

    return {
        QuizStates: QuizStates
    };
}();

/**
 * Created by Jade on 2014/03/27.
 */
di.quiz.vip = function() {
    var QuizStates = di.quiz.QuizStates;
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;

    var VipQuiz = QuizStates.extend(function(self,app) {
        QuizStates.call(self,app,{
            name:'vip',
            continue_interval: 4
        });
        var $ = app.$;

        self.add_question('question1',function(name) {
            return new ChoiceState(name, {
                question: $('During the past year, have you attended a demonstration or protest?'),
                choices: [
                    new Choice('yes_many',$('Yes, many')),
                    new Choice('yes_few',$('Yes, a few')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(1,content);
                }
            });
        });

        self.add_question('question2',function(name) {
            return new ChoiceState(name, {
                question: $('Are you registered to vote in the upcoming elections?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('unsure',$('Unsure')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(2,content);
                }
            });
        });

        self.add_question('question3',function(name) {
            return new ChoiceState(name, {
                question: $('How likely is it that you will vote in the upcoming election?'),
                choices: [
                    new Choice('very_likely',$('Very likely')),
                    new Choice('somewhat_likely',$('Somewhat likely')),
                    new Choice('somewhat_unlikely',$('Somewhat unlikely')),
                    new Choice('very_unlikely',$('Very unlikely')),
                    new Choice('unsure',$('Unsure')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(3,content);
                }
            });
        });

        self.add_question('question4',function(name) {
            return new ChoiceState(name,{
                question: $('Which political party do you feel close to?'),
                choices: [
                    new Choice('anc',$('ANC')),
                    new Choice('agang',$('Agang')),
                    new Choice('cope',$('COPE')),
                    new Choice('da',$('DA')),
                    new Choice('eff',$('EFF')),
                    new Choice('ifp',$('IFP')),
                    new Choice('other',$('Other')),
                    new Choice('none',$("I don't feel close to a party")),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(4,content);
                }
            });
        });

        self.add_continue('continue',function(name) {
            return new MenuState(name,{
                question: $('Would you like to continue answering questions? There are 12 in total.'),
                choices: [
                    new Choice(self.get_next_quiz_state(true),$('Continue')),
                    new Choice('states:menu',$('Main Menu'))
                ]
            });
        });

        self.add_next('end',function(name) {
            return app.states.create("states:menu");
        });

        self.add_question('question5',function(name) {
            return new ChoiceState(name, {
                question: $('During the past year, has your community had demonstrations or protests?'),
                choices: [
                    new Choice('yes_several',$('Yes, several times')),
                    new Choice('yes_once_twice',$('Yes, once or twice')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(5,content);
                }
            });
        });

        self.add_question('question6',function(name) {
            return new ChoiceState(name, {
                question: $('If your community has had demonstrations or protests in the last year, were they violent?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('na',$('Not applicable')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(6,content);
                }
            });
        });

        self.add_question('question7',function(name) {
            return new ChoiceState(name, {
                question: $("How easy is it for your neighbors to find out if you voted?"),
                choices: [
                    new Choice('very_easy',$('Very easy')),
                    new Choice('somewhat_easy',$('Somewhat easy')),
                    new Choice('somewhat_difficult',$('Somewhat difficult')),
                    new Choice('very_difficult',$('Very difficult')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(7,content);
                }
            });
        });

        self.add_question('question8',function(name) {
            return new ChoiceState(name, {
                question: $("People in my neighborhood look down on those who do not vote:"),
                choices: [
                    new Choice('strongly_agree',$('Strongly agree')),
                    new Choice('somewhat_agree',$('Somewhat agree')),
                    new Choice('somewhat_disagree',$('Somewhat disagree')),
                    new Choice('strongly_disagree',$('Strongly disagree')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(8,content);
                }
            });
        });

        self.add_question('question9',function(name) {
            return new ChoiceState(name, {
                question: $("How do you rate the overall performance of President Zuma?"),
                choices: [
                    new Choice('excellent',$('Excellent')),
                    new Choice('good',$('Good')),
                    new Choice('just_fair',$('Just Fair')),
                    new Choice('poor',$('Poor')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(9,content);
                }
            });
        });

        self.add_question('question10',function(name) {
            return new ChoiceState(name, {
                question: $("How do you rate the overall performance of your local government councillor?"),
                choices: [
                    new Choice('excellent',$('Excellent')),
                    new Choice('good',$('Good')),
                    new Choice('just_fair',$('Just Fair')),
                    new Choice('poor',$('Poor')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(10,content);
                }
            });
        });

        self.add_question('question11',function(name) {
            return new ChoiceState(name, {
                question: $("Which party has contacted you the most during this election campaign?"),
                choices: [
                    new Choice('none',$('None, I have not been contacted')),
                    new Choice('anc',$('ANC')),
                    new Choice('agang',$('Agang')),
                    new Choice('cope',$('COPE')),
                    new Choice('da',$('DA')),
                    new Choice('eff',$('EFF')),
                    new Choice('ifp',$('IFP')),
                    new Choice('other',$('Other')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(11,content);
                }
            });
        });

        self.add_question('question12',function(name) {
            return new ChoiceState(name, {
                question: $("During the past two weeks, have you attended a campaign rally?"),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(12,content);
                }
            });
        });

        self.add_begin('begin');
    });

    return {
        VipQuiz: VipQuiz
    };
}();

di.quiz.answerwin = function() {
    var QuizStates = di.quiz.QuizStates;
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var MenuState = vumigo.states.MenuState;

    var AnswerWinQuiz = QuizStates.extend(function(self,app) {
        QuizStates.call(self,app,{
            name:'answerwin'
        });

        self.next_quiz = function(n,content,next) {
            return self
                .answer(n,content.value)
                .then(function() {
                    return self.set_quiz_completion();
                })
                .then(function() {
                    return self.incr_quiz_metrics();
                })
                .then(function() {
                    return self.construct_state_name(next);
                });
        };

        var $ = app.$;

        app.states.add("states:quiz:answerwin:begin",function(name) {
            return app.states.create(self.construct_state_name('gender'));
        });

        self.add_question('gender',function(name) {
            return new ChoiceState(name, {
                question: $('I am...'),
                choices: [
                    new Choice('male',$('Male')),
                    new Choice('female',$('Female')),
                ],
                next: function(choice) {
                    return self.next_quiz('gender',choice,'age');
                }
            });
        });

        self.add_question('age',function(name) {
            return new PaginatedChoiceState(name, {
                question: $('How old are you?'),
                choices: [
                    new Choice('u14',$('u14')),
                    new Choice('15-19',$('15-19')),
                    new Choice('20-29',$('20-29')),
                    new Choice('30-39',$('30-39')),
                    new Choice('40-49',$('40-49')),
                    new Choice('50-59',$('50-59')),
                    new Choice('60-69',$('60-69')),
                    new Choice('70-79',$('70-79')),
                    new Choice('80+',$('80+'))
                ],
                characters_per_page: 160,
                options_per_page: 5,
                next: function(choice) {
                    return self.next_quiz('age',choice,'2009election');
                }
            });
        });

        self.add_question('2009election',function(name) {
            return new ChoiceState(name, {
                question: $('Did you vote in the 2009 election?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no_not_registered',$('No, could not/was not registered')),
                    new Choice('no_didnt_want_to',$('No, did not want to')),
                    new Choice('no_other',$('No, other')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(choice) {
                    return self.next_quiz('2009election',choice,'race');
                }
            });
        });

        self.add_question('race',function(name) {
            return new ChoiceState(name, {
                question: $('I am...'),
                choices: [
                    new Choice('black_african',$('Black African')),
                    new Choice('coloured',$('Coloured')),
                    new Choice('indian_or_asian',$('Indian/Asian')),
                    new Choice('white',$('White')),
                    new Choice('other',$('Other')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(choice) {
                    return self.next_quiz('race',choice,'thankyou');
                }
            });
        });

        app.states.add(self.construct_state_name('thankyou'),function(name) {
            return new MenuState(name, {
                question: $('Thank you for telling VIP a bit more about yourself! Your airtime will be sent to you shortly!'),
                choices: [
                    new Choice('states:menu',$('Main Menu'))
                ]
            });
        });


    });
    return {
        AnswerWinQuiz: AnswerWinQuiz
    };
}();
/**
 * Created by Jade on 2014/03/27.
 */
di.quiz.whatsup = function() {
    var QuizStates = di.quiz.QuizStates;
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;

    var WhatsupQuiz = QuizStates.extend(function(self,app) {
        QuizStates.call(self,app,{
            name:'whatsup',
            continue_interval: 4
        });
        var $ = app.$;

        self.add_question('satisfied_democracy',function(name) {
            return new ChoiceState(name, {
                question: $("How satisfied are you with the way democracy works in South Africa?"),
                choices: [
                    new Choice('very_satisfied',$('Very satisfied')),
                    new Choice('somewhat_satisfied',$('Somewhat satisfied')),
                    new Choice('dissatisfied',$('Dissatisfied')),
                    new Choice('very_dissatisfied',$('Very dissatisfied')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('satisfied_democracy',content);
                }
            });
        });

        self.add_question('frequency_campaign_rallies',function(name) {
            return new ChoiceState(name, {
                question: $("During the past two weeks, how frequently have campaign rallies occurred in your community?"),
                choices: [
                    new Choice('often',$('Often')),
                    new Choice('several_times',$('Several times')),
                    new Choice('once_or_twice',$('Once or twice')),
                    new Choice('never',$('Never')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('frequency_campaign_rallies',content);
                }
            });
        });

        self.add_question('frequency_party_agents',function(name) {
            return new ChoiceState(name, {
                question: $("During the past two weeks, how frequently have party agents gone door to door in your community to mobilize voters?"),
                choices: [
                    new Choice('often',$('Often')),
                    new Choice('several_times',$('Several times')),
                    new Choice('once_or_twice',$('Once or twice')),
                    new Choice('never',$('Never')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('frequency_party_agents',content);
                }
            });
        });

        self.add_question('frequency_intimidation',function(name) {
            return new ChoiceState(name, {
                question: $("During the past two weeks, how frequently have party agents intimidated voters in your community?"),
                choices: [
                    new Choice('often',$('Often')),
                    new Choice('serveral_times',$('Several times')),
                    new Choice('once_or_twice',$('Once or twice')),
                    new Choice('never',$('Never')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('frequency_intimidation',content);
                }
            });
        });

        self.add_question('trust_anc',function(name) {
            return new ChoiceState(name, {
                question: $("How much do you trust the ANC?"),
                choices: [
                    new Choice('a_lot',$('A lot')),
                    new Choice('some',$('Some')),
                    new Choice('not_much',$('Not much')),
                    new Choice('not_at_all',$('Not at all')),
                    new Choice('no_opinion',$('No opinion')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('trust_anc',content);
                }
            });
        });

        self.add_question('trust_da',function(name) {
            return new ChoiceState(name, {
                question: $("How much do you trust the Democratic Alliance (DA)?"),
                choices: [
                    new Choice('a_lot',$('A lot')),
                    new Choice('some',$('Some')),
                    new Choice('not_much',$('Not much')),
                    new Choice('not_at_all',$('Not at all')),
                    new Choice('no_opinion',$('No opinion')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('trust_da',content);
                }
            });
        });

        self.add_question('trust_eff',function(name) {
            return new ChoiceState(name, {
                question: $("How much do you trust the Economic Freedom Fighters (EFF)?"),
                choices: [
                    new Choice('a_lot',$('A lot')),
                    new Choice('some',$('Some')),
                    new Choice('not_much',$('Not much')),
                    new Choice('not_at_all',$('Not at all')),
                    new Choice('no_opinion',$('No opinion')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('trust_eff',content);
                }
            });
        });

        self.add_question('food_to_eat',function(name) {
            return new ChoiceState(name, {
                question: $("During the past year, how often have you or anyone in your family gone without enough food to eat?"),
                choices: [
                    new Choice('never',$('Never')),
                    new Choice('once_or_twice',$('Once or twice')),
                    new Choice('sometimes',$('Sometimes')),
                    new Choice('many_times',$('Many times')),
                    new Choice('always',$('Always')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('food_to_eat',content);
                }
            });
        });

        self.add_question('violence_for_just_cause',function(name) {
            return new ChoiceState(name, {
                question: $("In South Africa, it is sometimes necessary to use violence for a just cause:"),
                choices: [
                    new Choice('strongly_agree',$('Strongly agree')),
                    new Choice('somewhat_agree',$('Somewhat agree')),
                    new Choice('somewhat_disagree',$('Somewhat disagree')),
                    new Choice('strongly_disagree',$('Strongly disagree')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('violence_for_just_cause',content);
                }
            });
        });

        self.add_question('not_voting',function(name) {
            return new ChoiceState(name, {
                question: $("Sometimes not voting is the best way to express your political preferences:"),
                choices: [
                    new Choice('strongly_agree',$('Strongly agree')),
                    new Choice('somewhat_agree',$('Somewhat agree')),
                    new Choice('somewhat_disagree',$('Somewhat disagree')),
                    new Choice('strongly_disagree',$('Strongly disagree')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('not_voting',content);
                }
            });
        });

        self.add_continue('continue',function(name) {
            return new MenuState(name,{
                question: $('Would you like to continue answering questions? There are 10 in total.'),
                choices: [
                    new Choice(self.get_next_quiz_state(true),$('Continue')),
                    new Choice('states:menu',$('Main Menu'))
                ]
            });
        });

        self.add_next('end',function(name) {
            return app.states.create("states:menu");
        });

        self.add_begin('begin');
    });

    return {
        WhatsupQuiz: WhatsupQuiz
    };
}();

di.app = function() {
    var vumigo = require('vumigo_v02');
    var Q = require('q');
    var _ = require('lodash');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var BookletState = vumigo.states.BookletState;
    var EndState = vumigo.states.EndState;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText;
    var JsonApi = vumigo.http.api.JsonApi;
    var UshahidiApi = di.ushahidi.UshahidiApi;
    var VipQuiz = di.quiz.vip.VipQuiz;
    var WhatsupQuiz = di.quiz.whatsup.WhatsupQuiz;
    var AnswerWinQuiz = di.quiz.answerwin.AnswerWinQuiz;

    var GoDiApp = App.extend(function(self) {
        App.call(self, 'states:start');
        var $ = self.$;

        self.quizzes = {};
        self.quizzes.vip = new VipQuiz(self);
        self.quizzes.whatsup = new WhatsupQuiz(self);
        self.quizzes.answerwin = new AnswerWinQuiz(self);

        /*
         * To abstract which random class is being used
         * */
        self.random = function(begin,end,float) {
            return _.random(begin,end,float);
        };

        self.week_day_code = ['M','T','W','Th','F','S','Su'];

        self.random_standard = function() {
            if (self.random(0,1,true) < 0.2) {
                return 'GS1';
            } else {
                return 'GS2';
            }
        };

        self.random_geographical = function(ward,ward_treatment) {

            var category = ward_treatment[ward];
            var geographical_group="";
            //get geographical group
            switch (category) {
                case "Standard": geographical_group = self.random_standard(); break;
                case "Control": geographical_group = 'GC'; break;
                case "High Intensity": geographical_group = 'GH'; break;
            }
            return geographical_group;
        };

        self.random_monitoring = function(geographical_group,push_message_group) {

            if (geographical_group === "GH"|| geographical_group === "GS2") {
                //Choose day from 0 to 6 inclusive
                var week_day = self.week_day_code[self.random(0,6)];
                var push_group = self.random(1,30);
                var per_sms_group = push_message_group[push_group];
                return {
                    monitoring_group:'true',
                    week_day: week_day,
                    push_group: push_group.toString(),
                    sms_1: per_sms_group.sms_1,
                    sms_2: per_sms_group.sms_2,
                    sms_3: per_sms_group.sms_3
                };
            }
            return {
                monitoring_group:'false',
                week_day: '',
                push_group: '',
                sms_1: '',
                sms_2:'',
                sms_3: ''
            };
        };

        self.set_contact_group = function(ward,ward_treatment, push_message_group) {
            //Random group setup.
            var geographical = self.random_geographical(ward,ward_treatment);
            var monitoring = self.random_monitoring(geographical,push_message_group);
            self.contact.extra.geographical_group = geographical;
            self.contact.extra.monitoring_group = monitoring.monitoring_group;
            self.contact.extra.week_day = monitoring.week_day;
            self.contact.extra.push_group = monitoring.push_group;
            self.contact.extra.sms_1 = monitoring.sms_1;
            self.contact.extra.sms_2 = monitoring.sms_2;
            self.contact.extra.sms_3 = monitoring.sms_3;
        };

        self.get_date = function() {
            return new Date();
        };

        self.get_date_string = function() {
            return self.get_date().toISOString();
        };

        self.is_delivery_class = function(delivery_class) {
            return self.im.config.delivery_class == delivery_class;
        };

        self.is_registered = function() {
            return (typeof self.contact.extra.is_registered !== 'undefined'
                            && (self.contact.extra.is_registered === "true"));
        };

        self.is = function(boolean) {
            //If is is not undefined and boolean is true
            return (!_.isUndefined(boolean) && (boolean==='true' || boolean===true));
        };

        self.exists = function(extra) {
            return typeof extra !== 'undefined';
        };

        self.get_group_config = function() {
              return Q.all([
                      self.im.sandbox_config.get('ward_treatment',{
                          json:true
                      }),
                      self.im.sandbox_config.get('push_message_group',{
                          json:true
                      })
                  ]);
        };

        self.init = function() {
            self.http = new JsonApi(self.im);
            self.ushahidi = new UshahidiApi(self.im);

            self.im.on('session:new',function() {
                return Q.all([
                    self.im.metrics.fire.inc("sum.visits"),
                    self.im.metrics.fire.avg("avg.visits",1),
                    self.get_unique_users()
                ]);
            });

            self.im.on('session:close', function(e) {
                if (!self.should_send_dialback(e)) { return; }

                return _.isUndefined(self.contact.extra.ward)
                    ? self.send_ward_dialback()
                    : self.send_noward_dialback();
            });

            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };

        self.should_send_dialback = function(e) {
            return e.user_terminated
                && self.is_delivery_class('ussd')
                && self.is_registered()
                && !self.is(self.contact.extra.register_sms_sent);
        };

        self.send_ward_dialback = function() {
            return self.im.outbound
                .send_to_user({
                    endpoint: 'sms',
                    content: $([
                        "Hello VIP!2 begin we need ur voting ward.",
                        "Dial *55555# & give us ur home address & we'll work it out.",
                        "This will be kept private, only ur voting ward will be stored &u will be anonymous."
                    ].join(' '))
                })
                .then(function() {
                    self.contact.extra.register_sms_sent = 'true';
                    return self.im.contacts.save(self.contact);
                });
        };

        self.send_noward_dialback = function() {
            return self.im.outbound
                .send_to_user({
                    endpoint: 'sms',
                    content: $([
                        'Thanks for volunteering to be a citizen reporter for the 2014 elections!',
                        'Get started by answering questions or reporting election activity!',
                        'Dial back in to *5555# to begin!'
                    ].join(' '))
                }).then(function() {
                    self.contact.extra.register_sms_sent = 'true';
                    return self.im.contacts.save(self.contact);
                });
        };

        /*
        * When users are registered:
        * set as registered.
        * a list of unanswered questions is generated.
        * kv + metrics are fired
        * */
        self.register = function() {
            self.contact.extra.is_registered = 'true';

            //Fire metrics + increment kv store
            return self
                .incr_kv('registered.participants')
                .then(function(result) {
                    return self.im.metrics.fire.last('registered.participants',result.value);
                });
        };

        self.get_unique_users = function() {
            return self.im
                .api_request('messagestore.count_inbound_uniques',{})
                .then(function(result) {
                    return self.im.metrics.fire.last('unique.participants',result.count);
                });
        };

        self.states.add('states:start',function(name) {
            if (!self.is_registered()) {
                return self.states.create('states:register');
            } else if (!self.exists(self.contact.extra.ward)) {
                return self.states.create('states:address');
            } else {
                return self.states.create('states:menu');
            }
        });

        self.states.add('states:register', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome to Voting is Power! Start by choosing your language:'),
                choices: [
                    new Choice('en',$('English')),
                    new Choice('af',$('Afrikaans')),
                    new Choice('zu',$('Zulu')),
                    new Choice('xh',$('Xhosa')),
                    new Choice('so',$('Sotho'))
                ],
                next: function(choice) {
                    return self.im.user.set_lang(choice.value).then(function() {
                        return 'states:registration:engagement';
                    });
                }
            });
        });

        self.states.add('states:registration:engagement', function(name) {
           return new ChoiceState(name, {
               question: $("It's election time! Do u think ur vote matters?"),
               choices: [
                   new Choice("yes",$("YES every vote matters")),
                   new Choice("no_vote_anyway",$("NO but I'll vote anyway")),
                   new Choice("no_not_vote",$("NO so I'm NOT voting")),
                   new Choice("not_registered",$("I'm NOT REGISTERED to vote")),
                   new Choice("too_young",$("I'm TOO YOUNG to vote"))
               ],
               next: function(choice) {
                   self.contact.extra.engagement_question = choice.value;
                   self.contact.extra.it_engagement_question = self.get_date_string();

                   return self.im.contacts.save(self.contact).then(function() {
                       return 'states:registration:tandc';
                   });
               }
           });
        });

        self.states.add('states:registration:tandc', function(name) {
            return new ChoiceState(name, {
                question: $("Please accept the terms and conditions to get started."),
                choices: [ new Choice('accept','Accept & Join'),
                            new Choice('read','Read t&c'),
                            new Choice('quit','Quit')],
                next: function(choice) {
                    return {
                        accept: 'states:registration:accept',
                        read: 'states:registration:read',
                        quit: 'states:registration:end'
                    } [choice.value];
                }
            });
        });

        //Registers the user and saves then redirects to the address state.
        self.states.add('states:registration:accept',function(name){
            return self.register()
                .then(function(result) {
                    return self.im.contacts.save(self.contact).then(function() {
                        return self.states.create('states:address');
                    });
                });
        });

        self.get_terms = function() {
            return [
                $("University of California San Diego requests ur consent to act as a research subject for " +
                    "improving electoral performance through citizen engagement in SA."),
                $("Study provides evaluation on how 2 use marketing &recruitment strategies,with mobile technology " +
                    "to improve how elections r monitored by citizen volunteers."),
                $("If u participate,we will ask questions about urself&ur observations of the elections.U will b " +
                    "anonymous.Ur answers will be kept confidential&won't b shared."),
                $("To view full T&Cs please visit www.yal.mobi/vip.")
            ];
        };

        self.states.add('states:registration:read',function(name) {
            var terms = self.get_terms();
            self.contact.extra.is_registered = 'false';
            return self.im.contacts.save(self.contact).then(function() {
                return new BookletState(name, {
                    pages: terms.length,
                    page_text: function(n) {return terms[n];},
                    buttons: {"1": -1, "2": +1, "3": "exit"},
                    footer_text: $("1. Prev 2. Next 3. Exit"),
                    next: 'states:registration:tandc'
                });
            });
        });

        self.states.add('states:registration:end',function(name){
            self.contact.extra.is_registered = 'false';
            return self.im.contacts.save(self.contact).then(function() {
               return new EndState(name,{
                   text: $('Thank you for your time. Remember, you can always reconsider becoming a citizen reporter.'),
                   next: 'states:start'
               }) ;
            });
        });

        self.states.add('states:address',function(name){
            var error = $("Oops! Something went wrong! Please try again.");
            var response;

            return new FreeText(name,{
                question: $([
                        "Thanks 4 joining!2 begin we need ur voting ward.",
                        "Reply with ur home address & we'll work it out.",
                        "This will be kept private, only ur voting ward will be stored",
                        "&u will be anonymous."
                    ].join(" ")
                ),
                check: function(content) {
                    return self
                        .http.get('http://wards.code4sa.org/',{
                            params: {
                                address: content,
                                database: 'vd_2014'
                            }

                        })
                        .then(function(resp) {
                            response = resp;

                            if (typeof resp.data.error  !== 'undefined') {
                                return error;
                            }
                        });
                },
                next: function(resp) {
                    return {
                        name: 'states:address:verify',
                        creator_opts: {
                            address_options:response.data
                        }
                    };
                }
            }) ;
        });

        self.states.add('states:address:verify',function(name,opts){
            var index = 0;
            var choices = _.map(opts.address_options,function(ward) {
                index++;
                return new Choice(index,ward.address.replace(", South Africa",""));
            });

            return new PaginatedChoiceState(name, {
                question: $('Please select your location from the options below:'),
                choices: choices,
                characters_per_page: 180,
                options_per_page: 3,
                next: function(choice) {
                    //Set ward data
                    var index = choice.value-1;
                    self.contact.extra.ward = opts.address_options[index].ward;
                    self.contact.extra.voting_district = opts.address_options[index].voting_district;
                    self.contact.extra.it_ward = self.get_date_string();

                    //Set contact group
                    return self
                        .get_group_config()
                        .spread(function(ward_treatment, push_message_group) {
                            //Set the contact group
                            self.set_contact_group(
                                self.contact.extra.ward,
                                ward_treatment,
                                push_message_group
                            );

                            //Save contact.
                            return self.im.contacts.save(self.contact).then(function() {
                                return "states:menu";
                            });
                        });
                }
            });
        });

        self.states.add('states:menu',function(name) {
            return new MenuState(name, {
                question: $('Welcome to VIP!'),
                choices:[
                    new Choice('states:quiz:answerwin:begin',$('Answer & win!')),
                    new Choice(self.quizzes.vip.get_next_quiz_state(),$('VIP Quiz')),
                    new Choice('states:report',$('Report an Election Activity')),
                    new Choice('states:results',$('View VIP results...')),
                    new Choice(self.quizzes.whatsup.get_next_quiz_state(),$("What's up?")),
                    new Choice('states:about',$('About')),
                    new Choice('states:end',$('End'))
                ]
            });
        });

        self.get_kv = function(name) {
            return self.im.api_request('kv.get', {key: name});
        };

        self.incr_kv = function(name) {
            return self.im.api_request('kv.incr', {key: name});
        };

        self.states.add('states:report',function(name) {
            var report_types = [
                new Choice('Party going door-to-door',$('Party going door-to-door')),
                new Choice('Party intimidating voters',$('Party intimidating voters')),
                new Choice('Party distributing food/money/gift',$('Party distributing food/money/gift')),
                new Choice('Campaign rally',$('Campaign rally')),
                new Choice('Campaign violence',$('Campaign violence')),
                new Choice('Protest/Demonstration',$('Protest/Demonstration'))
            ];
            return new ChoiceState(name, {
                question: $("Choose a report type:"),
                choices: report_types ,
                next: function(choice) {
                    var category_index = _.findIndex(report_types,function(c) {
                        return c.value === choice.value;
                    });
                    self.contact.extra.report_type = (category_index + 1).toString();
                    self.contact.extra.report_desc = choice.value;
                    self.contact.extra.it_report_type = self.get_date_string();

                    return self
                        .im.contacts.save(self.contact)
                        .then(function() {
                            return 'states:report:title';
                        });
                }
            });
        });

        self.states.add('states:report:title',function(name) {
            return new FreeText(name, {
                question: $('What is the title of your report?'),
                next: function(content) {
                    self.contact.extra.report_title = content;
                    self.contact.extra.it_report_title = self.get_date_string();

                    return self.im.contacts.save(self.contact)
                        .then(function() {
                            return 'states:report:location';
                        });
                }
            });
        });

        self.get_location_str = function(content){
            return (content.toLowerCase().indexOf("south africa") > -1) ? content : [content,"south africa"].join(' ');
        };

        self.states.add('states:report:location',function(name) {
            var response;
            var error =$('An error occured. Please try again');
            return new FreeText(name, {
                question: $('Where did this event happen? Please be as specific as possible and give address and city.'),
                check: function(content) {
                    return self
                        .http.get("https://maps.googleapis.com/maps/api/geocode/json",{
                            params: {
                                address: self.get_location_str(content),
                                sensor: "false"
                            }
                        })
                        .then(function(resp) {
                            response = resp.data.results;
                            if (resp.data.status != "OK") {
                                return error;
                            }
                        });
                },
                next: function(content) {
                    return {
                        name: 'states:report:verify_location',
                        creator_opts: {
                            address_options:response
                        }
                    };
                }
            });
        });

        self.states.add('states:report:verify_location',function(name,opts) {
            //Create the choices from the location verification.
            var index = 0;
            var choices = _.map(opts.address_options,function(address) {
                index++;
                return new Choice(index,address.formatted_address.replace(", South Africa",""));
            });
            return new PaginatedChoiceState(name, {
                question: $('Please select your location from the options below:'),
                choices: choices,
                characters_per_page: 180,
                options_per_page: 3,
                next: function(choice) {
                    return self.ushahidi
                        .post_report(self.im.config.ushahidi_map, {
                            task: "report",
                            incident: {
                                title: self.contact.extra.report_title,
                                description: self.contact.extra.report_desc,
                                category: self.contact.extra.report_type
                            },
                            place: opts.address_options[choice.value-1],
                            date:  self.get_date()
                        })
                        .then(function(resp) {
                            return {
                                name:'states:report:end',
                                creator_opts: {
                                    response: resp.data.payload.success
                                }
                            };
                        });
                }
            });
        });

        self.states.add('states:report:end',function(name,opts) {
            return self
                .incr_kv('total.reports')
                .then(function(results) {
                    return self.im.metrics.fire.last('total.reports',results.value);
                })
                .then(function() {
                    return new EndState(name, {
                        text: $([
                            'Thank you for your report! Keep up the reporting',
                            '& you may have a chance to be chosen as an official',
                            'election day reporter where you can earn airtime or cash',
                            'for your contribution.'
                        ].join(" ")),
                        next: function() {
                            return 'states:menu';
                        }
                    });
                });
        });

        self.states.add('states:results',function(name) {
                return Q.all([
                    self.get_kv('registered.participants'),
                    self.get_kv('total.questions'),
                    self.get_kv('total.reports')
                ])
                .spread(function(registered, questions, reports) {
                    return new EndState(name, {
                        text: [
                            'You are 1 of',
                            registered.value || 0,
                            'citizens who are active citizen election reporters!',
                            questions.value || 0,
                            'questions and',
                            reports.value || 0,
                            'election activity posts have been submitted.',
                            'View results at www.url.com'
                        ].join(' '),
                        next: 'states:start'
                    });
                });
        });

        self.get_about = function() {
              return [
                  $("The VIP-Ask is a multi-channel political engagement portal.VIP: " +
                    "Ask will engage South Africans from all walks of life to " +
                    "report on electoral activities,"),
                  $("voice their opinions on current issues surrounding the elections, " +
                    "and report on election processes on voting day."),
                      $("VIP:Ask is a partnership between academics, " +
                    "Democracy International, Livity Africa and the Praekelt Foundation")
              ];
        };

        self.states.add('states:about',function(name) {
            var about = self.get_about();
            return new BookletState(name, {
                pages: about.length,
                page_text: function(n) {return about[n];},
                buttons: {"1": -1, "2": +1, "3": "exit"},
                footer_text: $("1. Prev 2. Next 3. Exit"),
                next: 'states:menu'
            });
        });

        self.states.add('states:end',function(name) {
            return new EndState(name, {
                text: $('Bye.'),
                next: 'states:start'
            });
        });
    });

    return {
        GoDiApp: GoDiApp
    };
}();

di.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoDiApp = di.app.GoDiApp;


    return {
        im: new InteractionMachine(api, new GoDiApp())
    };
}();
