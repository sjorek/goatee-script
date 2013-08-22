// Generated by CoffeeScript 1.6.3
/*
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
*/


(function() {
  var Expression, Stack, bindFunction, exports, isArray, isExpression, isFunction, isNumber, isString, toString, _ref, _ref1,
    __slice = [].slice;

  Stack = require('./Stack').Stack;

  _ref = require('./Utility').Utility, bindFunction = _ref.bindFunction, toString = _ref.toString, isString = _ref.isString, isArray = _ref.isArray, isNumber = _ref.isNumber, isFunction = _ref.isFunction, isExpression = _ref.isExpression;

  exports = (_ref1 = typeof module !== "undefined" && module !== null ? module.exports : void 0) != null ? _ref1 : this;

  exports.Expression = Expression = (function() {
    var _assignment, _booleanize, _callback, _errors, _evaluate, _execute, _global, _isProperty, _local, _operations, _operator, _parser, _process, _property, _reference, _resolve, _scalar, _scope, _stack, _stringify, _variable;

    _stack = null;

    _scope = null;

    _errors = null;

    _global = null;

    _local = null;

    _operations = null;

    _parser = null;

    _scalar = null;

    _property = null;

    _callback = null;

    _reference = null;

    _variable = null;

    _resolve = null;

    _assignment = null;

    _isProperty = function() {
      var p;
      p = _stack.parent();
      return (p != null) && p.operator.name === _property && p.parameters[1] === _stack.current();
    };

    Expression.execute = _execute = function(context, expression) {
      var e, result;
      if (!isExpression(expression)) {
        return expression;
      }
      _stack.push(context, expression);
      try {
        result = _process(context, expression);
      } catch (_error) {
        e = _error;
        (_errors != null ? _errors : _errors = []).push(e);
      }
      _stack.pop();
      return result;
    };

    Expression.callback = function(callback) {
      _callback = callback;
    };

    Expression.errors = function() {
      if ((_errors != null) && _errors.length !== 0) {
        _errors;
      }
      return false;
    };

    Expression.evaluate = _evaluate = function(context, expression, variables, scope, stack) {
      var isGlobalScope, result;
      if (context == null) {
        context = {};
      }
      if (!isExpression(expression)) {
        return expression;
      }
      isGlobalScope = _stack == null;
      if (isGlobalScope) {
        _stack = new Stack(context, variables, scope, stack);
        _scope = _stack.scope;
        _errors = null;
        _global = _stack.global;
        _local = _stack.local;
        _evaluate = _execute;
      }
      result = _execute(context, expression);
      if (isGlobalScope) {
        if (_callback != null) {
          _callback(expression, result, _stack, _errors);
        }
        _stack.destructor();
        _stack = null;
        _scope = null;
        _global = null;
        _local = null;
        _evaluate = Expression.evaluate;
      }
      return result;
    };

    _process = function(context, expression) {
      var left, leftValue, operator, parameters, right, rightValue, value, values, _i, _j, _len, _len1;
      operator = expression.operator, parameters = expression.parameters;
      if (operator.chain) {
        if (parameters.length !== 2) {
          throw new Error("chain only supports 2 parameters");
        }
        left = parameters[0], right = parameters[1];
        context = _execute(context, left);
        if (left.vector) {
          values = [];
          for (_i = 0, _len = context.length; _i < _len; _i++) {
            leftValue = context[_i];
            rightValue = _execute(leftValue, right);
            value = operator.evaluate.call(leftValue, leftValue, rightValue);
            if (right.vector) {
              if (!isArray(value)) {
                throw new Error("vector operation did not return an array as expected: " + (JSON.stringify(operator)));
              }
              values.push.apply(values, value);
            } else if (value != null) {
              values.push(value);
            }
          }
          return values;
        }
        rightValue = _execute(context, right);
        return operator.evaluate.call(context, context, rightValue);
      }
      if (operator.raw) {
        return operator.evaluate.apply(context, parameters);
      }
      values = [];
      for (_j = 0, _len1 = parameters.length; _j < _len1; _j++) {
        rightValue = parameters[_j];
        values.push(_execute(context, rightValue));
      }
      return operator.evaluate.apply(context, values);
    };

    Expression.booleanize = _booleanize = function(value) {
      var item, _i, _len;
      if (isArray(value)) {
        for (_i = 0, _len = value.length; _i < _len; _i++) {
          item = value[_i];
          if (_booleanize(item)) {
            return true;
          }
        }
        return false;
      }
      return Boolean(value);
    };

    Expression.stringify = _stringify = function(value) {
      var format, operator, parameter, parameters, _i, _len;
      if (!isExpression(value)) {
        return JSON.stringify(value);
      }
      operator = value.operator, parameters = value.parameters;
      format = operator.format;
      if (format != null) {
        return format.apply(this, parameters);
      } else if (parameters.length === 2) {
        return "" + (_stringify(parameters[0])) + operator + (_stringify(parameters[1]));
      } else {
        format = [];
        for (_i = 0, _len = parameters.length; _i < _len; _i++) {
          parameter = parameters[_i];
          format.push(_stringify(parameter));
        }
        return format.join(' ');
      }
    };

    Expression.operations = _operations = {
      '=': {
        evaluate: function(a, b) {
          return _local[a] = b;
        }
      },
      '.': {
        chain: true,
        evaluate: function(a, b) {
          if (a !== _global && isFunction(b)) {
            return bindFunction(b, a);
          } else {
            return b;
          }
        }
      },
      '&&': {
        raw: true,
        constant: true,
        evaluate: function(a, b) {
          a = _execute(this, a);
          if (!a) {
            return a;
          }
          b = _execute(this, b);
          return b;
        }
      },
      '||': {
        raw: true,
        constant: true,
        evaluate: function(a, b) {
          a = _execute(this, a);
          if (a) {
            return a;
          }
          b = _execute(this, b);
          return b;
        }
      },
      '?:': {
        constant: true,
        raw: true,
        vector: false,
        format: function(a, b, c) {
          return "(" + (_stringify(a)) + "?" + (_stringify(b)) + ":" + (_stringify(c)) + ")";
        },
        evaluate: function(a, b, c) {
          a = _execute(this, a);
          return _execute(this, _booleanize(a) ? b : c);
        }
      },
      '()': {
        vector: false,
        format: function() {
          var a, f;
          f = arguments[0], a = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          return f + '(' + a.join(',') + ')';
        },
        evaluate: function() {
          var a, f;
          f = arguments[0], a = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          if (f == null) {
            throw new Error("Missing argument to call.");
          }
          if (!isFunction(f)) {
            throw new Error("Given argument is not callable.");
          }
          return f.apply(this, a);
        }
      },
      '[]': {
        chain: false,
        vector: false,
        format: function(a, b) {
          return "" + a + "[" + b + "]";
        },
        evaluate: function(a, b) {
          if (isNumber(b) && b < 0) {
            return a[(a.length != null ? a.length : 0) + b];
          } else {
            return a[b];
          }
        }
      },
      context: {
        alias: 'c',
        format: function(c) {
          switch (c) {
            case "@":
              return "this";
            case "$$":
              return "_global";
            case "$_":
              return "_local";
            case "_$":
              return "_scope";
            case "__":
              return "_stack";
            case "$0":
            case "$1":
            case "$2":
            case "$3":
            case "$4":
            case "$5":
            case "$6":
            case "$7":
            case "$8":
            case "$9":
              return "_scope[" + c[1] + "]";
            case "_0":
            case "_1":
            case "_2":
            case "_3":
            case "_4":
            case "_5":
            case "_6":
            case "_7":
            case "_8":
            case "_9":
              return "_scope[_scope.length-" + (c[1] + 1) + "]";
            default:
              return "undefined";
          }
        },
        vector: false,
        evaluate: function(c) {
          switch (c) {
            case "@":
              return this;
            case "$$":
              return _global;
            case "$_":
              return _local;
            case "_$":
              return _scope;
            case "__":
              return _stack.stack;
            case "$0":
            case "$1":
            case "$2":
            case "$3":
            case "$4":
            case "$5":
            case "$6":
            case "$7":
            case "$8":
            case "$9":
            case "_0":
            case "_1":
            case "_2":
            case "_3":
            case "_4":
            case "_5":
            case "_6":
            case "_7":
            case "_8":
            case "_9":
              return _scope[c[0] === "$" ? c[1] : _scope.length - c[1] - 1];
            default:
              return void 0;
          }
        }
      },
      property: {
        alias: 'p',
        format: function(a) {
          return a;
        },
        vector: false,
        evaluate: function(a) {
          if (a === "constructor" || a === "__proto__" || a === "prototype") {
            return void 0;
          } else {
            return this[a];
          }
        }
      },
      reference: {
        alias: 'r',
        format: function(a) {
          if (a === "this") {
            return "this";
          } else {
            return "_resolve(this," + (JSON.stringify(a)) + ")." + a;
          }
        },
        vector: false,
        evaluate: function(a) {
          var c, v, _i;
          if (a === "this") {
            return this;
          } else if (a === "constructor" || a === "__proto__" || a === "prototype") {
            return void 0;
          } else {
            v = this[a];
            if (this === _local) {
              return v;
            }
            if (_isProperty()) {
              if (this.hasOwnProperty(a)) {
                return v;
              }
            } else {
              if (_local.hasOwnProperty(a)) {
                return _local[a];
              }
              for (_i = _scope.length - 1; _i >= 0; _i += -1) {
                c = _scope[_i];
                if (c.hasOwnProperty(a)) {
                  return c[a];
                }
              }
            }
            return v;
          }
        }
      },
      scalar: {
        alias: 's',
        constant: true,
        vector: false,
        format: function(a) {
          if (a === void 0) {
            return '';
          } else {
            return JSON.stringify(a);
          }
        },
        evaluate: function(a) {
          return a;
        }
      },
      block: {
        alias: 'b',
        format: function() {
          var s;
          s = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return s.join(';');
        },
        evaluate: function() {
          return arguments[arguments.length - 1];
        }
      },
      list: {
        alias: 'l',
        format: function() {
          var s;
          s = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return "" + (s.join(','));
        },
        evaluate: function() {
          return arguments[arguments.length - 1];
        }
      },
      group: {
        alias: 'g',
        format: function(l) {
          return "(" + l + ")";
        },
        evaluate: function(l) {
          return _execute(this, l);
        }
      },
      "if": {
        alias: 'i',
        raw: true,
        format: function(a, b, c) {
          if (c != null) {
            return "if " + a + " {" + b + "} else {" + c + "}";
          } else {
            return "if " + a + " {" + b + "}";
          }
        },
        evaluate: function(a, b, c) {
          if (_booleanize(_execute(this, a))) {
            return _execute(this, b);
          } else if (c != null) {
            return _execute(this, c);
          } else {
            return void 0;
          }
        }
      },
      array: {
        alias: 'a',
        format: function() {
          var e;
          e = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return "[" + (e.join(',')) + "]";
        },
        evaluate: function() {
          var e;
          e = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          return e;
        }
      },
      object: {
        alias: 'o',
        format: function() {
          var i, k, o, _i, _len;
          o = [];
          for (i = _i = 0, _len = arguments.length; _i < _len; i = _i += 2) {
            k = arguments[i];
            o.push("" + k + ":" + arguments[i + 1]);
          }
          return "{" + (o.join(',')) + "}";
        },
        evaluate: function() {
          var i, k, o, _i, _len;
          o = {};
          for (i = _i = 0, _len = arguments.length; _i < _len; i = _i += 2) {
            k = arguments[i];
            o[k] = arguments[i + 1];
          }
          return o;
        }
      }
    };

    (function() {
      var key, value, _assign, _bools, _i, _incdec, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _m, _n, _pairs, _raws, _ref2, _single;
      _reference = _operations.reference.format;
      _variable = function(a) {
        return _reference.call(this, a).replace(/^_resolve/, '_variable');
      };
      _resolve = _operations.reference.evaluate;
      _assignment = _operations['='].evaluate;
      _incdec = ['++', '--'];
      _single = ['!', '~'];
      _pairs = ['+', '-', '*', '/', '%', '^', '>>>', '>>', '<<', '&', '|'];
      _bools = ['<', '>', '<=', '>=', '===', '!=='];
      _raws = ['==', '!='];
      _assign = ['=', '-=', '+=', '*=', '/=', '%=', '^=', '>>>=', '>>=', '<<=', '&=', '|='];
      for (_i = 0, _len = _incdec.length; _i < _len; _i++) {
        key = _incdec[_i];
        _operations[key] = {
          format: (function() {
            var k;
            k = key;
            return function(a, b) {
              if (b) {
                return "" + (_variable.call(this, a)) + k;
              } else {
                return "" + k + (_variable.call(this, a));
              }
            };
          })(),
          evaluate: (function() {
            var i;
            i = key === "++" ? +1 : -1;
            return function(a, b) {
              var c;
              c = Number(_resolve.call(this, a));
              _assignment.call(this, a, c + i);
              if (b) {
                return c;
              } else {
                return c + i;
              }
            };
          })()
        };
      }
      for (_j = 0, _len1 = _single.length; _j < _len1; _j++) {
        key = _single[_j];
        _operations[key] = {
          constant: true,
          evaluate: Function("return function(a) { return " + key + " a ; };")()
        };
      }
      _ref2 = _pairs.concat(_bools).concat(_raws);
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        key = _ref2[_k];
        _operations[key] = {
          constant: true,
          evaluate: Function("return function(a,b) { return a " + key + " b ; };")()
        };
      }
      for (_l = 0, _len3 = _bools.length; _l < _len3; _l++) {
        key = _bools[_l];
        value = _operations[key];
        value.vector = false;
      }
      for (_m = 0, _len4 = _raws.length; _m < _len4; _m++) {
        key = _raws[_m];
        value = _operations[key];
        value.raw = true;
      }
      for (_n = 0, _len5 = _assign.length; _n < _len5; _n++) {
        key = _assign[_n];
        value = _operations[key] != null ? _operations[key] : _operations[key] = {};
        if (value.format == null) {
          value.format = (function() {
            var k;
            k = key;
            return function(a, b) {
              return "" + (_variable.call(this, a)) + k + (_stringify(b));
            };
          })();
        }
        if (value.evaluate == null) {
          value.evaluate = (function() {
            var _op;
            _op = _operations[key.substring(0, key.length - 1)].evaluate;
            return function(a, b) {
              return _assignment.call(this, a, _op(_resolve.call(this, a), b));
            };
          })();
        }
      }
      for (key in _operations) {
        value = _operations[key];
        value.name = key;
        value.toString = (function() {
          var k;
          k = key;
          return function() {
            return k;
          };
        })();
        value.toJSON = function() {
          return this.name;
        };
        if ((value.alias != null) && (_operations[value.alias] == null)) {
          _operations[value.alias] = key;
        }
      }
      _scalar = _operations.scalar.name;
      _property = _operations['.'].name;
    })();

    Expression.operator = _operator = function(name) {
      var op;
      if ((op = _operations[name]) != null) {
        if (op.name != null) {
          return op;
        } else {
          return _operator(op);
        }
      }
      throw new Error("operation not found: " + name);
    };

    function Expression(op, parameters) {
      var parameter, _i, _j, _len, _len1;
      this.parameters = parameters != null ? parameters : [];
      this.operator = _operator(op);
      this.constant = this.operator.constant === true;
      if (this.constant) {
        for (_i = 0, _len = parameters.length; _i < _len; _i++) {
          parameter = parameters[_i];
          if (isExpression(parameter) && !parameter.constant) {
            this.constant = false;
            break;
          }
        }
      }
      this.vector = this.operator.vector;
      if (this.vector === void 0) {
        this.vector = false;
        for (_j = 0, _len1 = parameters.length; _j < _len1; _j++) {
          parameter = parameters[_j];
          if (isExpression(parameter) && parameter.vector) {
            this.vector = true;
            break;
          }
        }
      }
      if (this.constant && this.operator.name !== _scalar) {
        return new Expression('scalar', [this.evaluate(_global)]);
      }
      return;
    }

    Expression.prototype.toString = function() {
      if (this.text !== void 0) {
        return this.text;
      }
      return this.text = _stringify(this);
    };

    Expression.prototype.toJSON = function(callback) {
      var parameter, parameters;
      if (callback) {
        return callback(this);
      }
      if (this.operator.name === 'scalar') {
        parameters = this.parameters;
      } else {
        parameters = (function() {
          var _i, _len, _ref2, _results;
          _ref2 = this.parameters;
          _results = [];
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            parameter = _ref2[_i];
            if (parameter.toJSON != null) {
              _results.push(parameter.toJSON());
            } else {
              _results.push(parameter);
            }
          }
          return _results;
        }).call(this);
      }
      return [this.operator.name].concat(parameters);
    };

    Expression.prototype.evaluate = function(context, variables, scope, stack) {
      return _evaluate(context, this, variables, scope, stack);
    };

    return Expression;

  })();

}).call(this);

/*
//@ sourceMappingURL=Expression.map
*/