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
var Benchmark, evaluate, isArray, parse, ref, render;

Benchmark = require('benchmark');

ref = require('../lib/GoateeScript'), evaluate = ref.evaluate, parse = ref.parse, render = ref.render;

isArray = require('../lib/Utility').isArray;

describe("GoateeScript", function() {
    var benchmark, compare, data, egal, sum;
    data = {
        clothes: [{
            name: 'Shirt',
            sizes: ['S', 'M', 'L'],
            price: 14.50,
            quantity: 8
        }, {
            name: 'Pants',
            sizes: [29, 30, 31, 32],
            price: 20.19,
            quantity: 6
        }, {
            name: 'Shoes',
            sizes: [8, 9, 10],
            price: 25.85,
            quantity: 15
        }, {
            name: 'Ties',
            sizes: [2],
            price: 3.99,
            quantity: 3
        }],
        codes: {
            alpha: {
                discount: 10,
                items: 4
            },
            beta: {
                discount: 20,
                items: 2
            },
            charlie: {
                discount: 30,
                items: 1
            }
        },
        favoriteChild: 'pat',
        children: {
            pat: {
                name: 'pat',
                age: 28,
                children: {
                    jay: {
                        name: 'jay',
                        age: 4
                    },
                    bob: {
                        name: 'bob',
                        age: 8
                    }
                }
            },
            skip: {
                name: 'skip',
                age: 30,
                children: {
                    joe: {
                        name: 'joe',
                        age: 7
                    }
                }
            }
        },
        dynamic: 0,
        increment: function(count) {
            return this.dynamic += count;
        },
        min: function(a, b) {
            if (b == null) {
                return a;
            }
            if (a == null) {
                return b;
            }
            if (a.valueOf() <= b.valueOf()) {
                return a;
            } else {
                return b;
            }
        },
        max: function(a, b) {
            if (b == null) {
                return a;
            }
            if (a == null) {
                return b;
            }
            if (a.valueOf() >= b.valueOf()) {
                return a;
            } else {
                return b;
            }
        },
        sum: sum = function(a) {
            var i, item, len, number, total;
            if (a == null) {
                return 0;
            }
            if (isArray(a)) {
                total = 0;
                for (i = 0, len = a.length; i < len; i++) {
                    item = a[i];
                    total += sum(item);
                }
                return total;
            }
            number = Number(a);
            if (isNaN(number)) {
                return 0;
            } else {
                return number;
            }
        }
    };
    benchmark = new Benchmark.Suite;
    egal = function(code, expected) {
        var expression;
        expression = parse(code);
        return expect(expression.evaluate(data)).toBe(expected);
    };
    compare = function(code, expected) {
        var expression;
        expression = parse(code);
        return expect(JSON.stringify(expression.evaluate(data))).toBe(JSON.stringify(expected));
    };
    it('can add two positive numbers', function() {
        return egal('1+1', 2);
    });
    xit('can add two positive numbers in given time', function(done) {
        return benchmark.add('goatee-script  : 1+1', function() {
            return evaluate('1+1');
        }).add('javascript     : 1+1', function() {
            return 1 + 1;
        }).add('javascript eval: 1+1', function() {
            return eval('1+1');
        }).on('cycle', function(event) {
            return console.log(String(event.target));
        }).on('complete', function() {
            expect(this.filter('fastest').pluck('name')[0]).toBe('javascript     : 1+1');
            return done();
        }).run({
            async: false
        });
    });
    it('resolves expression vectors', function() {
        expect(parse('5').vector).toBe(false);
        expect(parse('5+2').vector).toBe(false);
        return expect(parse('func(alpha)').vector).toBe(false);
    });
    it('resolves one or multiple collapsing “undefined” values', function() {
        var i, len, results, s, statements;
        statements = ['', ';;;;', ';/* nix */;'];
        results = [];
        for (i = 0, len = statements.length; i < len; i++) {
            s = statements[i];
            expect(evaluate(s)).toBe(void 0);
            results.push(expect(render(s)).toBe(''));
        }
        return results;
    });
    it('resolves one or multiple “null” values', function() {
        var i, len, results, s, statements;
        statements = ['null', 'null;null', 'null;null;null'];
        results = [];
        for (i = 0, len = statements.length; i < len; i++) {
            s = statements[i];
            expect(evaluate(s)).toBe(null);
            results.push(expect(render(s)).toBe(s));
        }
        return results;
    });
    it('resolves multiple “null” and collapsing “undefined” values', function() {
        var i, len, results, s, statements;
        statements = [';null;null;;', 'null;;null;;', 'null;/*;null;*/null;;'];
        results = [];
        for (i = 0, len = statements.length; i < len; i++) {
            s = statements[i];
            expect(evaluate(s)).toBe(null);
            results.push(expect(render(s)).toBe('null;null'));
        }
        return results;
    });
    it('resolves scalar values (primitives)', function() {
        egal("5", 5);
        egal("'5'", '5');
        egal("1 + 2", 3);
        egal("1 + 2 * 3", 7);
        return egal("'a' + 'b'", 'ab');
    });
    it('resolves object access', function() {
        egal("codes", data.codes);
        egal("codes.alpha", data.codes.alpha);
        egal("codes.alpha.discount", data.codes.alpha.discount);
        return egal("codes.discount", void 0);
    });
    xit('resolves object with children access', function() {
        compare("*", _.values(data));
        compare("codes.*", [data.codes.alpha, data.codes.beta, data.codes.charlie]);
        compare("codes.*.discount", [10, 20, 30]);
        return compare("codes.*{discount > 10}", [data.codes.beta, data.codes.charlie]);
    });
    it('resolves array access', function() {
        egal("clothes[0]", data.clothes[0]);
        return egal("clothes[-1]", data.clothes[data.clothes.length - 1]);
    });
    it('resolves scope access', function() {
        egal("children", data.children);
        return egal("children.children", void 0);
    });
    xit('resolves children access', function() {
        compare("children.*", [data.children.pat, data.children.skip]);
        compare("children.*.children", [data.children.pat.children, data.children.skip.children]);
        return compare("children.*.children.*", [data.children.pat.children.jay, data.children.pat.children.bob, data.children.skip.children.joe]);
    });
    xit('resolves object access predicates', function() {
        egal("@{clothes != null}", data);
        compare("@{clothes == null}", void 0);
        compare("children.*{name == 'skip'}", [data.children.skip]);
        return compare("children.*{children.*{age < 5}}", [data.children.pat]);
    });
    it('resolves constructor access', function() {
        egal("codes.constructor", void 0);
        egal("codes.__proto__", void 0);
        return egal("codes.prototype", void 0);
    });
    it('resolves prototype access', function() {
        egal("codes + ''", data.codes.toString());
        egal("codes.toString()", data.codes.toString());
        egal("codes.valueOf()", data.codes.valueOf());
        return egal("clothes.length", 4);
    });
    xit('resolves array access predicates', function() {
        compare("clothes.*.sizes.*{@ % 2 == 0}", [30, 32, 8, 10, 2]);
        return compare("clothes.*{sizes == 'M' || sizes == 9}", [{
            name: 'Shirt',
            sizes: ['S', 'M', 'L'],
            price: 14.50,
            quantity: 8
        }, {
            name: 'Shoes',
            sizes: [8, 9, 10],
            price: 25.85,
            quantity: 15
        }]);
    });
    it('resolves context references', function() {
        egal("@", data);
        egal("$$", data);
        compare("test = 1 ; $_", {
            test: 1
        });
        return egal("children[favoriteChild]", data.children.pat);
    });
    xit('resolves context references with predicate', function() {
        return egal("children.*{name == favoriteChild}[0]", data.children.pat);
    });
    xit('resolves context specific operation using .(local paths) syntax.', function() {
        return egal("sum(clothes.*.(price * quantity))", 636.86);
    });
    it('resolves context reference function calls', function() {
        egal("min(12, 20)", 12);
        return egal("max(30, 50)", 50);
    });
    it('resolves object and array literals', function() {
        var ary, obj;
        obj = {
            alpha: data.codes.alpha.discount,
            beta: 2
        };
        ary = [3, 2, data.codes.beta.discount];
        compare('{alpha:codes.alpha.discount,"beta":2}', obj);
        compare('[3,2,codes.beta.discount]', ary);
        obj.charlie = ary;
        return compare('{alpha:codes.alpha.discount,' + '"beta":2,' + 'charlie:[3,2,codes.beta.discount]}', obj);
    });
    it('resolves “if”/“else” conditions', function() {
        data.dynamic = 0;
        egal("if (codes != null) {\n  increment(10);\n}\nelse {\n  increment(20);\n};\ndynamic;", 10);
        return expect(data.dynamic).toBe(10);
    });
    it('resolves chained “if”/“else if”/“else” conditions', function() {
        var code;
        code = "if (0 === dynamic) {\n  increment(10);\n}\nelse if (1 === dynamic) {\n  increment(19);\n}\nelse {\n  increment(30 - dynamic);\n};\ndynamic;";
        data.dynamic = 0;
        egal(code, 10);
        expect(data.dynamic).toBe(10);
        data.dynamic = 1;
        egal(code, 20);
        expect(data.dynamic).toBe(20);
        data.dynamic = 2;
        egal(code, 30);
        return expect(data.dynamic).toBe(30);
    });
    xit('resolves “for”-loop and multiline statements', function() {
        return compare("for (clothes) {\n  p = price;\n  q = quantity;\n  p * q;\n}", [116, 121.14000000000001, 387.75, 11.97]);
    });
    it('resolves early terminating conditionals', function() {
        data.dynamic = 0;
        egal("increment(10) || increment(20); dynamic;", 10);
        expect(data.dynamic).toBe(10);
        data.dynamic = 0;
        egal("increment(0) && increment(20); dynamic;", 0);
        expect(data.dynamic).toBe(0);
        data.dynamic = 0;
        egal("false ? increment(10) : increment(20); dynamic;", 20);
        return expect(data.dynamic).toBe(20);
    });
    it('resolves all mathematical assignments', function() {
        return egal("variable = 40 + 5;  /* = 45 */\nvariable *= 10;     /* = 450 */\nvariable /= 5;      /* = 90 */\nvariable -= 40;     /* = 50 */\nvariable += 15;     /* = 65 */\nvariable++    ;     /* = 66 */\nvariable--    ;     /* = 65 */\n++variable    ;     /* = 66 */\n--variable    ;     /* = 65 */", 65);
    });
    it('resolves context assignments', function() {
        return egal("variable = codes;\nvariable.alpha;", data.codes.alpha);
    });
    return it('resolves local variable and context property having the same name', function() {
        return egal("favoriteChild = 'Kris';\nfavoriteChild + $$favoriteChild;", "Krispat");
    });
});
//# sourceMappingURL=GoateeScriptTestSpec.js.map
