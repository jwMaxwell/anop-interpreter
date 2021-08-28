const { exit } = require("process");

const prompt = require("prompt-sync")();
fs = require("fs");

const colorize = {
  reset: (x) => "\x1b[0m" + x,
  bright: (x) => "\x1b[1m" + x + "\x1b[0m",
  dim: (x) => "\x1b[2m" + x + "\x1b[0m",
  underline: (x) => "\x1b[4m" + x + "\x1b[0m",
  blink: (x) => "\x1b[5m" + x + "\x1b[0m",
  fgBlack: (x) => "\x1b[30m" + x + "\x1b[0m",
  fgRed: (x) => "\x1b[31m" + x + "\x1b[0m",
  fgGreen: (x) => "\x1b[32m" + x + "\x1b[0m",
  fgYellow: (x) => "\x1b[33m" + x + "\x1b[0m",
  fgBlue: (x) => "\x1b[34m" + x + "\x1b[0m",
  fgMagenta: (x) => "\x1b[35m" + x + "\x1b[0m",
  fgCyan: (x) => "\x1b[36m" + x + "\x1b[0m",
  fgWhite: (x) => "\x1b[37m" + x + "\x1b[0m",
  error: (x) => "\x1b[1m\x1b[31m" + x + "\x1b[0m",
};

/**
 * @param {String} text The users input
 * @returns Tokens to organize the AST
 */
const tokenize = (text) =>
  `( ${text} )`
    .replaceAll(/^[\s]*\;.*\n?/gm, "")
    .split('"')
    .map((val, i) =>
      i % 2 === 0
        ? val.replace(/\(/g, " ( ").replace(/\)/g, " ) ")
        : val.replace(/ /g, "\\whitespace\\")
    )
    .join('"')
    .trim() // get rid of trailing whitespace
    .split(/\s+/) // split on whitespace
    .map((val) => val.replaceAll("\\whitespace\\", " "));

const makeNode = (token) => {
  if (!isNaN(parseFloat(token)))
    // if its a number
    return { type: "number", value: parseFloat(token) };
  else if (token[0] === '"')
    // if its a string
    return { type: "string", value: token.slice(1, token.length - 1) };
  else if (token in operators) return { type: "operator", value: token };
  else return { type: "id", value: token };
};

const parse = (tokens, ast = []) => {
  const curTok = tokens.shift();
  if (curTok === undefined) return ast.pop();
  // ends with extra array
  else if (curTok === "(") {
    ast.push(parse(tokens, []));
    return parse(tokens, ast); // new subtree
  } else if (curTok === ")") return ast;
  // end subtree
  // must be and id or value
  else return parse(tokens, ast.concat(makeNode(curTok)));
};

const funcs = {
  print: (x) => console.log(x),
  clear: (_) => console.clear(),
  read: (_) => prompt(""),
  head: (x) => x[0],
  tail: (x) => x.slice(1),
  range: (x) => [...Array(x[1] - x[0]).keys()].map((t) => t + x[0]),
  push: (x) => x[1].push(x[0]),
  copy: (x) => x,
  pop: (x) => x.pop(),
  rm: (x) => x.slice(0, -1),
  eval: (x) => interpret(parse(tokenize(x))),
  inject: (x) => eval(x),
};

const operators = {
  "+": (op = (x) => x.reduce((a, b) => a + b)),
  "-": (op = (x) => x.reduce((a, b) => a - b)),
  "*": (op = (x) => x.reduce((a, b) => a * b)),
  "/": (op = (x) => x.reduce((a, b) => a / b)),
  "%": (op = (x) => x.reduce((a, b) => a % b)),
  "^": (op = (x) => x.reduce((a, b) => a ** b)),
  "|": (op = (x) => x.some((t) => t)),
  "&": (op = (x) => x.every((t) => t)),
  ">": (op = (x) =>
    x.every((val, i) => val === x.sort((a, b) => a - b).reverse()[i]) &&
    x.filter((val, i) => x.indexOf(val) !== i)),
  "<": (op = (x) =>
    x.every((val, i) => val === x.sort((a, b) => a - b)[i]) &&
    x.filter((val, i) => x.indexOf(val) !== i)),
  ">=": (op = (x) =>
    x.every((val, i) => val === x.sort((a, b) => a - b).reverse()[i])),
  "<=": (op = (x) => x.every((val, i) => val === x.sort((a, b) => a - b)[i])),
  "=": (op = (x) => x.every((val, i, arr) => val === arr[0])),
  "~": (op = (x) => !x.every((val, i, arr) => val === arr[0])),
};

const controlFlow = {
  if: (input, ctx) =>
    interpret(input[1], ctx)
      ? interpret(input[2], ctx)
      : interpret(input[3], ctx),

  var: (input, ctx) => {
    ctx.parent[input[1].value] = interpret(input[2], ctx);
    return interpret(input[2], ctx);
  },

  expr: (input, ctx) => {
    return (x) => {
      x = Object.values(Object(x)); //for some reason x is passed an object array??
      const exprCtx = ctx;
      for (let i = 0; i < input[1].length; ++i)
        exprCtx[input[1][i].value] = x[i];

      return interpret([input[2]], exprCtx);
    };
  },

  import: (input, ctx) => {
    input.push(
      parse(
        tokenize(
          fs.readFileSync(`${input[1].value}`, { encoding: "utf8", flag: "r" })
        )
      )
    );
    return interpret(input[2], ctx);
  },
};

const identify = (id, ctx) => {
  if (id in ctx) return ctx[id];
  else if (id === "exit") exit();
  else if (ctx.parent !== undefined) return identify(id, ctx.parent);

  console.error(colorize.error(`identifier "${id}" unknown`));
  exit();
};

const interpret = (input = [], ctx = { scope: {}, parent: funcs }) => {
  if (Array.isArray(input)) {
    if (input.length > 0 && input[0].value in controlFlow)
      return controlFlow[input[0].value](input, ctx);
    else {
      input = input.map((t) => interpret(t, { scope: {}, parent: ctx }));
      if (input[0] instanceof Function && input[0].name === "op")
        return input[0].apply(null, [input.slice(1)]);
      else if (input[0] instanceof Function)
        return input[0].apply(null, input.slice(1));
      else return input;
    }
  } else if (input.type === "id") return identify(input.value, ctx);
  else if (input.type === "operator") {
    return operators[input.value];
  } else if (input.type === "number" || input.type === "string")
    return input.value;
};

const checkParens = (input) => {
  const temp = input.split("");
  const result = [];
  for (let n of temp) {
    if (n === "(") result.push(n);
    else if (n === ")" && result.length) result.pop();
    else if (n === ")") return false;
  }
  return result.length ? false : true;
};

const debug = (input) => {
  console.log("Input:");
  console.log(input);

  console.log("Tokens:");
  console.log(tokenize(input));

  console.log("AST:");
  console.log(parse(tokenize(input)));
};

const main = () => {
  // gather the data
  const flags = process.argv[2][0] === "-" ? process.argv[2] : "";
  let file = flags === "" ? process.argv[2] : process.argv[3];
  const input = flags.includes("c")
    ? prompt("anop > ")
    : fs.readFileSync(file, { encoding: "utf8", flag: "r" });

  // operate on the data
  if (input === null) exit();
  if (!checkParens(input)) {
    console.log(colorize.error("Unbalanced Parens"));
    exit();
  }
  if (flags.includes("d"))
    // debug information
    debug(input);

  interpret(parse(tokenize(input)));

  if (flags.includes("c")) main();
};

main();
