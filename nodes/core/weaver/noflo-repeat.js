/**
 * Created by Mathieu on 3/15/2016.
 */

noflo = require("noflo");

fbpData = " \
'6' -> MULTIPLICAND Multiple(math/Multiply) \
'7' -> MULTIPLIER Multiple \
Multiple PRODUCT -> IN Display(core/Output) \
";

fbpData2 = " \
'Weaver' -> NUMBER plus(math/PlusOne) \
plus TOTAL -> IN Display(core/Output) \
";

module.exports = function(RED) {
    "use strict";
    // require any external libraries we may need....
    //var foo = require("foo-library");

    // The main node definition - most things happen in here
    function RepeatNode(n) {
        // Create a RED node
        RED.nodes.createNode(this,n);

        // Store local copies of the node configuration (as defined in the .html)
        this.topic = n.topic;
        this.set = n.set;

        // copy "this" object in case we need it in context of callbacks of other functions.
        var node = this;

        // Do whatever you need to do in here - declare callbacks etc
        // Note: this sample doesn't do anything much - it will only send
        // this message once at startup...
        // Look at other real nodes for some better ideas of what to do....
        var msg = {};
        msg.payload = this.payload;
        // send out the message to the rest of the workspace.
        // ... this message will get sent at startup so you may not see it in a debug node.

        // respond to inputs....
        this.on('input', function (msg) {
            noflo.graph.loadFBP(fbpData, function(graph) {
                console.log("Graph loaded");
                noflo.createNetwork(graph, function(network) {
                    network.connect( function () {
                        network.start(
                        console.log('Network is now running!')
                        )
                    })
                }, true);
            });
            node.send(msg);
        });
    }
    RED.nodes.registerType("repeat",RepeatNode);
};
