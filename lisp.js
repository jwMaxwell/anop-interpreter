fs = require('fs');

/**
 * 
 * @param {String} text The users input
 * @returns Tokens to organize the AST
 */
const tokenize = (text) =>
  text.replace(/^[\s]*\;.*\n?/gm, '')
    .split('"')
    .map((val, i) => {
      if (i % 2 === 0) // if we are not in a string
        return val.replace(/\(/g, ' ( ')
          .replace(/\)/g, ' ) ');
      else // we are in a string
        return val.replace(/ /g, '\\whitespace\\');
    })
    .join('"')
    .trim() // get rid of trailing whitespace
    .split(/\s+/) // split on whitespace
    .map(val => val.replace('\\whitespace\\', " "));

const makeNode = (token) => {
  if (!isNaN(parseFloat(token))) // if its a number
    return {type: "number", value: parseFloat(token)};
  else if (token[0] === '"') // if its a string
    return {type: "string", value: token.slice(1, token.length - 1)};
  else
    return {type: "id", value: token};
}

const parse = (tokens, ast) => {
  if (ast === undefined) { 
    return parse(tokens, []);
  }
  else {
    const curTok = tokens.shift();  
    if (curTok === undefined) {
      return ast.pop(); // ends with extra array
    }
    else if (curTok === '(') {
      ast.push(parse(tokens, []));
      return parse(tokens, ast); // new subtree
    }
    else if (curTok === ')') {
      return ast; // end subtree
    }
    else { // must be and id or value
      return parse(tokens, ast.concat(makeNode(curTok)));
    }
  }
}

const interpret = (ast, cxt) => {

}

const main = () => {
  const input =
    fs.readFileSync(process.argv[2], { encoding: 'utf8', flag: 'r' });
  
  const tokens = tokenize(input);
  console.log(`tokens: ${tokens}`); //debug

  const nodes = parse(tokens, []);
  console.log(nodes); //debug
  //console.log(parse(tokens, []));

}

main();