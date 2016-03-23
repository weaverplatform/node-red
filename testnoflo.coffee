fbpData = """

  '4'             -> NUMBER optellen1(PlusOne)
  optellen1 TOTAL -> NUMBER optellen2(PlusOne)
  'OLA'           -> PING   optellen1 
  optellen2 TOTAL -> IN     Display(core/Output)

"""

noflo = require("noflo")





graph = noflo.graph.createGraph("count")

graph.addNode("optellen1", "PlusOne")
graph.addNode("optellen2", "PlusOne")
graph.addNode("Display", "core/Output")

graph.addInitial("4",   "optellen1", "NUMBER")
graph.addInitial("OLA", "optellen1", "ping")

graph.addEdge("optellen1", "TOTAL", "optellen2", "NUMBER")
graph.addEdge("optellen2", "TOTAL", "Display", "in")


noflo.createNetwork(graph, (network) ->
  network.connect(->
    network.start(
      console.log('Network is now running!')
    )
  )
,true)



#noflo.graph.loadFBP(fbpData, (graph) ->
#  console.log("Graph loaded")
##  console.log(graph.toDOT())
#
#  noflo.createNetwork(graph, (network) ->
#    network.connect(->
#      network.start(
#        console.log('Network is now running!')
#      )
#    )
#  ,true)
#)





#'msg + " world!"'  -> CODE functie(Function)
#'hello'            -> MSG  functie
#functie RESULT     -> IN   Display(core/Output)