/* globals expect */

const { tokenize, parse, interpret } = require("./anop.js");

const captureLogs = (funcThatLogs) => {
  const orig = console.log;
  const logs = [];
  console.log = (arg) => logs.push(arg); // only captures first arg to console.log
  funcThatLogs();
  console.log = orig;
  return logs;
};

const getOutput = (anopStr) =>
  captureLogs(() => interpret(parse(tokenize(anopStr))))[0];

test('prints "Hello, World!" inside an array', () => {
  expect(getOutput('(print ("Hello, world!"))')).toEqual(["Hello, world!"]);
});

test("adds numbers", () => {
  expect(getOutput("(print (+ 1 2 3 4 5))")).toBe(15);
});

test("subtracts numbers", () => {
  expect(getOutput("(print (- 1 2 3 4 5))")).toBe(-13);
});

test("multiplies numbers", () => {
  expect(getOutput("(print (* 1 2 3 4 5))")).toBe(120);
});

test("divides numbers", () => {
  expect(getOutput("(print (/ 1 2 3 4 5))")).toBe(1 / 2 / 3 / 4 / 5);
});

test("exponentiates numbers", () => {
  expect(getOutput("(print (^ 5 4 3 2 1 ))")).toBe((((5 ** 4) ** 3) ** 2) ** 1);
});

test("modulos numbers", () => {
  expect(getOutput("(print (% 5 4))")).toBe(1);
});
