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

        //Turn out question to determine if push should proceed
        app.states.add('states:push:group_c_turnout',function(name) {
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
                                return 'states:push:group_c_turnout:thanks';
                            }
                        });
                }
            });
        });

        app.states.add('states:push:group_c_turnout:thanks',function(name) {
            return new EndState(name,{
                text: $('Thanks for your response'),
                next: 'states:push:end'
            }) ;
        });

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
