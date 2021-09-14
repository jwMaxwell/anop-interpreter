const { exit } = require("process");
const prompt = require("prompt-sync")();
const fs = require("fs");

// TODO: Does this need to be here? This seems like something specific to a certain utility function. This should go into a separate file and that file should export a function that lets you log things in different colors.
// e.g. `export const print = (color, msg) => {...}`
const colorize = {
  error: (x) => "\x1b[1m\x1b[31m" + x + "\x1b[0m",
};

/**
 * @param {String} text The users input
 * @returns Tokens to organize the AST
 */
const tokenize = (text) =>
  `( ${text} )`
    // TODO: you should absolutely have tests for this function. Something that says "tokenize(input) had better always equal X"
    // TODO: I suspect you could do 95% of this function with a single regex
    // TODO: I think a string should be a single token, you could do that with a regex
    // TODO: the backslash before the ; is not needed
    //.replaceAll(/^[\s]*;.*\n?/gm, "")
      .replaceAll(/;(.*?)\n/g, "")
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

const operators = {
  "+": (x) => x.reduce((a, b) => a + b),
  "-": (x) => x.reduce((a, b) => a - b),
  "*": (x) => x.reduce((a, b) => a * b),
  "/": (x) => x.reduce((a, b) => a / b),
  "%": (x) => x.reduce((a, b) => a % b),
  "^": (x) => x.reduce((a, b) => a ** b),
  "++": (x) => x.map((t) => ++t),
  "--": (x) => x.map((t) => --t),
  "|": (x) => x.some((t) => t),
  "&": (x) => x.every((t) => t),
  ">": (x) =>
    x.every((val, i) => val === x.sort((a, b) => a - b).reverse()[i]) &&
    x.filter((val, i) => x.indexOf(val) !== i),
  "<": (x) =>
    x.every((val, i) => val === x.sort((a, b) => a - b)[i]) &&
    x.filter((val, i) => x.indexOf(val) !== i),
  ">=": (x) =>
    x.every((val, i) => val === x.sort((a, b) => a - b).reverse()[i]),
  "<=": (x) => x.every((val, i) => val === x.sort((a, b) => a - b)[i]),
  "=": (x) => x.every((val, i, arr) => val === arr[0]),
  "~": (x) => !x.every((val, i, arr) => val === arr[0]),
  ".": (x) => x.flat(),
};

const makeNode = (token) => {
  if (!isNaN(parseFloat(token)))
    return { type: "number", value: parseFloat(token) };
  else if (token[0] === '"')
    return { type: "string", value: token.slice(1, token.length - 1) };
  else if (token in operators) return { type: "operator", value: token };
  else return { type: "id", value: token };
};

const parse = (tokens, ast = []) => {
  let temp = tokens;
  const curTok = temp.shift();
  if (curTok === undefined) return ast.pop();
  else if (curTok === "(") {
    ast.push(parse(temp, []));
    return parse(temp, ast); // new subtree
  } else if (curTok === ")") return ast;
  else return parse(temp, [...ast, makeNode(curTok)]);
};

const funcs = {
  print: (x) => console.log(x),
  clear: () => console.clear(),
  read: () => prompt(""),
  readf: (x) => fs.readFileSync(x[0], { encoding: "utf8", flag: "r" }),
  printf: (x) => fs.writeFileSync(x[0], x[1]),
  head: (x) => x[0],
  tail: (x) => x.slice(1),
  length: (x) => x.length,
  get: (x) => x[1][x[0]],
  push: (x) => [...x[1], x[0]],
  pop: (x) => x.slice(0, x.length - 1),
  eval: (x) => interpret(parse(tokenize(x))),
  inject: (x) => eval(x),
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

  expr: (input, ctx) => (x) => {
    x = Object.values(Object(x)); //for some reason x is passed an object array??
    const exprCtx = ctx;
    for (let i = 0; i < input[1].length; ++i) exprCtx[input[1][i].value] = x[i];

    return interpret([input[2]], exprCtx);
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
      if (
        input[0] instanceof Function &&
        Object.values(operators).includes(input[0])
      )
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

// TODO: move this to a different file. Separate your logic from your I/O.
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

module.exports.tokenize = tokenize;
module.exports.parse = parse;
module.exports.interpret = interpret;
module.exports.anop = (str) => interpret(parse(tokenize(str)));
