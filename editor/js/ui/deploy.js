/**
 * Copyright 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

RED.deploy = (function() {

    var deploymentTypes = {
        "full":{img:"red/images/deploy-full-o.png"},
        "nodes":{img:"red/images/deploy-nodes-o.png"},
        "flows":{img:"red/images/deploy-flows-o.png"}
    }

    var ignoreDeployWarnings = {
        unknown: false,
        unusedConfig: false,
        invalid: false
    }

    var deploymentType = "full";

    function changeDeploymentType(type) {
        deploymentType = type;
        $("#btn-deploy img").attr("src",deploymentTypes[type].img);
    }


    /**
     * options:
     *   type: "default" - Button with drop-down options - no further customisation available
     *   type: "simple"  - Button without dropdown. Customisations:
     *      label: the text to display - default: "Deploy"
     *      icon : the icon to use. Null removes the icon. default: "red/images/deploy-full-o.png"
     */
    function init(options) {
        options = options || {};
        var type = options.type || "default";

        if (type == "default") {
            $('<li><span class="deploy-button-group button-group">'+
              '<a id="btn-deploy" class="deploy-button disabled" href="#"><img id="btn-deploy-icon" src="red/images/deploy-full-o.png"> <span>'+RED._("deploy.deploy")+'</span></a>'+
              '<a id="btn-deploy-options" data-toggle="dropdown" class="deploy-button" href="#"><i class="fa fa-caret-down"></i></a>'+
              '</span></li>').prependTo(".header-toolbar");
              RED.menu.init({id:"btn-deploy-options",
                  options: [
                      {id:"deploymenu-item-full",toggle:"deploy-type",icon:"red/images/deploy-full.png",label:RED._("deploy.full"),sublabel:RED._("deploy.fullDesc"),selected: true, onselect:function(s) { if(s){changeDeploymentType("full")}}},
                      {id:"deploymenu-item-flow",toggle:"deploy-type",icon:"red/images/deploy-flows.png",label:RED._("deploy.modifiedFlows"),sublabel:RED._("deploy.modifiedFlowsDesc"), onselect:function(s) {if(s){changeDeploymentType("flows")}}},
                      {id:"deploymenu-item-node",toggle:"deploy-type",icon:"red/images/deploy-nodes.png",label:RED._("deploy.modifiedNodes"),sublabel:RED._("deploy.modifiedNodesDesc"),onselect:function(s) { if(s){changeDeploymentType("nodes")}}}
                  ]
              });
        } else if (type == "simple") {
            var label = options.label || RED._("deploy.deploy");
            var icon = 'red/images/deploy-full-o.png';
            if (options.hasOwnProperty('icon')) {
                icon = options.icon;
            }

            $('<li><span class="deploy-button-group button-group">'+
              '<a id="btn-deploy" class="deploy-button disabled" href="#">'+
              (icon?'<img id="btn-deploy-icon" src="'+icon+'"> ':'')+
              '<span>'+label+'</span></a>'+
              '</span></li>').prependTo(".header-toolbar");
        }

        $('#btn-deploy').click(function() { save(); });

        $( "#node-dialog-confirm-deploy" ).dialog({
                title: "Confirm deploy",
                modal: true,
                autoOpen: false,
                width: 550,
                height: "auto",
                buttons: [
                    {
                        text: RED._("deploy.confirm.button.confirm"),
                        click: function() {

                            var ignoreChecked = $( "#node-dialog-confirm-deploy-hide" ).prop("checked");
                            if (ignoreChecked) {
                                ignoreDeployWarnings[$( "#node-dialog-confirm-deploy-type" ).val()] = true;
                            }
                            save(true);
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        text: RED._("deploy.confirm.button.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                ],
                create: function() {
                    $("#node-dialog-confirm-deploy").parent().find("div.ui-dialog-buttonpane")
                        .prepend('<div style="height:0; vertical-align: middle; display:inline-block; margin-top: 13px; float:left;">'+
                                   '<input style="vertical-align:top;" type="checkbox" id="node-dialog-confirm-deploy-hide">'+
                                   '<label style="display:inline;" for="node-dialog-confirm-deploy-hide"> do not warn about this again</label>'+
                                   '<input type="hidden" id="node-dialog-confirm-deploy-type">'+
                                   '</div>');
                }
        });

        RED.events.on('nodes:change',function(state) {
            if (state.dirty) {
                window.onbeforeunload = function() {
                    return RED._("deploy.confirm.undeployedChanges");
                }
                $("#btn-deploy").removeClass("disabled");
            } else {
                window.onbeforeunload = null;
                $("#btn-deploy").addClass("disabled");
            }
        });
    }

    function getNodeInfo(node) {
        var tabLabel = "";
        if (node.z) {
            var tab = RED.nodes.workspace(node.z);
            if (!tab) {
                tab = RED.nodes.subflow(node.z);
                tabLabel = tab.name;
            } else {
                tabLabel = tab.label;
            }
        }
        var label = "";
        if (typeof node._def.label == "function") {
            label = node._def.label.call(node);
        } else {
            label = node._def.label;
        }
        label = label || node.id;
        return {tab:tabLabel,type:node.type,label:label};
    }
    function sortNodeInfo(A,B) {
        if (A.tab < B.tab) { return -1;}
        if (A.tab > B.tab) { return 1;}
        if (A.type < B.type) { return -1;}
        if (A.type > B.type) { return 1;}
        if (A.name < B.name) { return -1;}
        if (A.name > B.name) { return 1;}
        return 0;
    }

    function disassembleNodeRED(nns) {
        var nodes = [], wires = [];

        if (nns.length) {
            for (var i = 0; i < nns.length; i++) {
                var item = nns[i];
                if (item.type == "tab") {}
                else if (item.type == "subflow") {}
//                else if (item.type == "inject") //Start flow
//                {
//                    noflo.connections.push({"data": item.payload});
//                    noflo.connections.push({"tgt": {
//                        "process": "function",
//                        "port": "in"
//                    }});
//                }
                else // if any other node
                {
                    var node = {
                        "name": item.name,
                        "id": item.id,
                        "component": item.type,
                        "value": item.payload,
                        "function": item.function
                    }
                }
                if (node) { nodes.push(node); }

                if (item.wires) {
                    if (item.wires.length > 0) {
                        for (var j = 0; j < item.wires.length; j++) {
                            for (var k = 0; k < item.wires[j].length; k++) {
                                wires.push({"out": item.id, "in": item.wires[j][k]})
                            }
                        }
                    }
                }
            }
        }

        return [nodes, wires];
    }

    function assembleNoFlo(nodes, wires) {
        var noflo = {
            "name":"graph",
            "properties": {},
            "processes": {},
            "connections": []
        };
        for (var i = 0; i < nodes.length; i++) {
            var x = 0;
            while (noflo.processes[nodes[i].name] || nodes[i].name == "") {
                if (nodes[i].name.slice(nodes[i].name.length - 2, nodes[i].name.length - 1) == x) {
                    nodes[i].name = nodes[i].name.slice(0, nodes[i].name.length - 3);
                }
                x++;
                nodes[i].name += "(" + x + ")";
            }
            noflo.processes[nodes[i].name] = {
                "id": nodes[i].id,
                "component": nodes[i].component,
                "value": nodes[i].value
            }
        }

        for (var i = 0; i < wires.length; i++) {
            noflo.connections.push({
                "src": {
                    "id": wires[i].out,
                    "process": "",
                    "port": "out" // Check for Node-RED port on multiple ports?


                },
                "tgt": {
                    "id": wires[i].in,
                    "process": "",
                    "port": "in" // Check for Node-RED port on multiple ports?
                }
            });
        }
        return noflo;
    }

    function save(force) {
        if (true) {
            //$("#debug-tab-clear").click();  // uncomment this to auto clear debug on deploy

            if (!force) {
                var hasUnknown = false;
                var hasInvalid = false;
                var hasUnusedConfig = false;

                var unknownNodes = [];
                var invalidNodes = [];

                RED.nodes.eachNode(function(node) {
                    hasInvalid = hasInvalid || !node.valid;
                    if (!node.valid) {
                        invalidNodes.push(getNodeInfo(node));
                    }
                    if (node.type === "unknown") {
                        if (unknownNodes.indexOf(node.name) == -1) {
                            unknownNodes.push(node.name);
                        }
                    }
                });
                hasUnknown = unknownNodes.length > 0;

                var unusedConfigNodes = [];
                RED.nodes.eachConfig(function(node) {
                    if (node.users.length === 0) {
                        unusedConfigNodes.push(getNodeInfo(node));
                        hasUnusedConfig = true;
                    }
                });

                $( "#node-dialog-confirm-deploy-config" ).hide();
                $( "#node-dialog-confirm-deploy-unknown" ).hide();
                $( "#node-dialog-confirm-deploy-unused" ).hide();

                var showWarning = false;

                if (hasUnknown && !ignoreDeployWarnings.unknown) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("unknown");
                    $( "#node-dialog-confirm-deploy-unknown" ).show();
                    $( "#node-dialog-confirm-deploy-unknown-list" )
                        .html("<li>"+unknownNodes.join("</li><li>")+"</li>");
                } else if (hasInvalid && !ignoreDeployWarnings.invalid) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("invalid");
                    $( "#node-dialog-confirm-deploy-config" ).show();
                    invalidNodes.sort(sortNodeInfo);
                    $( "#node-dialog-confirm-deploy-invalid-list" )
                        .html("<li>"+invalidNodes.map(function(A) { return (A.tab?"["+A.tab+"] ":"")+A.label+" ("+A.type+")"}).join("</li><li>")+"</li>");

                } else if (hasUnusedConfig && !ignoreDeployWarnings.unusedConfig) {
                    // showWarning = true;
                    // $( "#node-dialog-confirm-deploy-type" ).val("unusedConfig");
                    // $( "#node-dialog-confirm-deploy-unused" ).show();
                    //
                    // unusedConfigNodes.sort(sortNodeInfo);
                    // $( "#node-dialog-confirm-deploy-unused-list" )
                    //     .html("<li>"+unusedConfigNodes.map(function(A) { return (A.tab?"["+A.tab+"] ":"")+A.label+" ("+A.type+")"}).join("</li><li>")+"</li>");
                }
                if (showWarning) {
                    $( "#node-dialog-confirm-deploy-hide" ).prop("checked",false);
                    $( "#node-dialog-confirm-deploy" ).dialog( "open" );
                    return;
                }
            }
            var nns = RED.nodes.createCompleteNodeSet();

            console.log('NODES')
            console.log(RED.nodes.nodes)
            

            

            console.log('LINKS')
            console.log(RED.nodes.links)




            var noflo = require('noflo')



            var graph = noflo.graph.createGraph("count")

            var nodes = RED.nodes.nodes
            for(var i=0; i < nodes.length; i++){
                var node = nodes[i];
                
                if (node.type === 'plusone'){
                    graph.addNode(node.id, "weaver/PlusOne")
                }
                else if (node.type === 'debug'){
                    graph.addNode(node.id, "weaver/Output")
                }
            }

            var links = RED.nodes.links
            for(var i=0; i < links.length; i++){
                var link = links[i];
                
                var inport, outport;
                if (link.source.type === 'plusone'){
                    outport = 'total'
                }

                if (link.target.type === 'plusone'){
                    inport = 'number'
                }
                else if (link.target.type === 'debug'){
                    inport = 'in'
                }
                
                if (link.source.type === 'inject') {
                    graph.addInitial(link.source.payload, link.target.id, inport)
                }
                else {
                    graph.addEdge(link.source.id, outport, link.target.id, inport)
                }

                
            }
            
            //console.log(graph.toDOT())
            
            //
            //graph.addNode("optellen1", "weaver/PlusOne")
            //graph.addNode("optellen2", "weaver/PlusOne")
            //graph.addNode("Display", "weaver/Output")
            //
            //graph.addInitial("4",   "optellen1", "number")
            //graph.addInitial("OLA", "optellen1", "ping")
            //
            //graph.addEdge("optellen1", "total", "optellen2", "number")
            //graph.addEdge("optellen2", "total", "Display", "in")
            //
            //


            noflo.createNetwork(graph, function(network) {
                network.loader.registerComponent('weaver', 'PlusOne', {
                    getComponent: function() {
                        return new PlusOne;
                    }
                });
                network.loader.registerComponent('weaver', 'Output', {
                    getComponent: function() {
                        return new Output;
                    }
                });
                return network.connect(function() {
                    return network.start(console.log('Network is now running!'));
                });
            }, true);
            
            




            $("#btn-deploy-icon").removeClass('fa-download');
            $("#btn-deploy-icon").addClass('spinner');
            RED.nodes.dirty(false);
            

            $.ajax({
                url:"flows",
                type: "POST",
                data: JSON.stringify(nns),
                contentType: "application/json; charset=utf-8",
                headers: {
                    "Node-RED-Deployment-Type":deploymentType
                }
            }).done(function(data,textStatus,xhr) {
                if (hasUnusedConfig) {
                    RED.notify(
                    '<p>'+RED._("deploy.successfulDeploy")+'</p>'+
                    '<p>'+RED._("deploy.unusedConfigNodes")+' <a href="#" onclick="RED.sidebar.config.show(true); return false;">'+RED._("deploy.unusedConfigNodesLink")+'</a></p>',"success",false,6000);
                } else {
                    RED.notify(RED._("deploy.successfulDeploy"),"success");
                }
                RED.nodes.eachNode(function(node) {
                    if (node.changed) {
                        node.dirty = true;
                        node.changed = false;
                    }
                    if(node.credentials) {
                        delete node.credentials;
                    }
                });
                RED.nodes.eachConfig(function (confNode) {
                    if (confNode.credentials) {
                        delete confNode.credentials;
                    }
                });
                // Once deployed, cannot undo back to a clean state
                RED.history.markAllDirty();
                RED.view.redraw();
                RED.events.emit("deploy");
            }).fail(function(xhr,textStatus,err) {
                RED.nodes.dirty(true);
                if (xhr.responseText) {
                    RED.notify(RED._("notification.error",{message:xhr.responseText}),"error");
                } else {
                    RED.notify(RED._("notification.error",{message:RED._("deploy.errors.noResponse")}),"error");
                }
            }).always(function() {
                $("#btn-deploy-icon").removeClass('spinner');
                $("#btn-deploy-icon").addClass('fa-download');
            });
        }
    }

    return {
        init: init
    }
})();
