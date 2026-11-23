/* MiniGeo Math Engine — parser seguro e cálculos numéricos/simbólicos básicos. */
(function (global) {
  'use strict';

  const FUNCTIONS = new Set(['sin','cos','tan','asin','acos','atan','sqrt','abs','ln','log','exp','floor','ceil']);
  const CONSTANTS = new Set(['pi','e']);

  function normalize(source) {
    let text = String(source ?? '').trim()
      .replace(/[−–—]/g, '-')
      .replace(/[×·]/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'pi')
      .replace(/\s+/g, '');
    // Suporta |x| em exemplos simples e evita manter uma gramática duplicada para barras.
    text = text.replace(/\|([^|]+)\|/g, 'abs($1)');
    return text;
  }

  function tokenize(source) {
    const text = normalize(source);
    const raw = [];
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (/\d|\./.test(c)) {
        const start = i;
        let dots = 0;
        while (i < text.length && /[\d.]/.test(text[i])) { if (text[i] === '.') dots++; i++; }
        if (dots > 1 || text[start] === '.') throw new Error('Número inválido na expressão.');
        if (/[eE]/.test(text[i] || '')) {
          i++; if (/[+-]/.test(text[i] || '')) i++;
          const expStart = i;
          while (i < text.length && /\d/.test(text[i])) i++;
          if (i === expStart) throw new Error('Expoente numérico incompleto.');
        }
        raw.push({ type: 'number', value: Number(text.slice(start, i)) });
        continue;
      }
      if (/[a-zA-Z_]/.test(c)) {
        const start = i++;
        while (i < text.length && /[a-zA-Z_\d]/.test(text[i])) i++;
        raw.push({ type: 'id', value: text.slice(start, i).toLowerCase() });
        continue;
      }
      if ('+-*/^(),'.includes(c)) { raw.push({ type: c, value: c }); i++; continue; }
      throw new Error(`Caractere não reconhecido: “${c}”.`);
    }
    const result = [];
    const canEnd = t => t && (t.type === 'number' || t.type === 'id' || t.type === ')');
    const canStart = t => t && (t.type === 'number' || t.type === 'id' || t.type === '(');
    for (let j = 0; j < raw.length; j++) {
      const prev = raw[j - 1], cur = raw[j];
      if (canEnd(prev) && canStart(cur)) {
        const functionCall = prev.type === 'id' && cur.type === '(' && FUNCTIONS.has(prev.value);
        const namedFunction = prev.type === 'id' && cur.type === 'id' && FUNCTIONS.has(prev.value);
        if (!functionCall && !namedFunction) result.push({ type: '*', value: '*' });
      }
      result.push(cur);
    }
    return result;
  }

  function parse(source) {
    const tokens = tokenize(source);
    if (!tokens.length) throw new Error('Digite uma expressão matemática.');
    let pos = 0;
    const peek = () => tokens[pos];
    const take = type => {
      const token = tokens[pos];
      if (!token || (type && token.type !== type)) throw new Error(`Esperado “${type || 'token'}” na expressão.`);
      pos++; return token;
    };
    function add(a, b) { return { type: 'binary', op: '+', left: a, right: b }; }
    function sub(a, b) { return { type: 'binary', op: '-', left: a, right: b }; }
    function mul(a, b) { return { type: 'binary', op: '*', left: a, right: b }; }
    function div(a, b) { return { type: 'binary', op: '/', left: a, right: b }; }
    function num(v) { return { type: 'number', value: v }; }
    function parseAdd() {
      let node = parseMul();
      while (peek() && (peek().type === '+' || peek().type === '-')) {
        const op = take().type, right = parseMul(); node = { type: 'binary', op, left: node, right };
      }
      return node;
    }
    function parseMul() {
      let node = parseUnary();
      while (peek() && (peek().type === '*' || peek().type === '/')) {
        const op = take().type, right = parseUnary(); node = { type: 'binary', op, left: node, right };
      }
      return node;
    }
    function parseUnary() {
      if (peek() && (peek().type === '+' || peek().type === '-')) {
        const op = take().type; return { type: 'unary', op, arg: parseUnary() };
      }
      return parsePower();
    }
    function parsePower() {
      let node = parsePrimary();
      if (peek() && peek().type === '^') { take('^'); node = { type: 'binary', op: '^', left: node, right: parseUnary() }; }
      return node;
    }
    function parsePrimary() {
      const token = peek();
      if (!token) throw new Error('A expressão terminou antes de completar o cálculo.');
      if (token.type === 'number') { take(); return num(token.value); }
      if (token.type === '(') { take('('); const node = parseAdd(); take(')'); return node; }
      if (token.type === 'id') {
        const name = take('id').value;
        if (peek() && peek().type === '(') {
          if (!FUNCTIONS.has(name)) throw new Error(`“${name}” não é uma função conhecida.`);
          take('('); const arg = parseAdd(); take(')'); return { type: 'call', name, arg };
        }
        if (name === 'x' || name === 'y' || name === 'z') return { type: 'var', name };
        if (CONSTANTS.has(name)) return { type: 'constant', name };
        throw new Error(`Variável ou função desconhecida: “${name}”.`);
      }
      throw new Error('Use números, x, parênteses e operadores matemáticos.');
    }
    const tree = parseAdd();
    if (pos < tokens.length) throw new Error(`Parte inesperada da expressão perto de “${tokens[pos].value}”.`);
    return tree;
  }

  function evaluate(node, vars = {}) {
    if (!node) return NaN;
    switch (node.type) {
      case 'number': return node.value;
      case 'constant': return node.name === 'pi' ? Math.PI : Math.E;
      case 'var': return Number(vars[node.name] ?? (node.name === 'x' ? vars.x : NaN));
      case 'unary': { const v = evaluate(node.arg, vars); return node.op === '-' ? -v : v; }
      case 'binary': {
        const a = evaluate(node.left, vars), b = evaluate(node.right, vars);
        if (node.op === '+') return a + b;
        if (node.op === '-') return a - b;
        if (node.op === '*') return a * b;
        if (node.op === '/') return a / b;
        if (node.op === '^') return Math.pow(a, b);
        return NaN;
      }
      case 'call': {
        const v = evaluate(node.arg, vars);
        return ({ sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil })[node.name](v);
      }
      default: return NaN;
    }
  }

  function differentiate(node) {
    if (!node) return null;
    switch (node.type) {
      case 'number': case 'constant': return { type: 'number', value: 0 };
      case 'var': return { type: 'number', value: node.name === 'x' ? 1 : 0 };
      case 'unary': { const d = differentiate(node.arg); return d && { type: 'unary', op: node.op, arg: d }; }
      case 'binary': {
        const a = node.left, b = node.right, da = differentiate(a), db = differentiate(b);
        if (!da || !db) return null;
        if (node.op === '+') return { type: 'binary', op: '+', left: da, right: db };
        if (node.op === '-') return { type: 'binary', op: '-', left: da, right: db };
        if (node.op === '*') return { type: 'binary', op: '+', left: { type: 'binary', op: '*', left: da, right: b }, right: { type: 'binary', op: '*', left: a, right: db } };
        if (node.op === '/') return { type: 'binary', op: '/', left: { type: 'binary', op: '-', left: { type: 'binary', op: '*', left: da, right: b }, right: { type: 'binary', op: '*', left: a, right: db } }, right: { type: 'binary', op: '^', left: b, right: { type: 'number', value: 2 } } };
        if (node.op === '^') {
          if (b.type === 'number') return { type: 'binary', op: '*', left: { type: 'binary', op: '*', left: b, right: { type: 'binary', op: '^', left: a, right: { type: 'number', value: b.value - 1 } } }, right: da };
          return { type: 'binary', op: '*', left: { type: 'binary', op: '^', left: a, right: b }, right: { type: 'binary', op: '+', left: { type: 'binary', op: '*', left: db, right: { type: 'call', name: 'ln', arg: a } }, right: { type: 'binary', op: '*', left: b, right: { type: 'binary', op: '/', left: da, right: a } } } };
        }
        return null;
      }
      case 'call': {
        const d = differentiate(node.arg); if (!d) return null;
        const x = node.arg;
        const outer = { sin: { type: 'call', name: 'cos', arg: x }, cos: { type: 'unary', op: '-', arg: { type: 'call', name: 'sin', arg: x } }, tan: { type: 'binary', op: '/', left: { type: 'number', value: 1 }, right: { type: 'binary', op: '^', left: { type: 'call', name: 'cos', arg: x }, right: { type: 'number', value: 2 } } }, ln: { type: 'binary', op: '/', left: { type: 'number', value: 1 }, right: x }, log: { type: 'binary', op: '/', left: { type: 'number', value: 1 }, right: { type: 'binary', op: '*', left: x, right: { type: 'constant', name: 'ln10' } } }, exp: { type: 'call', name: 'exp', arg: x }, sqrt: { type: 'binary', op: '/', left: { type: 'number', value: 1 }, right: { type: '*', left: { type: 'number', value: 2 }, right: { type: 'call', name: 'sqrt', arg: x } } } }[node.name];
        if (!outer || node.name === 'abs' || node.name === 'asin' || node.name === 'acos' || node.name === 'atan' || node.name === 'floor' || node.name === 'ceil') return null;
        return { type: 'binary', op: '*', left: outer, right: d };
      }
      default: return null;
    }
  }

  // Corrige o nó de multiplicação criado no caso sqrt e adiciona a constante ln10.
  function normalizeTree(node) {
    if (!node || typeof node !== 'object') return node;
    if (node.type === 'constant' && node.name === 'ln10') return { type: 'number', value: Math.log(10) };
    if (node.type === '*') return { type: 'binary', op: '*', left: normalizeTree(node.left), right: normalizeTree(node.right) };
    for (const key of ['left','right','arg']) if (node[key]) node[key] = normalizeTree(node[key]);
    return node;
  }

  function simplify(node) {
    if (!node || typeof node !== 'object') return node;
    if (node.type === 'unary') {
      const arg = simplify(node.arg);
      if (arg.type === 'number') return { type: 'number', value: node.op === '-' ? -arg.value : arg.value };
      return { type: 'unary', op: node.op, arg };
    }
    if (node.type === 'binary') {
      const a = simplify(node.left), b = simplify(node.right), op = node.op;
      if (a.type === 'number' && b.type === 'number') {
        if (op === '+') return { type: 'number', value: a.value + b.value };
        if (op === '-') return { type: 'number', value: a.value - b.value };
        if (op === '*') return { type: 'number', value: a.value * b.value };
        if (op === '/') return { type: 'number', value: a.value / b.value };
        if (op === '^') return { type: 'number', value: Math.pow(a.value, b.value) };
      }
      if (op === '+' && a.type === 'number' && a.value === 0) return b;
      if (op === '+' && b.type === 'number' && b.value === 0) return a;
      if (op === '-' && b.type === 'number' && b.value === 0) return a;
      if (op === '*' && (a.type === 'number' && a.value === 0 || b.type === 'number' && b.value === 0)) return { type: 'number', value: 0 };
      if (op === '*' && a.type === 'number' && a.value === 1) return b;
      if (op === '*' && b.type === 'number' && b.value === 1) return a;
      if (op === '*' && a.type === 'number' && b.type === 'binary' && b.op === '*' && b.left.type === 'number') return simplify({ type: 'binary', op: '*', left: { type: 'number', value: a.value * b.left.value }, right: b.right });
      if (op === '*' && b.type === 'number' && a.type === 'binary' && a.op === '*' && a.right.type === 'number') return simplify({ type: 'binary', op: '*', left: { type: 'number', value: a.right.value * b.value }, right: a.left });
      if (op === '/' && b.type === 'number' && b.value === 1) return a;
      if (op === '^' && b.type === 'number' && b.value === 0) return { type: 'number', value: 1 };
      if (op === '^' && b.type === 'number' && b.value === 1) return a;
      return { type: 'binary', op, left: a, right: b };
    }
    if (node.type === 'call') return { ...node, arg: simplify(node.arg) };
    return node;
  }

  const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  function format(node, parent = 0) {
    if (!node) return 'não disponível';
    if (node.type === 'number') return Number.isInteger(node.value) ? String(node.value) : formatNumber(node.value);
    if (node.type === 'constant') return node.name === 'pi' ? 'π' : node.name;
    if (node.type === 'var') return node.name;
    if (node.type === 'call') return `${node.name === 'ln' ? 'ln' : node.name}(${format(node.arg)})`;
    if (node.type === 'unary') return `${node.op === '-' ? '−' : ''}${format(node.arg, 4)}`;
    if (node.type === 'binary') {
      const p = PRECEDENCE[node.op];
      const left = format(node.left, p), right = format(node.right, p + (node.op === '^' ? -1 : 0));
      const op = node.op === '*' ? ' · ' : node.op === '-' ? ' − ' : ` ${node.op} `;
      const result = `${left}${op}${right}`;
      return p < parent ? `(${result})` : result;
    }
    return '?';
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return value === Infinity ? '∞' : value === -Infinity ? '−∞' : 'indefinido';
    if (Math.abs(value) < 1e-10) return '0';
    if (Math.abs(value - Math.round(value)) < 1e-4) return String(Math.round(value));
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
  }
  function numeric(source) { const value = Number(String(source).replace(',', '.').replace(/[∞]/g, 'Infinity').replace(/−/g, '-')); return Number.isFinite(value) || value === Infinity || value === -Infinity ? value : NaN; }
  function expression(source) { return normalizeTree(parse(source)); }
  function value(source, x, extra = {}) { return evaluate(expression(source), { x, ...extra }); }
  function derivative(source, order = 1) {
    let tree = expression(source), steps = [];
    for (let i = 0; i < order; i++) { const next = normalizeTree(differentiate(tree)); if (!next) return { tree: null, expression: null, steps, numeric: true }; tree = simplify(next); steps.push(format(tree)); }
    return { tree, expression: format(tree), steps, numeric: false };
  }
  function safeEval(tree, vars) { try { const v = evaluate(tree, vars); return Number.isFinite(v) ? v : NaN; } catch (_) { return NaN; } }
  function numericDerivative(tree, x) {
    const h = Math.max(1e-5, Math.abs(x) * 1e-5); return (safeEval(tree, { x: x + h }) - safeEval(tree, { x: x - h })) / (2 * h);
  }
  function roots(fn, min, max, count = 1000) {
    const found = [], step = (max - min) / count;
    let px = min, py = fn(px);
    for (let i = 1; i <= count; i++) {
      const x = min + i * step, y = fn(x);
      if (Number.isFinite(py) && Math.abs(py) < 1e-7) found.push(px);
      if (Number.isFinite(py) && Number.isFinite(y) && py * y < 0) {
        let a = px, b = x;
        for (let j = 0; j < 45; j++) { const m = (a + b) / 2, fm = fn(m); if (!Number.isFinite(fm)) break; if (fn(a) * fm <= 0) b = m; else a = m; }
        found.push((a + b) / 2);
      }
      px = x; py = y;
    }
    return [...new Set(found.filter(Number.isFinite).map(v => Number(v.toFixed(7))))].sort((a,b) => a-b);
  }

  function limit(source, at, direction = 'ambos') {
    const tree = expression(source); const a = numeric(at);
    if (!Number.isFinite(a) && a !== Infinity && a !== -Infinity) throw new Error('Informe um ponto numérico, ∞ ou −∞.');
    const sides = direction === 'esquerda' ? [-1] : direction === 'direita' ? [1] : [-1, 1];
    const sideValues = sides.map(side => {
      const samples = [];
      const steps = a === Infinity || a === -Infinity ? [10, 30, 100, 300, 1000] : [0.1, 0.01, 0.001, 0.0001, 0.00001];
      for (const d of steps) { const x = a === Infinity ? d * 10 : a === -Infinity ? -d * 10 : a + side * d; samples.push({ x, y: safeEval(tree, { x }) }); }
      const last = samples[samples.length - 1].y, prev = samples[samples.length - 2].y;
      let result = Number.isFinite(last) && Number.isFinite(prev) ? last + (last - prev) / 9 : last;
      if (Number.isFinite(last) && Number.isFinite(prev) && Math.abs(last - prev) > Math.max(1e-3, Math.abs(last) * 1e-3)) result = NaN;
      if (Math.abs(last) > 1e8) result = last > 0 ? Infinity : -Infinity;
      return { side, result, samples };
    });
    const finite = sideValues.map(s => s.result);
    const same = finite.length === 1 || (finite.every(Number.isFinite) && Math.abs(finite[0] - finite[1]) < 1e-3 * Math.max(1, Math.abs(finite[0]), Math.abs(finite[1])));
    const result = same ? finite[0] : NaN;
    const table = sideValues.flatMap(s => s.samples.map(q => ({ x: formatNumber(q.x), fx: formatNumber(q.y), lado: s.side < 0 ? 'esquerda' : 'direita' })));
    return { value: result, left: sideValues.find(s => s.side < 0)?.result, right: sideValues.find(s => s.side > 0)?.result, table, tree };
  }

  function extrema(source, kind = 'absolutos', a = -5, b = 5) {
    const tree = expression(source), d = derivative(source, 1).tree;
    const min = kind === 'locais' ? Math.min(a, b) : a, max = kind === 'locais' ? Math.max(a, b) : b;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) throw new Error('Informe um intervalo válido, com a < b.');
    const fn = x => safeEval(tree, { x }), dfn = d ? x => safeEval(d, { x }) : x => numericDerivative(tree, x);
    const critical = roots(dfn, min, max, 900).filter(x => x > min + 1e-5 && x < max - 1e-5);
    const points = critical.map(x => {
      const y = fn(x), delta = Math.max(1e-3, (max-min)/10000), before = fn(x-delta), after = fn(x+delta);
      const type = before < y && after < y ? 'max' : before > y && after > y ? 'min' : 'crítico';
      return { x, y, type };
    }).filter(p => Number.isFinite(p.y));
    const values = kind === 'absolutos' ? [...points, { x: min, y: fn(min), type: 'ponta' }, { x: max, y: fn(max), type: 'ponta' }].filter(p => Number.isFinite(p.y)) : points;
    const maximum = values.length ? values.reduce((a,b) => b.y > a.y ? b : a) : null;
    const minimum = values.length ? values.reduce((a,b) => b.y < a.y ? b : a) : null;
    const sorted = [min, ...critical, max].sort((x,y) => x-y);
    const signs = [];
    for (let i=0; i<sorted.length-1; i++) { const mid=(sorted[i]+sorted[i+1])/2, s=dfn(mid); signs.push({ intervalo:`(${formatNumber(sorted[i])}, ${formatNumber(sorted[i+1])})`, sinal:s>=0?'+':'−', comportamento:s>=0?'Crescente':'Decrescente' }); }
    return { tree, derivative: d, points, values, maximum, minimum, signs };
  }

  function optimization(data) {
    const objectiveText = String(data.quantidade || '').split('=').slice(1).join('=').trim();
    if (!objectiveText) throw new Error('Escreva a quantidade no formato A = expressão.');
    const objective = expression(objectiveText);
    const restriction = String(data.restricao || '').trim();
    let left, right;
    if (restriction.includes('=')) { const parts = restriction.split('='); left = expression(parts[0]); right = expression(parts.slice(1).join('=')); }
    else throw new Error('Escreva uma restrição no formato expressão = expressão.');
    const variable = data.variavel || 'x', other = variable === 'x' ? 'y' : 'x';
    const fn = x => {
      const residual = y => safeEval(left, { x: variable==='x'?x:y, y: variable==='y'?x:y }) - safeEval(right, { x: variable==='x'?x:y, y: variable==='y'?x:y });
      const r0 = residual(0), r1 = residual(1), slope = r1-r0;
      if (!Number.isFinite(r0) || !Number.isFinite(slope) || Math.abs(slope)<1e-10) return NaN;
      const otherValue = -r0/slope;
      return safeEval(objective, { x: variable==='x'?x:otherValue, y: variable==='y'?x:otherValue });
    };
    const a = Number(data.de), b = Number(data.ate); if (!Number.isFinite(a)||!Number.isFinite(b)||a>=b) throw new Error('Informe um domínio válido, com o primeiro valor menor que o segundo.');
    const dfn = x => { const h=Math.max(1e-5, Math.abs(x)*1e-5); return (fn(x+h)-fn(x-h))/(2*h); };
    const candidates = roots(dfn, a, b, 900).concat(data.bordas ? [a,b] : []).filter(x => x>=a && x<=b && Number.isFinite(fn(x)));
    if (!candidates.length) throw new Error('Não foi possível encontrar um ponto válido no domínio informado.');
    const choose = data.objetivo === 'min' ? candidates.reduce((p,c)=>fn(c)<fn(p)?c:p) : candidates.reduce((p,c)=>fn(c)>fn(p)?c:p);
    const residual = y => safeEval(left,{x:variable==='x'?choose:y,y:variable==='y'?choose:y}) - safeEval(right,{x:variable==='x'?choose:y,y:variable==='y'?choose:y});
    const rv0=residual(0), rv1=residual(1), otherValue=Math.abs(rv1-rv0)>1e-10 ? -rv0/(rv1-rv0) : NaN;
    const optimum = fn(choose);
    return { variable, other, x: variable==='x'?choose:otherValue, y: variable==='y'?choose:otherValue, optimum, objectiveText, restriction, candidates, function: fn };
  }

  global.MiniGeoMath = { parse: expression, evaluate, value, derivative, limit, extrema, optimization, format, formatNumber, normalize, safeEval };
})(window);
