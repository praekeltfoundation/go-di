/**
 * Created by Jade on 2014/03/27.
 */
di.quiz.endlinesurvey = function() {
    var QuizStates = di.quiz.QuizStates;
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;

    var WhatsupQuiz = QuizStates.extend(function(self,app) {
        QuizStates.call(self,app,{
            name:'endlinesurvey',
            continue_interval: 6
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

        self.add_begin('begin');
    });

    return {
        WhatsupQuiz: WhatsupQuiz
    };
}();
