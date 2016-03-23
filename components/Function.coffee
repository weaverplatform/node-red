noflo = require('noflo')

class Function extends noflo.Component
  
  constructor:  ->
    @inPorts = {}
    @outPorts = {}
    
    @inPorts['code']    = new noflo.Port('string')
    @inPorts['msg']     = new noflo.Port('object')
    @outPorts['result'] = new noflo.Port('string')
    
    @code = null

    evaluate = (data) =>
      code = (msg) =>
        eval(@code)
        
      @outPorts['result'].send(code(data))
    
    @inPorts['msg'].on 'data', (data) =>
      do evaluate(data) unless @code is null 
      
    @inPorts['code'].on 'data', (data) =>
      @code = data


exports.getComponent = -> new Function
