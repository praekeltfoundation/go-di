di.quiz.groupc = function() {
    var QuizStates = di.quiz.QuizStates;
    var vumigo = require('vumigo_v02');
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;

    var GroupCQuiz = QuizStates.extend(function(self,app) {
        QuizStates.call(self,app,{
            name:'groupc',
            continue_interval: 6
        });
        var $ = app.$;

        self.add_question('colours',function(name) {
            return new ChoiceState(name, {
                question: $('What colours were the ballots at your voting station?'),
                choices: [
                    new Choice('white_pink',$('white&pink')),
                    new Choice('green_yellow',$('green&yellow')),
                    new Choice('pink_blue',$('pink&blue')),
                    new Choice('blue_yellow',$('blue&yellow')),
                    new Choice('none_of_above',$('none of above')),
                    new Choice('skip',$('skip'))
                ],
                next: function(content) {
                    return self.next_quiz('colours',content);
                }
            });
        });

        //This may cause problems with the push app.
        self.add_next('end',function(name) {
            return new EndState(name, {
                text: $('If your phone has a camera, pls mms us a photo of your inked finger to show your vote! U will be sent airtime for ur MMS'),
                next: "states:menu"
            });
        });

        self.add_begin('begin');
    });

    return {
        GroupCQuiz: GroupCQuiz
    };
}();
