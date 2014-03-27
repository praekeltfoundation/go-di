di.quiz = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var AppStates = vumigo.app.AppStates;

    var QuizStates = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);

        self.continue_interval = opts.continue_interval;
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

        self.add_question = function(name,state) {
            self.questions.push(name);
            self.add(name,state);
        };

        self.add_continue = function(name,state) {
            self.continue = name;
            self.add(name,state);
        };

        self.add_next = function(name,state) {
            self.next = name;
            self.add(name,state);
        };

        self.add_begin = function(name,state) {
            self.begin = name;
            self.add(name,state);
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
                return self.create(self.continue,opts);
            }
            return self.create(self.random_quiz_name(), opts);
        };

        self.incr_quiz_metrics = function() {
            //Increment total.questions: kv store + metric
            var promise =  app.incr_kv('total.questions').then(function(result) {
                return app.im.metrics.fire.last('total.questions',result.value);
            });

            //Check if all questions have been answered and increment total quiz's completed
            if (self.is_complete()) {
                promise = promise.then(function(result) {
                    return app.im.metrics.fire.inc('quiz.complete');
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
            app.contact.extra["question" +n] = value;
            app.contact.extra["it_question" +n] = app.get_date_string();
            return app.im.contacts.save(app.contact);
        };
    });

    return {
        QuizStates: QuizStates
    };
}();
