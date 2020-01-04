import SyntaxError from "./SyntaxError";
import {Token, TokenStream} from "./TokenStream";

export function tokenize(expression) {
    expression = expression.replace(/\r|\n|\t|\v|\f/g, ' ');
    let cursor = 0,
        tokens = [],
        brackets = [],
        end = expression.length;

    while (cursor < end) {
        if (' ' === expression[cursor]) {
            ++cursor;
            continue;
        }

        let number = extractNumber(expression.substr(cursor));
        if (number) {
            // numbers
            number = parseFloat(number);  // floats
            tokens.push(new Token(Token.NUMBER_TYPE, number, cursor + 1));
            cursor += number.toString().length;
        } else {
            if ('([{'.indexOf(expression[cursor]) >= 0) {
                // opening bracket
                brackets.push([expression[cursor], cursor]);
                tokens.push(new Token(Token.PUNCTUATION_TYPE, expression[cursor], cursor + 1));
                ++cursor;
            }
            else {
                if (')]}'.indexOf(expression[cursor]) >= 0) {
                    if (brackets.length === 0) {
                        throw new SyntaxError(`Unexpected "${expression[cursor]}"`, cursor, expression);
                    }

                    let [expect, cur] = brackets.pop(),
                        matchExpect = expect.replace("(", ")").replace("{", "}").replace("[", "]");
                    if (expression[cursor] !== matchExpect) {
                        throw new SyntaxError(`Unclosed "${expect}"`, cur, expression);
                    }

                    tokens.push(new Token(Token.PUNCTUATION_TYPE, expression[cursor], cursor + 1));
                    ++cursor;
                }
                else {
                    let str = extractString(expression.substr(cursor));
                    if (str) {
                        //console.log("adding string: " + str);
                        tokens.push(new Token(Token.STRING_TYPE, str, cursor + 1));
                        cursor += (str.length + 2);
                    }
                    else {
                        let operator = extractOperator(expression.substr(cursor));
                        if (operator) {
                            tokens.push(new Token(Token.OPERATOR_TYPE, operator, cursor + 1));
                            cursor += operator.length;
                        }
                        else {
                            if (".,?:".indexOf(expression[cursor]) >= 0) {
                                tokens.push(new Token(Token.PUNCTUATION_TYPE, expression[cursor], cursor + 1));
                                ++cursor;
                            }
                            else {
                                let name = extractName(expression.substr(cursor));
                                if (name) {
                                    tokens.push(new Token(Token.NAME_TYPE, name, cursor + 1));
                                    cursor += name.length;
                                }
                                else {
                                    throw new SyntaxError(`Unexpected character "${expression[cursor]}"`, cursor, expression);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    tokens.push(new Token(Token.EOF_TYPE, null, cursor + 1));

    if (brackets.length > 0) {
        let [expect, cur] = brackets.pop();
        throw new SyntaxError(`Unclosed "${expect}"`, cur, expression);
    }

    return new TokenStream(expression, tokens);
}

function extractNumber(str) {
    let extracted = null;

    let matches = str.match(/^[0-9]+(?:.[0-9]+)?/);
    if (matches && matches.length > 0) {
        extracted = matches[0];
        if (extracted.indexOf(".") === -1) {
            extracted = parseInt(extracted);
        }
        else {
            extracted = parseFloat(extracted);
        }
    }
    return extracted;
}

/**
 *
 * @param str
 * @returns {null|string}
 */
function extractString(str) {
    let extracted = null;

    let matches = str.match(/^"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/s);
    if (matches && matches.length > 0) {
        //console.log("Matches: ", matches);
        extracted = matches[1] ? matches[1] : matches[2];
    }

    return extracted;
}


const operators = [
    "&&","and","||","or", // Binary
    "+", "-", "*", "/", "%", "**", // Arithmetic
    "&", "|", "^", // Bitwise
    "===", "!==", "!=", "==", "<", ">", "<=", ">=", "matches", "not in", "not", // Comparison
    "~", // String concatenation,
    '..' // Range function
];
/**
 *
 * @param str
 * @returns {null|string}
 */
function extractOperator(str) {
    let extracted = null;
    for (let operator of operators) {
        if (str.substr(0, operator.length) === operator) {
            extracted = operator;
            break;
        }
    }
    return extracted;
}

function extractName(str) {
    let extracted = null;

    let matches = str.match(/^[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/);
    if (matches && matches.length > 0) {
        extracted = matches[0];
    }

    return extracted;
}