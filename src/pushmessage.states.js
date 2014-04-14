di.push_message_states = function() {
    var vumigo = require('vumigo_v02');
    var _ = require('lodash');
    var AppStates = vumigo.app.AppStates;
    var PushMessageApi = di.push_message.PushMessageApi;

    var PushMessageStates = AppStates.extend(function(self,app,opts) {
        AppStates.call(self, app);
        self.pushmessage = new PushMessageApi(app.im,app);
        var create =  self.create;

        self.create = function(name,opts) {
            //Check if dummy message
            var msg = app.im.msg;
            if (_.isUndefined(msg.inbound_push_trigger)) {
                return create(name,opts);
            } else {
                return self.pushmessage.send_push_message();
            }
        };
    });

    return {
        PushMessageStates: PushMessageStates
    };
}();