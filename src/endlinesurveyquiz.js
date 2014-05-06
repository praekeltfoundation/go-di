/**
 * Created by Jade on 2014/03/27.
 */
di.quiz.endlinesurvey = function() {
    var QuizStates = di.quiz.QuizStates;
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;

    var EndlineSurveyQuiz = QuizStates.extend(function(self,app) {
        QuizStates.call(self,app,{
            name:'endlinesurvey'
        });
        var $ = app.$;

        self.add_question('satisfied_democracy',function(name) {
            return new ChoiceState(name, {
                question: $("How do u feel about democracy in SA?"),
                choices: [
                    new Choice('very_satisfied',$('Very satisfied')),
                    new Choice('somewhat_satisfied',$('Smewht satisfied')),
                    new Choice('dissatisfied',$('Smewhat disatisfied')),
                    new Choice('very_dissatisfied',$('Very disatisfied')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('satisfied_democracy',content);
                }
            });
        });

        self.add_question('fair_outcome',function(name) {
            return new ChoiceState(name, {
                question: $("Do u think the outcome of the election was free and fair?"),
                choices: [
                    new Choice('strongly_agree',$('Strongly agree')),
                    new Choice('somewhat_agree',$('Somewht agree')),
                    new Choice('somewhat_disagree',$('Somewht disagree')),
                    new Choice('strongly_disagree',$('Strongly disagree')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('fair_outcome',content);
                }
            });
        });

        self.add_question('happy_with_results',function(name) {
            return new ChoiceState(name, {
                question: $("Are u happy with the election results?"),
                choices: [
                    new Choice('strongly_agree',$('Strongly agree')),
                    new Choice('somewhat_agree',$('Somewht agree')),
                    new Choice('somewhat_disagree',$('Somewht disagree')),
                    new Choice('strongly_disagree',$('Strongly disagree')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('happy_with_results',content);
                }
            });
        });

        self.add_question('life_quality',function(name) {
            return new ChoiceState(name, {
                question: $("In the next 5 years, do u think life for people like u will be better, worse, or stay the same?"),
                choices: [
                    new Choice('better',$('Better')),
                    new Choice('worse',$('Worse')),
                    new Choice('stay_same',$('Stay same')),
                    new Choice('skip',$('Skip'))
                ],
                next: function(content) {
                    return self.next_quiz('life_quality',content);
                }
            });
        });

        self.add_next('end',function(name) {
            return new EndState(name, {
                text: $('VIP: Voice thanks you for contributing to a free & fair election!'),
                next:  'states:start'
            });
        });

        self.add_begin('begin');
    });

    return {
        EndlineSurveyQuiz: EndlineSurveyQuiz
    };
}();
