di.quiz.votingexperience = function() {
    var QuizStates = di.quiz.QuizStates;
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;

    var VotingExperienceQuiz = QuizStates.extend(function(self,app) {
        QuizStates.call(self,app,{
            name:'votingexperience',
            continue_interval: 5
        });
        var $ = app.$;

        //Turn out question to determine if push should proceed
        app.states.add('states:push:voting_turnout',function(name) {
            return new ChoiceState(name, {
                question: $('VIP wants to know if you voted?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No'))
                ],
                next: function(choice) {
                    //Needs to be saved on reply
                    var field = self.push_api.get_push_field('voting_turnout',1);
                    self.contact.extra[field+'_reply'] = choice.value;
                    self.contact.extra['it_'+field+'_reply'] = self.get_date_string();

                    return self
                        .im.contacts.save(self.contact)
                        .then(function() {
                            return self.answer('did_you_vote',choice.value);
                        })
                        .then(function() {
                            return self.im.metrics.fire.inc('total.push.replies');
                        })
                        .then(function() {
                            if (choice.value == 'yes') {
                                return self.get_next_quiz_state();
                            } else {
                                return 'states:push:voting_turnout:thanks';
                            }
                        });
                }
            });
        });

        app.states.add('states:push:voting_turnout:thanks',function(name) {
            return new EndState(name,{
                text: $('Thanks for your response'),
                next: 'states:push:end'
            }) ;
        });

        self.add_question('queue_wait',function(name) {
            return new ChoiceState(name, {
                question: $('How long are voters waiting in queue b4 voting?'),
                choices: [
                    new Choice('less_than_10',$('less than 10min')),
                    new Choice('10-30_min',$('10-30 min')),
                    new Choice('30min_1hr',$('30min to 1hr')),
                    new Choice('more_than_1hr',$('more than 1hr')),
                    new Choice('skip',$('skip'))
                ],
                next: function(content) {
                    return self.next_quiz('queue_wait',content);
                }
            });
        });

        self.add_question('station_materials',function(name) {
            return new ChoiceState(name, {
                question: $('Did the voting station have all necessary materials and working equipment?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('dont_know',$("Don't know")),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('station_materials',content);
                }
            });
        });

        self.add_question('performance_iec_officials',function(name) {
            return new ChoiceState(name, {
                question: $('How would you rate the overall performance of IEC officials at the voting station?'),
                choices: [
                    new Choice('excellent',$('Excellent')),
                    new Choice('good',$('Good')),
                    new Choice('fair',$('Fair')),
                    new Choice('poor',$('Poor')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('performance_iec_officials',content);
                }
            });
        });

        self.add_question('party_campaigning_observation',function(name) {
            return new ChoiceState(name,{
                question: $('Did you observe party agents campaigning outside of the voting station?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('party_campaigning_observation',content);
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

        self.add_question('environment_report',function(name) {
            return new ChoiceState(name, {
                question: $('Please report the environment outside the polling station'),
                choices: [
                    new Choice('very_tense',$('Very tense')),
                    new Choice('somewhat_tense',$('Somewhat tense')),
                    new Choice('not_tense',$('Not tense')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('environment_report',content);
                }
            });
        });

        self.add_question('violence_observation',function(name) {
            return new ChoiceState(name, {
                question: $('Did you observe or hear about any violence in or around the polling station?'),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('violence_observation',content);
                }
            });
        });

        self.add_question('intimidation_incidents',function(name) {
            return new ChoiceState(name, {
                question: $("How easy is it for your neighbors to find out if you voted?"),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz(7,content);
                }
            });
        });

        self.add_question('adequate_privacy',function(name) {
            return new ChoiceState(name, {
                question: $("Did the voting station provide adequate privacy to ensure ballot secrecy?"),
                choices: [
                    new Choice('yes',$('Yes')),
                    new Choice('no',$('No')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('adequate_privacy',content);
                }
            });
        });

        self.add_begin('begin');
    });

    return {
        VotingExperienceQuiz: VotingExperienceQuiz
    };
}();
