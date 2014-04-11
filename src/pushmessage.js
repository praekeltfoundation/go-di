di.push_message = function() {
    var _ = require('lodash');
    var vumigo = require('vumigo_v02');
    var utils = vumigo.utils;
    var Extendable = utils.Extendable;

    var PushMessageApi = Extendable.extend(function(self, im, app, opts) {
        var contact = app.contact;
        self.send_push_messages = function() {
            return self.send_reminder_messages();
        };

        self.send_reminder_messages = function() {
            if (self.should_send_location_push()) {
                //send location message
            } else if (self.has_saved_location()) {
                if (self.should_send_quiz_push('vip')) {

                }
                if (self.should_send_quiz_push('answerwin')) {

                }
            }
        };

        self.should_send_quiz_push = function(name) {
            return contact.is_registered()
            && _.isUndefined(contact.extra[name+'_complete'])l
        };

        self.should_send_location_push = function() {
            return contact.is_registered()
                && _.isUndefined(contact.extra.ward)
                && (self.days_since(contact.extra.it_ward,7)
                || self.days_since(contact.extra.it_ward,14));
        };

        self.has_saved_location = function() {
            return !_.isUndefined(contact.extra.ward);
        };

        self.days_since = function(date,num_days) {

        };

    });
    return {
        PushMessageApi: PushMessageApi
    };
}();