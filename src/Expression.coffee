###
© Copyright 2013 Stephan Jorek <stephan.jorek@gmail.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing
permissions and limitations under the License.
###

global = do -> this

{Stack}         = require './Stack'
{Utility:{
  bindFn,
  toString,
  isString,
  isArray,
  isNumber,
  isFunction,
  isExpression
}}              = require './Utility'

root = module?.exports ? this

##
# @class
# @namespace goatee.Action.Expression.Compiler.Goateescript
root.Expression = class Expression

  _stack        = undefined
  _scope        = null
  _errors       = null
  _global       = null
  _variables    = null
  _operations   = null
  _parser       = null
  _context      = { '$':_global, '@':_variables }

  _isProperty   = () ->
    p = _stack.parent()
    p? and p.operator.name is '.' and p.parameters[1] is _stack.current()

  ##
  # @param {Object}           context
  # @param {Expression|mixed} expression
  _execute      = (context, expression) ->
    return expression unless isExpression expression
    _stack.push context, expression
    try
      result = _process context, expression
    catch e
      (_errors ?= []).push e.message
    finally
      _stack.pop()
    return result

  ##
  # @param {Object}           context (optional)
  # @param {Expression|mixed} expression (optional)
  # @param {Object}           variables (optional)
  # @param {Array}            stack (optional)
  # @param {Array}            expression (optional)
  # @return mixed
  Expression.evaluate = \
  _evaluate = (context={}, expression, variables, stack, scope) ->
    return expression unless isExpression expression

    isGlobalScope = _stack is undefined
    if isGlobalScope
      _stack     = new Stack(context, variables, stack, scope)
      _scope     = _stack.scope
      _errors    = null
      _global    = _stack.global
      _variables = _stack.variables
      _evaluate  = _execute

    result = _execute context, expression

    if isGlobalScope
      _stack.destructor()
      _stack     = undefined
      _scope     = null
      _global    = null
      _variables = null
      _evaluate  = Expression.evaluate

    console.log _errors if _errors?
    result

  _process = (context, expression) ->
    {operator,parameters} = expression
    if operator.chain
      unless parameters.length is 2
        throw new Error "chain only supports 2 parameters"
      [left,right] = parameters
      context = _execute context, left

      if left.vector
        values = []
        for leftValue in context
          rightValue = _execute leftValue, right
          value = operator.evaluate.call leftValue, leftValue, rightValue
          #  see if the right part of the operation is vector or not
          if right.vector
            unless isArray value
              throw new Error "vector operation did not return an array as expected: #{JSON.stringify operator}"
            values.push.apply values, value
          else if value?
            values.push value
        return values

      rightValue = _execute context, right
      return operator.evaluate.call context, context, rightValue

    if operator.raw
      return operator.evaluate.apply context, parameters

    values = []
    values.push _execute(context, rightValue) for rightValue in parameters
    operator.evaluate.apply context, values

  Expression.booleanize = _booleanize = (value) ->
    if isArray value
      for item in value
        if _booleanize item
          return true
      return false
    return Boolean value

  Expression.stringify = _stringify = (value) ->
    if not isExpression value
      return JSON.stringify value

    {operator,parameters} = value
    {format}              = operator

    if format?
      return format.apply this, parameters
    else if parameters.length is 2
      return "(#{_stringify(parameters[0])}#{operator}#{_stringify(parameters[1])})"
    else
      format = []
      format.push _stringify(parameter) for parameter in parameters
      format.join ' '

  # TODO Move to Scope !
  Expression.operations = _operations =
# _assign
    '=':  #  assignment, filled below
      evaluate: (a,b) ->
        _variables[a] = b
#    '-='  : {} #  assignment, filled below
#    '+='  : {} #  assignment, filled below
#    '*='  : {} #  assignment, filled below
#    '/='  : {} #  assignment, filled below
#    '%='  : {} #  assignment, filled below
#    '^='  : {} #  assignment, filled below
#    '>>>=': {} #  assignment, filled below
#    '>>=' : {} #  assignment, filled below
#    '<<=' : {} #  assignment, filled below
#    '&='  : {} #  assignment, filled below
#    '|='  : {} #  assignment, filled below
    '.':
      chain: true
      #  functions must be bound to their container now or else they would have the global as their context.
      evaluate: (a,b) ->
        if a isnt _global and isFunction b then bindFn b, a else b
# _single
#    '!':
#      constant: true
#      evaluate: (a) -> !a
#    '~':
#      constant: true
#      evaluate: (a) -> ~a
# _pair
#    '+':
#      constant: true
#      evaluate: (a,b) -> a + b
#    '-':
#      constant: true
#      evaluate: (a,b) -> a - b
#    '*':
#      constant: true
#      evaluate: (a,b) -> a * b
#    '/':
#      constant: true
#      evaluate: (a,b) -> a / b
#    '%':
#      constant: true
#      evaluate: (a,b) -> a % b
#    '^':
#      constant: true
#      evaluate: (a,b) -> a ^ b
#    '>>>':
#      constant: true
#      evaluate: (a,b) -> a >>> b
#    '>>':
#      constant: true
#      evaluate: (a,b) -> a >> b
#    '<<':
#      constant: true
#      evaluate: (a,b) -> a << b
#    '&':
#      constant: true
#      evaluate: (a,b) -> a & b
#    '|':
#      constant: true
#      evaluate: (a,b) -> a | b
    '&&':
      raw     : true
      constant: true
      evaluate: (a,b) ->
        a = _execute this, a
        if not a
          return a
        b = _execute this, b
        return b
    '||':
      raw     : true
      constant: true
      evaluate: (a,b) ->
        a = _execute this, a
        if a
          return a
        b = _execute this, b
        return b
# _bools
#    '<':
#      constant: true
#      vector: false
#      evaluate: (a,b) -> a < b
#    '>':
#      constant: true
#      vector: false
#      evaluate: (a,b) -> a > b
#    '<=':
#      constant: true
#      vector: false
#      evaluate: (a,b) -> a <= b
#    '>=':
#      constant: true
#      vector: false
#      evaluate: (a,b) -> a >= b
#    '===':
#      constant: true
#      vector: false
#      evaluate: (a,b) -> `a === b`
#    '!==':
#      constant: true
#      vector: false
#      evaluate: (a,b) -> `a !== b`
# _raws
#    '==':
#      constant: true
#      vector: false
#      raw     : true
#      evaluate: (a,b) ->
#        #return `a[0] == b` if isArray a and a.length is 1
#        #return `a == b[0]` if isArray b and b.length is 1
#        return `a == b`
#    '!=':
#      constant: true
#      vector: false
#      raw     : true
#      evaluate: (a,b) ->
#        #return `a[0] != b` if isArray a and a.length is 1
#        #return `a != b[0]` if isArray b and b.length is 1
#        return `a != b`
    '?:':
      constant: true
      raw     : true
      vector: false
      format: (a, b, c) ->
        "(#{_stringify(a)}?#{_stringify(b)}:#{_stringify(c)})"
      evaluate: (a, b, c) ->
        a = _execute this, a
        _execute this, if _booleanize a then b else c
    #'$':
    #  format: -> '$'
    #  vector: false
    #  evaluate: -> _global
    #'@':
    #  format: -> '@'
    #  vector: false
    #  evaluate: -> this
    '()':
      vector: false
      format: (func, args...) ->
        func + '(' + args.join(',') + ')'
      evaluate: (func, args...) ->
        throw new Error "Missing argument to call." unless func?
        throw new Error "Given argument is not callable." unless isFunction func
        func.apply this, args
    '[]':
      chain: false
      vector: false
      format: (a,b) -> "#{a}[#{b}]"
      evaluate: (a, b) ->
        #  support negative indexers, if you literally want "-1" then use a string literal
        if isNumber(b) and b < 0
          index = (if a.length? then a.length else 0) + b
        else
          index = b
        a[index]
    '{}':
      chain: true
      vector: false
      format: (a,b) -> "#{a}{#{b}}"
      evaluate: (a, b) -> if _booleanize b then a else undefined
    context:
      alias   : 'c'
      format  : (a) -> a
      vector  : false
      evaluate: (a) -> _context[a]
    reference:
      alias   : 'r'
      format  : (a) -> a
      vector  : false
      evaluate: (a) ->
        ref   = _isProperty()
        value = this[a]
        if ref
          return value if this.hasOwnProperty a
        else
          return _variables[a] if _variables.hasOwnProperty a
          #  walk the context stack from top to bottom looking for value
          for context in _scope by -1
            return context[a] if context.hasOwnProperty a
        value
    #children:
    #  alias   : 'C'
    #  format  : -> '*'
    #  vector  : true
    #  #watch   : (object, expression, handler, connect) -> gl_as.watch object, handler, connect
    #  evaluate: () ->
    #    if isArray @
    #      _.clone @
    #    else
    #      _.values @
    primitive:
      alias   : 'p'
      constant: true
      vector  : false
      format  : (a) -> JSON.stringify a
      evaluate: (a) -> a
    block:
      alias   : 'b'
      format  : (statements...) -> statements.join ';'
      evaluate: -> arguments[arguments.length-1]
    if:
      alias   : 'i'
      raw     : true
      format  : (a, b, c) ->
        if c?
          "if (#{a}) {#{b}} else {#{c}}"
        else
          "if (#{a}) {#{b}}"
      evaluate: (a, b, c) ->
        if _booleanize _execute(this, a)
          _execute this, b
        else if c?
          _execute this, c
        else
          undefined
    #for:
    #  alias   : 'f'
    #  raw     : true
    #  format  : (a, b) -> "for (#{a}) {#{b}}"
    #  evaluate: (a, b) ->
    #    a = _execute this, a
    #    return undefined unless a?
    #    for value in _.values a
    #      _execute value, b
    array:
      alias   : 'a'
      format  : (elements...) -> "[#{elements.join ','}]"
      evaluate: (elements...) -> elements
    object:
      alias   : 'o'
      format  : ->
        buffer = []
        buffer.push "#{k}:#{arguments[i+1]}" for k,i in arguments by 2
        "{#{buffer.join ','}}"
      evaluate: ->
        object = {}
        object[k] = arguments[i+1] for k,i in arguments by 2
        object

  do ->

    _evaluateRef = _operations.reference.evaluate
    _formatRef   = _operations.reference.format
    _assignment  = _operations['='].evaluate

    _single = ['!', '~', ]
    _pairs  = ['+', '-', '*', '/', '%', '^', '>>>', '>>', '<<', '&', '|']
    _bools  = ['<', '>', '<=', '>=', '===', '!==']
    _raws   = ['==', '!=']
    _assign = ['=', '-=', '+=', '*=', '/=', '%=', '^=', '>>>=', '>>=', '<<=', '&=', '|=']

    for key in _single
      _operations[key] =
        constant: true
        evaluate: Function("return function(a) { return #{key} a ; };")()

    for key in _pairs.concat(_bools).concat(_raws)
      _operations[key] =
        constant: true
        evaluate: Function("return function(a,b) { return a #{key} b ; };")()

    for key in _bools
      value = _operations[key]
      value.vector = false

    for key in _raws
      value = _operations[key]
      value.raw = true

    # process assigments and equality
    for key in _assign
      value = if _operations[key]? then _operations[key] else _operations[key] = {}
      value.format   ?= do -> k = key; (a,b) ->
        "(#{_formatRef(a)}#{k}#{_stringify(b)})"
      if key.length is 1
        continue
      value.evaluate ?= do ->
        _op = _operations[key.substring 0, key.length - 1].evaluate
        (a,b) ->
          _assignment a, _op(_evaluateRef(a), b)

    for key, value of _operations
      value.name       = key
      value.toString   = do -> k = key; -> k
      value.toJSON     = -> @name

      # process assigments and equality
      if value.alias? and not _operations[value.alias]?
        _operations[value.alias] = key
    return

  Expression.operator = _operator = (name) ->
    if (op = _operations[name])?
      return if op.name? then op else _operator op
    throw new Error "operation not found: #{name}"

  ##
  # @param {Array.<>} context
  # @return void
  # @constructor
  constructor: (op, @parameters=[]) ->
    @operator   = _operator(op)

    #  is this expression a constant?
    @constant = @operator.constant is true
    if @constant
      for parameter in parameters
        if isExpression(parameter) and not parameter.constant
          @constant = false
          break

    #  does this expression yield a vector result?
    @vector = @operator.vector
    if @vector is undefined
      @vector = false     #   assume false
      for parameter in parameters
        # if the parameter has a vector quantity
        # then the result is a vector result
        if isExpression(parameter) and parameter.vector
          @vector = true
          break

    #  if this expression is a constant then we pre-evaluate it now
    #  and just return a primitive expression with the result
    if @constant and @operator.name isnt _operations.primitive.name
      return new Expression 'primitive', [ @evaluate global ]

    #  otherwise return this expression
    return

  ##
  # @return String
  toString: ->
    return @text unless @text is undefined
    @text = _stringify(this)

  ##
  # @return Object.<String:op,Array:parameters>
  toJSON: (callback) ->
    return callback this if callback
    [@operator.name].concat @parameters

  ##
  # @param {Object} context (optional)
  # @return mixed
  evaluate: (context) ->
    _evaluate context, this
