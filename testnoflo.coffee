fbpData = """
  'Weaver' -> NUMBER plus(math/PlusOne)
#  '999' -> RANDOM plus
  plus TOTAL -> IN Display(core/Output)
"""

noflo = require("noflo")

noflo.graph.loadFBP(fbpData, (graph) ->
  console.log("Graph loaded")
#  console.log(graph.toDOT())

  noflo.createNetwork(graph, (network) ->
    network.connect(->
      network.start(
        console.log('Network is now running!');
      )
    )
  ,true)
)