http = require('http')
express = require("express")
RED = require("./red/red")

# Create an Express app
app = express()

# Add a simple route for static content served from 'public'
app.use("/",express.static("public"))

# Create a server
server = http.createServer(app)

# Create the settings object - see default settings.js file for other options
settings = {
  httpAdminRoot:"/red",
  httpNodeRoot: "/api",
  userDir:"./../weaver-build/client/flows/.nodered/",
  flowFile:"flows.json",
  functionGlobalContext: { }    # enables global context
}

# Initialise the runtime with a server and settings
RED.init(server,settings)

# Serve the editor UI from /red
app.use(settings.httpAdminRoot, RED.httpAdmin)

# Serve the http nodes UI from /api
app.use(settings.httpNodeRoot, RED.httpNode)

server.listen(8000)

RED.api.theme.context().page.title   = "Node-red Weaver"
RED.api.theme.context().header.title = "Node-red Weaver"

# Start the runtime
RED.start()