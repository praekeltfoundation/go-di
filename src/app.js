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
    var AppStates = vumigo.app.AppStates;

    /**
     * Does randomization of quizzes.
     * Requires a next state to be defined.
     * Requires a continue state.
     * */
    var QuizStates = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);

        self.name = opts.name;
        self.next = opts.next;
        self.num_questions = opts.num_questions;
        self.continue_interval = opts.continue_interval;
        self.continue = opts.continue;

        var is_valid = function(state) {
            return _.contains(state,self.name)      //quiz name - filters out __start__ & __end__
                && !_.contains(state,'begin')       //Filter begin state, if its included
                && !_.contains(state,'continue')    //Filter continue state
                && !_.contains(state,'end');        //Filter end state
        };

        self.is_complete = function() {
            return self.count() === self.num_questions;
        };

        /**
         * Counts the answered questions
         * @returns {number of answered questions}
         */
        self.count = function() {
            var names = _.keys(self.creators);
            var unanswered = self.filter(names);
            return self.num_questions - unanswered.length;
        };

        /**
         * Random function: To enable easy deterministic testing.
         * */
        self.random = function(n) {
            return _.random(n-1);
        };

        /*
        * Returns the all question states which have not been answered.
        * */
        self.filter = function(names) {
            return _.filter(names,function(state) {
                return is_valid(state)
                    && !_.has(app.im.user.answers,state);
            });
        };

        self.random_quiz_name = function() {
            var names = _.keys(self.creators);
            var unanswered = self.filter(names);
            var index = self.random(unanswered.length);
            return unanswered[index] || self.next ;
        };

        //If an interval of the questions save for last and first question
        //If not from a continue state.
        self.create_continue = function(opts) {
            var count = self.count();
            return (
                count > 0
                && count < self.num_questions
                && (count % self.continue_interval) === 0
                && !opts.from_continue
            );
        };

        self.create.random = function(opts) {
            if (self.create_continue(opts)) {
                return self.create(self.continue,opts);
            }
            return self.create(self.random_quiz_name(), opts);
        };
    });

    var GoDiApp = App.extend(function(self) {
        App.call(self, 'states:start');
        var $ = self.$;

        self.quizzes = {};
        self.quizzes.vip = new QuizStates(self,{
            name:'vip',
            next:'states:quiz:vip:end',
            num_questions: 12,
            continue: 'states:quiz:vip:continue',
            continue_interval: 4
        });

        self.quizzes.whatsup = new QuizStates(self,{
            name:'whatsup',
            next:'states:quiz:whatsup:end',
            num_questions: 10,
            continue: 'states:quiz:whatsup:continue',
            continue_interval: 4
        });

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

            return self.im.contacts.for_user()
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
                    content: [
                        "Hello VIP!2 begin we need ur voting ward.",
                        "Dial *55555# & give us ur home address & we'll work it out.",
                        "This will be kept private, only ur voting ward will be stored &u will be anonymous."
                    ].join(' ')
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
                    content: [
                        'Thanks for volunteering to be a citizen reporter for the 2014 elections!',
                        'Get started by answering questions or reporting election activity!',
                        'Dial back in to *5555# to begin!'
                    ].join(' ')
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

        /**
         * Get's quiz completion
         * */
        self.is_quiz_complete = function() {
            return self.quizzes.vip.is_complete();
        };

        /*
        * Sets value of answer + timestamp and remove question from unanswered list
        * */
        self.answer = function(n,value) {
            self.contact.extra["question" +n] = value;
            self.contact.extra["it_question" +n] = self.get_date_string();
            return self.im.contacts.save(self.contact);
        };

        /*
        * Returns to quiz delegation state.
        * Adds came from 'continue' state.
        * */
        self.get_next_quiz_state = function(name,from_continue) {
            return {
                name:'states:quiz:'+name+':begin',
                creator_opts: {
                    from_continue: from_continue || false
                }
            };
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
                    var index = choice.value-1;
                    self.contact.extra.ward = opts.address_options[index].ward;
                    self.contact.extra.voting_district = opts.address_options[index].voting_district;
                    self.contact.extra.it_ward = self.get_date_string();
                    return self.im.contacts.save(self.contact).then(function() {
                        return "states:menu";
                    });
                }
            });
        });

        self.states.add('states:menu',function(name) {
            return new MenuState(name, {
                question: $('Welcome to VIP!'),
                choices:[
                    new Choice(self.get_next_quiz_state('vip'),$('Answer & win!')),
                    new Choice(self.get_next_quiz_state('vip'),$('VIP Quiz')),
                    new Choice('states:report',$('Report an Election Activity')),
                    new Choice('states:results',$('View VIP results...')),
                    new Choice(self.get_next_quiz_state('whatsup'),$("What's up?")),
                    new Choice('states:about',$('About')),
                    new Choice('states:end',$('End'))
                ]
            });
        });

        self.states.add('states:answerwin',function(name) {
            return new MenuState(name, {
                question: $('Welcome to VIP!'),
                choices:[
                    new Choice(self.get_next_quiz_state('vip'),$('Answer & win!')),
                    new Choice(self.get_next_quiz_state('vip'),$('VIP Quiz')),
                    new Choice('states:report',$('Report an Election Activity')),
                    new Choice('states:results',$('View the results...')),
                    new Choice(self.get_next_quiz_state('whatsup'),$("What's up?")),
                    new Choice('states:about',$('About')),
                    new Choice('states:end',$('End'))
                ]
            });
        });

        self.incr_quiz_metrics = function() {
            //Increment total.questions: kv store + metric
            var promise =  self.incr_kv('total.questions').then(function(result) {
                return self.im.metrics.fire.last('total.questions',result.value);
            });

            //Check if all questions have been answered and increment total quiz's completed
            if (self.is_quiz_complete()) {
                promise = promise.then(function(result) {
                    return self.im.metrics.fire.inc('quiz.complete');
                });
            }
            return promise;
        };

        self.get_kv = function(name) {
            return self.im.api_request('kv.get', {key: name});
        };

        self.incr_kv = function(name) {
            return self.im.api_request('kv.incr', {key: name});
        };

        self.next_quiz = function(n,content,name) {
            return self
                .answer(n,content.value)
                .then(function() {
                    return self.incr_quiz_metrics();
                })
                .then(function() {
                    return self.get_next_quiz_state(name);
                });
        };

        self.states.add('states:quiz:vip:begin',function(name,opts) {
            return self.quizzes.vip.create.random(opts);
        });

        self.states.add('states:quiz:whatsup:begin',function(name,opts) {
            return self.quizzes.whatsup.create.random(opts);
        });

        self.quizzes.vip.add('states:quiz:vip:question1',function(name) {
            return new ChoiceState(name, {
               question: $('During the past year, have you attended a demonstration or protest?'),
               choices: [
                    new Choice('yes_many',$('Yes, many')),
                    new Choice('yes_few',$('Yes, a few')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(1,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question2',function(name) {
            return new ChoiceState(name, {
                question: $('Are you registered to vote in the upcoming elections?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('unsure',$('Unsure')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(2,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question3',function(name) {
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
                    return self.next_quiz(3,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question4',function(name) {
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
                    return self.next_quiz(4,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:continue',function(name) {
            return new MenuState(name,{
                question: $('Would you like to continue answering questions? There are 12 in total.'),
                choices: [
                    new Choice(self.get_next_quiz_state('vip',true),$('Continue')),
                    new Choice('states:menu',$('Main Menu'))
                ]
            });
        });

        self.quizzes.vip.add('states:quiz:vip:end',function(name) {
            return self.states.create("states:menu");
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:end',function(name) {
            return self.states.create("states:menu");
        });

        self.quizzes.vip.add('states:quiz:vip:question5',function(name) {
            return new ChoiceState(name, {
                question: $('During the past year, has your community had demonstrations or protests?'),
                choices: [
                    new Choice('yes_several',$('Yes, several times')),
                    new Choice('yes_once_twice',$('Yes, once or twice')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(5,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question6',function(name) {
            return new ChoiceState(name, {
                question: $('If your community has had demonstrations or protests in the last year, were they violent?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('na',$('Not applicable')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(6,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question7',function(name) {
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
                    return self.next_quiz(7,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question8',function(name) {
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
                    return self.next_quiz(8,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question9',function(name) {
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
                    return self.next_quiz(9,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question10',function(name) {
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
                    return self.next_quiz(10,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question11',function(name) {
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
                    return self.next_quiz(11,content,'vip');
                }
            });
        });

        self.quizzes.vip.add('states:quiz:vip:question12',function(name) {
            return new ChoiceState(name, {
                question: $("During the past two weeks, have you attended a campaign rally?"),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(12,content,'vip');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:satisfied_democracy',function(name) {
            return new ChoiceState(name, {
                question: $("How satisfied are you with the way democracy works in South Africa?"),
                choices: [
                    new Choice('very_satisfied',$('Very Satisfied')),
                    new Choice('somewhat_satisfied',$('Somewhat Satisfied')),
                    new Choice('dissatisfied',$('Dissatisfied')),
                    new Choice('very_dissatisfied',$('Very Dissatisfied')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('whatsup_satisfied_democracy',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:continue',function(name) {
            return new MenuState(name,{
                question: $('Would you like to continue answering questions? There are 12 in total.'),
                choices: [
                    new Choice(self.get_next_quiz_state('whatsup',true),$('Continue')),
                    new Choice('states:menu',$('Main Menu'))
                ]
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:frequency_campaign_rallies',function(name) {
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
                    return self.next_quiz('whatsup_frequency_campaign_rallies',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:frequency_party_agents',function(name) {
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
                    return self.next_quiz('whatsup_frequency_party_agents',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:frequency_intimidation',function(name) {
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
                    return self.next_quiz('whatsup_frequency_intimidation',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:trust_anc',function(name) {
            return new ChoiceState(name, {
                question: $("How much do you trust the ANC?"),
                choices: [
                    new Choice('a_lot',$('A lot')),
                    new Choice('some',$('Some')),
                    new Choice('not_much',$('Not much')),
                    new Choice('not_at_all',$('Not at all')),
                    new Choice('no_opinion',$('No Opinion')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('whatsup_trust_anc',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:trust_da',function(name) {
            return new ChoiceState(name, {
                question: $("How much do you trust the Democratic Alliance (DA)?"),
                choices: [
                    new Choice('a_lot',$('A lot')),
                    new Choice('some',$('Some')),
                    new Choice('not_much',$('Not much')),
                    new Choice('not_at_all',$('Not at all')),
                    new Choice('no_opinion',$('No Opinion')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('whatsup_trust_da',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:trust_eff',function(name) {
            return new ChoiceState(name, {
                question: $("How much do you trust the Economic Freedom Fighters (EFF)?"),
                choices: [
                    new Choice('a_lot',$('A lot')),
                    new Choice('some',$('Some')),
                    new Choice('not_much',$('Not much')),
                    new Choice('not_at_all',$('Not at all')),
                    new Choice('no_opinion',$('No Opinion')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('whatsup_trust_eff',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:food_to_eat',function(name) {
            return new ChoiceState(name, {
                question: $("During the past year, how often have you or anyone in your family gone without enough food to eat?"),
                choices: [
                    new Choice('never',$('Never')),
                    new Choice('once_or_twice',$('Once or twice')),
                    new Choice('sometimes',$('Sometimes')),
                    new Choice('many_times',$('Many Times')),
                    new Choice('always',$('Always')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('whatsup_food_to_eat',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:violence_for_just_cause',function(name) {
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
                    return self.next_quiz('whatsup_violence_for_just_cause',content,'whatsup');
                }
            });
        });

        self.quizzes.whatsup.add('states:quiz:whatsup:not_voting',function(name) {
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
                    return self.next_quiz('whatsup_not_voting',content,'whatsup');
                }
            });
        });

        self.states.add('states:report',function(name) {
            var report_types = [
                'Party going door-to-door',
                'Party intimidating voters',
                'Party distributing food/money/gift',
                'Campaign rally',
                'Campaign violence',
                'Protest/Demonstration'
            ];
            return new ChoiceState(name, {
                question: $("Choose a report type:"),
                choices: _.map(report_types,function (description,index) {
                    return new Choice(index+1,$(description));
                }),
                next: function(choice) {
                    self.contact.extra.report_type = choice.value.toString();
                    self.contact.extra.report_desc = report_types[choice.value-1];
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
