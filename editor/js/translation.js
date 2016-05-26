/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.translation = (function() {

    var noflo = require('noflo');
    /**
     * Retrieves the 'tabs' of a Node-RED instance
     * @param nns is the JSON structure of a Node-RED instance
     * @returns {Array} of tab objects from Node-RED
     */
    function getNodeREDTabs(nns)
    {
        var tabs = [];
        for (var i = 0; i < nns.length; i++)
        {
            if (nns[i].type === 'tab')
                tabs.push(nns[i]);
        }
        return tabs;
    }

    /**
     *
     * @param nns
     * @param nodes
     * @param links
     * @returns {Array}
     */
    function createNofloFromNodeRED(nns, nodes, links)
    {
        var graphs = [];
        var flowTabs = RED.translation.getNodeREDTabs(nns);
        // Loop through all the different flows and create a noflo graph of them
        for (var i=0; i < flowTabs.length; i++) {
            var graph = noflo.graph.createGraph(flowTabs[i].label);
            graph.setProperties({'id':flowTabs[i].id});

            // Add Nodes to Graph
            for (var j = 0; j < nodes.length; j++) {
                var node = nodes[j];

                if (node.z === flowTabs[i].id) {
                    if (node.inputs > 0) {
                        graph.addNode(node.id, node.type,
                            {
                                'id':           node.id,
                                'name':         node.name,
                                'once':         node.once,
                                'payloadType':  node.payloadType,
                                'repeat':       node.repeat,
                                'topic':        node.topic,
                                'type':         node.type,
                                'active':       node.active,
                                'complete':     node.complete,
                                'console':      node.console,
                                'x':            node.x,
                                'y':            node.y,
                                'z':            node.z
                            });
                    }
                }
            }

            // Define Edges
            for (var j = 0; j < links.length; j++) {
                var link = links[j];
                if (link.target.z === flowTabs[i].id) {
                    // Add Edges to graph
                    if (link.source.inputs == 0) {
                        graph.addInitial(link.source.payload, link.target.id, link.target.type,
                            {
                                'id': link.source.id,
                                'name': link.source.name,
                                'once': link.source.once,
                                'payloadType': link.source.payloadType,
                                'repeat': link.source.repeat,
                                'topic': link.source.topic,
                                'x': link.source.x,
                                'y': link.source.y,
                                'z': link.source.z
                            });
                    } else {
                        graph.addEdge(link.source.id, link.sourcePort, link.target.id, link.target.type);
                    }
                }
            }
            graphs.push(graph);
        }
        return graphs;
    }

    /**
     * This function requires a noflo graph and will translate it to a Weaver Object on the heroku server.
     * This makes use of the Weaver-sdk.full.js
     *
     * @Param graph is a noflo graph created from a Node-RED flow
     */
    function graphToWeaverObject(graph)
    {
        // Retrieve the $ROOT Object which enlists all behaviours (for later retrieval)
        weaver.get('Weaver Behaviours', {eagerness: -1}).then(function(entity){
            window.behaviourList = entity;

            // Create a new Weaver object/flow with the name of the graph

            weaver.add({name: graph.name}, '$NOFLO_FLOW', graph.name);
            weaver.get(graph.name, {eagerness: -1}).then(function(entity){
                window.flow = entity;

                // Add metadata used for reversed engineering to Node-RED to a the graph
                if (flow.metadata || flow.metadata == undefined) {
                    flow.metadata = {'id': graph.properties.id};
                    flow.$push('metadata');
                }
                else if (graph.properties.id) {
                    flow.$push(weaver.add({'id': graph.properties.id}, '$NOFLO_META', 'metadata'));
                }

                // Create and push the noflo processes as a collection to a Weaver flow
                flow.processes = weaver.collection();
                flow.$push('processes');

                var myNodes = graph.nodes;

                for (var i  = 0; i < myNodes.length; i++) {
                    var meta = myNodes[i].metadata;
                    flow.processes.$push(weaver.add({'component': myNodes[i].component, 'name:': myNodes[i].id,
                        'metadata': {
                            'id':           meta.id,
                            'name':         meta.name,
                            'once':         meta.once,
                            'payloadType':  meta.payloadType,
                            'repeat':       meta.repeat,
                            'topic':        meta.topic,
                            'type':         meta.type,
                            'active':       meta.active,
                            'complete':     meta.complete,
                            'console':      meta.console,
                            'x':            meta.x,
                            'y':            meta.y,
                            'z':            meta.z
                    }}, '$NOFLO_PROCESS'));
                }


                // Create and push the noflo connections as a collection to a Weaver flow
                flow.connections = weaver.collection();
                flow.$push('connections');

                var myEdges = graph.edges;
                for (var i  = 0; i < myEdges.length; i++) {
                    var edge = myEdges[i];
                    flow.connections.$push(weaver.add({
                            'src_process': edge.from.node, 'src_port': edge.from.port,
                            'tgt_process': edge.to.node, 'tgt_port': edge.to.port},
                        '$NOFLO_CONNECTION'));
                }

                // Push the noflo initializers to the connection collection of the Weaver flow
                var myInits = graph.initializers;
                for (var i  = 0; i < myInits.length; i++) {
                    var meta = myInits[i].metadata;
                    flow.connections.$push(weaver.add({'data': myInits[i].from.data,
                        'tgt_process': myInits[i].to.node, 'tgt_port': myInits[i].to.port,
                        'metadata': {
                            'id':           meta.id,
                            'name':         meta.name,
                            'once':         meta.once,
                            'payloadType':  meta.payloadType,
                            'repeat':       meta.repeat,
                            'topic':        meta.topic,
                            'x':            meta.x,
                            'y':            meta.y,
                            'z':            meta.z
                    }}, '$NOFLO_CONNECTION'));
                }

                // Add the created flow to the collection of the behaviour object
                behaviourList.behaviourCollection.$push(flow);
            });
        });
    }

    // This function requires the name (id) of a Weaver Object/flow which will be translated into a noflo graph TODO -- NOT IN USE
    function weaverObjectToGraph(flowName)
    {
        var graph = noflo.graph.createGraph(flowName);

        // Retrieve a Weaver object by it's name.
        weaver.get(flowName, {eagerness: -1}).then(function(entity) {
            window.flow = entity;

            // Get the list of all processes from the Weaver flow and add it one-by-one to the graph
            // This MUST be done before adding the connections
            var myNodes = flow.processes.$linksArray();
            while (myNodes.length > 0) {
                graph.addNode(myNodes[0]['name:'], myNodes[0].component); // the
                myNodes.shift(); // Removes object [0] from list
            }

            // Get a list of the connections and add them one-by-one to the graph
            // It is impossible to add a edge to a non-existant node
            var myConnections = flow.connections.$linksArray();
            while (myConnections.length > 0) {
                if (myConnections[0].data) /// If the connection has Data, it is an initial connection otherwise it's an edge
                    graph.addInitial(myConnections[0].data, myConnections[0].tgt_process, myConnections[0].tgt_port);
                else
                    graph.addEdge(myConnections[0].src_process, myConnections[0].src_port, myConnections[0].tgt_process, myConnections[0].tgt_port);

                myConnections.shift(); // Removes object [0] from list
            }
        });
    }

    /**
     * This function fetches all graphs stored in the Weaver heroku server and translates them to graphs
     *
     */
    function fetchWeaverObjects()
    {
        var graphs = [];
        weaver.get('Weaver Behaviours', {eagerness: -1}).then(function(entity){
            window.behaviourList = entity;

            var myBehaviours = behaviourList.behaviourCollection.$linksArray();
            for(var i = 0; i < myBehaviours.length; i++) {

                var flow = myBehaviours[i];
                var graph = noflo.graph.createGraph(flow.name);
                graph.setProperties({id:flow.metadata.id});

                // Get the list of all processes from the Weaver flow and add it one-by-one to the graph
                // This MUST be done before adding the connections
                var myNodes = flow.processes.$linksArray();
                for (var j = 0; j < myNodes.length; j++) {
                    var node = myNodes[j];
                    var metadata = myNodes[j].metadata;
                    graph.addNode(node['name:'], node.component,
                        {
                            'id':           metadata.id,
                            'name':         metadata.name,
                            'once':         metadata.once,
                            'payloadType':  metadata.payloadType,
                            'repeat':       metadata.repeat,
                            'topic':        metadata.topic,
                            'type':         metadata.type,
                            'active':       metadata.active,
                            'complete':     metadata.complete,
                            'console':      metadata.console,
                            'x':            metadata.x,
                            'y':            metadata.y,
                            'z':            metadata.z
                        });
                }

                // Get a list of the connections and add them one-by-one to the graph
                // It is impossible to add a edge to a non-existant node
                var myConnections = flow.connections.$linksArray();
                for (var j = 0; j < myConnections.length; j++) {
                    var metadata = myConnections[j].metadata;
                    if (myConnections[j].data || myConnections[j].data == "") /// If the connection has Data, it is an initial connection otherwise it's an edge
                        graph.addInitial(myConnections[j].data, myConnections[j].tgt_process, myConnections[j].tgt_port,
                            {
                                'id':           metadata.id,
                                'once':         metadata.once,
                                'name':         metadata.name,
                                'payloadType':  metadata.payloadType,
                                'repeat':       metadata.repeat,
                                'topic':        metadata.topic,
                                'x':            metadata.x,
                                'y':            metadata.y,
                                'z':            metadata.z
                            });
                    else
                        graph.addEdge(myConnections[j].src_process, myConnections[j].src_port, myConnections[j].tgt_process, myConnections[j].tgt_port);
                }
                graphs.push(graph);
            }
            return graphs;
        }).then(function(graphs){
            return createNodeREDFromNoflo(graphs);
//            return graphs;
        });
    }



    function createNodeREDFromNoflo(graphs)
    {
        var nnsNew = [];//        var flowTabs = getNodeREDTabs(nns);

        // Loop through all the different flows and create a noflo graph of them
        for (var i=0; i < graphs.length; i++) {
            var graph = graphs[i];
            // check for tab
            var tab;
            tab = {
                'type':'tab',
                'id': graph.properties['id'],
                'label': graph.name
            };
            nnsNew.push(tab);

            // check for nodes (initial)
            for (var j = 0; j < graph.initializers.length; j++) {
                var node = graph.initializers[j];
                var initialNode;
                initialNode = {
                    'id':           node.metadata.id,
                    'type':         "inject",
                    'z':            node.metadata.z,
                    'name':         (node.metadata.name) ? node.metadata.name : "",
                    'topic':        node.metadata.topic,
                    'payload':      node.from.data,
                    'payloadType':  node.metadata.payloadType,
                    'repeat':       node.metadata.repeat,
                    'crontab':      "",
                    'once':         node.metadata.once,
                    'x':            node.metadata.x,
                    'y':            node.metadata.y,
                    'wires':        (node.to.node != "") ? [[node.to.node]] : [] // Id of next node
                };
                nnsNew.push(initialNode);
            }
            // check for nodes (nodes)
            for (var j = 0; j < graph.nodes.length; j++) {
                var node = graph.nodes[j];


                var rightfulEdges = [];
                for (var k = 0; k < graph.edges.length; k++)
                {
                    var edge = graph.edges[k];
                    if (edge.from.node === node.id) {
                        rightfulEdges.push(edge.to.node);
                    }
                }

                var anyNode;
                anyNode = {
                    'id':           node.metadata.id,
                    'type':         node.metadata.type,
                    'z':            node.metadata.z,
                    'name':         (node.metadata.name) ? node.metadata.name : "",
                    'active':       node.metadata.active,
                    'console':      node.metadata.console,
                    'complete':     node.metadata.complete,
                    'x':            node.metadata.x,
                    'y':            node.metadata.y,
                    'wires':        (rightfulEdges.length != 0) ? [rightfulEdges] : []
                };
                nnsNew.push(anyNode);
            }
        }
        return nnsNew;
    }

    /**
     * Creates a random ID as used in Node-RED
     * @returns {string}
     */
    function getID() {
        return (1+Math.random()*4294967295).toString(16);
    }

    return {

        getNodeREDTabs: function(nns) {
            return getNodeREDTabs(nns);
        },
        createNofloFromNodeRED: function(nns, nodes, links) {
            return createNofloFromNodeRED(nns, nodes, links);
        },
        graphToWeaverObject: function(nofloGraph) {
            return graphToWeaverObject(nofloGraph);
        },
        weaverObjectToGraph: function(flowName) {
            return weaverObjectToGraph(flowName);
        },
        fetchWeaverObjects: function() {
            return fetchWeaverObjects();
        },
        createNodeREDFromNoflo: function(nns) {
            return createNodeREDFromNoflo(nns);
        }


    };
})();
