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
