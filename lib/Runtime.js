/* ^
BSD 3-Clause License

Copyright (c) 2017, Stephan Jorek
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function() {
    var Expression, Runtime, arraySlice, bindFunction, isArray, isExpression, isFunction, isNumber, isString, parse, ref;

    Expression = require('./Expression');

    ref = require('./Utility'), arraySlice = ref.arraySlice, bindFunction = ref.bindFunction, isString = ref.isString, isArray = ref.isArray, isNumber = ref.isNumber, isFunction = ref.isFunction, isExpression = ref.isExpression, parse = ref.parse;


    /*
     * Runtime
     * -------
     *
     * Implements several expression-runtime related methods.
     *
     */


    /**
     *  -------------
     * @class Runtime
     * @namepace GoateeScript
     */

    Runtime = (function() {
        var _aliases, _operations;

        function Runtime() {}

        _operations = Expression.operations;


        /**
         *  -------------
         * @method aliases
         * @return {Array}
         * @static
         */

        Runtime.aliases = _aliases = (function() {
            var index;
            index = null;
            return function() {
                return index != null ? index : index = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_'.split('');
            };
        })();


        /**
         *  -------------
         * @method generate
         * @param  {Boolean} [compress=true]
         * @return {String}
         * @static
         */

        Runtime.generate = (function() {
            var alias, aliases, assemble, body, clean, code, i, index, js, key, len, pattern, ref1, runtime, unwrap, value, vars;
            aliases = [];
            ref1 = _aliases().reverse();
            for (i = 0, len = ref1.length; i < len; i++) {
                alias = ref1[i];
                if (_operations[alias] == null) {
                    aliases.push(alias);
                }
            }
            index = aliases.length;
            if (index === 0) {
                return;
            }
            for (key in _operations) {
                value = _operations[key];
                if (!((value.name != null) && (value.alias == null))) {
                    continue;
                }
                _operations[value.alias = aliases[--index]] = key;
                if (index === 0) {
                    break;
                }
            }
            _operations['()'].code = "function(){\n  var a,f;\n  f=arguments[0],a=2<=arguments.length?aS(arguments,1):[];\n  return f.apply(this,a);\n}";
            runtime = {
                global: {
                    name: 'global',
                    alias: index === 0 ? '_g' : aliases[--index],
                    code: 'null'
                },
                local: {
                    name: 'local',
                    alias: index === 0 ? '_l' : aliases[--index],
                    code: 'null'
                },
                stack: {
                    name: 'stack',
                    alias: index === 0 ? 'st' : aliases[--index],
                    code: '[]'
                },
                scope: {
                    name: 'scope',
                    alias: index === 0 ? 'sc' : aliases[--index],
                    code: '[]'
                },
                evaluate: {
                    name: 'evaluate',
                    alias: index === 0 ? '_e' : aliases[--index],
                    code: "function(c,e,v,_,$) {\n  var g,r;\n  if(!(isFunction(e) && e.name)){return e;}\n  g = _global === null ? _evaluate : false;\n  if (g) {\n    _global   = c||{};\n    _local    = v||{};\n    _scope    = _||_scope.length = 0||_scope;\n    _stack    = $||_stack.length = 0||_stack;\n    _evaluate = _execute;\n  };\n  r = _execute(c,e);\n  if (g) {\n    _global   = null;\n    _evaluate = g;\n  };\n  return r;\n}",
                    evaluate: Expression.evaluate
                },
                execute: {
                    name: 'execute',
                    alias: index === 0 ? '_x' : aliases[--index],
                    code: "function(c,e) {\n  var r,f;\n  if(!(isFunction(e) && e.name)){return e;};\n  _scope.push(c);\n  _stack.push(e);\n  try {\n    r = _process(c,e); /* ?!?!?!?! */\n  } catch(f) {};\n  _scope.pop();\n  _stack.pop();\n  return r;\n}",
                    evaluate: Expression.execute
                },
                call: {
                    name: 'call',
                    alias: index === 0 ? 'ca' : aliases[--index],
                    code: 'Function.prototype.call'
                },
                slice: {
                    name: 'slice',
                    alias: index === 0 ? 'sl' : aliases[--index],
                    code: 'Array.prototype.slice'
                },
                toString: {
                    name: 'toString',
                    alias: index === 0 ? 'tS' : aliases[--index],
                    code: 'Object.prototype.toString'
                },
                booleanize: {
                    name: 'booleanize',
                    alias: index === 0 ? '_b' : aliases[--index],
                    evaluate: Expression.booleanize
                },
                isFunction: {
                    name: 'isFunction',
                    alias: index === 0 ? 'iF' : aliases[--index],
                    evaluate: isFunction
                },
                bindFunction: {
                    name: 'bindFunction',
                    alias: index === 0 ? 'bF' : aliases[--index],
                    code: "(function(bindFunction) {\n  return bindFunction ? function() {\n      return bindFunction.apply(arguments);\n    } : function() {\n      var f, c, a;\n      f = arguments[0];\n      c = arguments[1];\n      a = 3 <= arguments.length ? arraySlice(arguments, 2) : [];\n      return a.length === 0\n        ? function() { return f.call(c); }\n        : function() { return f.apply(c, a); };\n    }\n})(Function.prototype.bind)",
                    evaluate: bindFunction
                },
                isArray: {
                    name: 'isArray',
                    alias: index === 0 ? 'iA' : aliases[--index],
                    code: "(function(isArray) {\n  return isArray || function(o){return _toString.call(o)==='[object Array]';};\n})(Array.isArray)",
                    evaluate: isArray
                },
                arraySlice: {
                    name: 'arraySlice',
                    alias: index === 0 ? 'aS' : aliases[--index],
                    evaluate: arraySlice
                },
                hasProperty: {
                    name: 'hasProperty',
                    alias: index === 0 ? 'hP' : aliases[--index],
                    code: "(function(hasProperty) {\n  return function() {\n    hasProperty.apply(arguments);\n  };\n})({}.hasOwnProperty)"
                },
                isProperty: {
                    name: 'isProperty',
                    alias: index === 0 ? 'iP' : aliases[--index],
                    code: "function() {\n  if(_stack.length < 2){return false;}\n  var p = _stack.length > 1 ? _stack[_stack.length-2] : void(0),\n      c = _stack.length > 0 ? _stack[_stack.length-1] : void(0);\n  return p.toString() === '" + _operations['.'].alias + "' && p[1] === c;\n}"
                }
            };
            unwrap = /^function\s*\(([^\)]*)\)\s*\{\s*(\S[\s\S]*[;|\}])\s*\}$/;
            pattern = [/(\s|\n)+/g, ' ', /_assignment/g, _operations['='].alias, /_reference/g, _operations.reference.alias, /_global/g, runtime.global.alias, /_local/g, runtime.local.alias, /_scope/g, runtime.scope.alias, /_stack/g, runtime.stack.alias, /_evaluate/g, runtime.evaluate.alias, /_execute/g, runtime.execute.alias, /_booleanize/g, runtime.booleanize.alias, /__slice\.call|arraySlice/g, runtime.arraySlice.alias, /_slice/g, runtime.slice.alias, /_call/g, runtime.call.alias, /([^\.])isArray/g, "$1" + runtime.isArray.alias, /_toString/g, runtime.toString.alias, /isNumber/g, runtime.global.alias, /isFunction/g, runtime.isFunction.alias, /bindFunction/g, runtime.bindFunction.alias, /_isProperty/g, runtime.isProperty.alias, /hasProperty/g, runtime.hasProperty.alias, /([a-zA-Z]+)\.hasOwnProperty\(/g, runtime.hasProperty.alias + "($1,", /(_l)en/g, index === 0 ? "$1" : aliases[--index], /obj([^e])|item/g, 'o$1', /value/g, 'v', /\(array,start,end\)/g, '()', /([a-z0-9])\s([^a-z0-9])/gi, '$1$2', /([^a-z0-9])\s([a-z0-9])/gi, '$1$2', /([^a-z0-9])\s([^a-z0-9])/gi, '$1$2', /([a-z0-9])\s([^a-z0-9])/gi, '$1$2', /([^a-z0-9])\s([a-z0-9])/gi, '$1$2', /([^a-z0-9])\s([^a-z0-9])/gi, '$1$2', /return(\S)/gi, 'return $1'];
            clean = function(key, value, code) {
                var j, len1, search;
                for (index = j = 0, len1 = pattern.length; j < len1; index = j += 2) {
                    search = pattern[index];
                    code = code.replace(search, pattern[index + 1]);
                }
                if (key.length > 1 && key[key.length - 1] === '=') {
                    alias = _operations[key.substring(0, key.length - 1)].alias;
                    code = code.replace('_op', alias);
                }
                return code;
            };
            vars = [];
            body = [];
            assemble = function(object) {
                var code, results;
                results = [];
                for (key in object) {
                    value = object[key];
                    if (!(value.name != null)) {
                        continue;
                    }
                    code = clean(key, value, value.code != null ? value.code : value.evaluate.toString());
                    vars.push(['/* ', key, ' */ ', value.alias].join(''));
                    results.push(body.push(['/* ', key, ' */ ', value.alias, '=', code].join('')));
                }
                return results;
            };
            assemble(runtime);
            assemble(_operations);
            code = "var " + (vars.join(',\n')) + ";\n" + (body.join(';\n')) + ";";
            js = code.replace(/\/\*(?:.|[\r\n])*?\*\/\s*|/g, '').replace(/\s*[;]\s*[\}]/g, '}').replace(/([,;])[\r\n]/g, '$1');
            return function(compress) {
                if (compress == null) {
                    compress = true;
                }
                if (compress === true) {
                    return js;
                } else {
                    return code;
                }
            };
        })();

        return Runtime;

    })();

    module.exports = Runtime;

}).call(this);
//# sourceMappingURL=Runtime.js.map
