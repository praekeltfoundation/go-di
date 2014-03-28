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

        app.states.add(self.construct_state_name('gender'),function(name) {
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

        app.states.add(self.construct_state_name('age'),function(name) {
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

        app.states.add(self.construct_state_name('2009election'),function(name) {
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

        app.states.add(self.construct_state_name('race'),function(name) {
            return new ChoiceState(name, {
                question: $('I am...'),
                choices: [
                    new Choice('black_african',$('Black African')),
                    new Choice('coloured',$('Coloured')),
                    new Choice('indian_or_asian',$('Indian/Asian')),
                    new Choice('white',$('White')),
                    new Choice('other',$('Other')),
                    new Choice('skip',$('Skip')),
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