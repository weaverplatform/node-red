noflo = require('noflo')

class PlusOne extends noflo.Component
  
  constructor: (primary = 'NUMBER', res = 'TOTAL', inputType = 'number') ->
    @inPorts = {}
    @outPorts = {}
    
    @inPorts[primary] = new noflo.Port inputType
    @inPorts.clear = new noflo.Port 'bang'
    
    @inPorts['ping'] = new noflo.Port('bang')
    
    @outPorts[res] = new noflo.Port 'number'

    @primary =
      value: null
      group: []
      disconnect: false
      
    @groups = []

    calculate = =>
      for group in @primary.group
        @outPorts[res].beginGroup group
      if @outPorts[res].isAttached()
        @outPorts[res].send @calculate @primary.value
      for group in @primary.group
        @outPorts[res].endGroup()
      if @outPorts[res].isConnected() and @primary.disconnect
        @outPorts[res].disconnect()

    @inPorts[primary].on 'begingroup', (group) =>
      @groups.push group
      
    
    @inPorts[primary].on 'data', (data) =>
      @primary =
        value: data
        group: @groups.slice 0
        disconnect: false
      calculate()
      
    @inPorts[primary].on 'endgroup', =>
      @groups.pop()
      
    @inPorts[primary].on 'disconnect', =>
      @primary.disconnect = true
      return @outPorts[res].disconnect()
      
    @inPorts['ping'].on('data', (data) =>
      console.log('pong')
    )

    @inPorts.clear.on 'data', (data) =>
      if @outPorts[res].isConnected()
        for group in @primary.group
          @outPorts[res].endGroup()
        if @primary.disconnect
          @outPorts[res].disconnect()

      @primary =
        value: null
        group: []
        disconnect: false
      @groups = []

  calculate: (number) ->
    Number(number) + 1

exports.getComponent = -> new PlusOne
