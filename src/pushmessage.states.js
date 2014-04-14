di.push_message_states = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var App = vumigo.App;
    var AppStates = vumigo.app.AppStates;
    var PushMessageApi = di.push_message.PushMessageApi;

    var PushCheckAppStates = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);
        self.pushmessage = new PushMessageApi(app.im,app);
        var create =  self.create;

        self.create = function(name,opts) {
            //Check if dummy message
            var msg = app.im.msg;
            if (_.isUndefined(msg.push_message_trigger)) {
                return create(name,opts);
            } else {
                //Set the push_message_trigger to null so that
                //app.states.create can be used.
                app.im.msg.push_message_trigger = null;
                return self.pushmessage.send_push_message();
            }

        };
    });

    return {
        PushCheckAppStates: PushCheckAppStates
    };
}();