#!/usr/bin/env node

import readline from 'readline';
import highlight from 'prism-cli';
import Prism from 'prismjs';
import fs from 'fs';
import path from 'path';
import os from 'os';

const prompt = '> ';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt
});

let cmd = '';
rl._writeToOutput = function _writeToOutput(string) {
    let cmd_code = javascript(string);
    let code_above = format_input_code(cmd);
    log_error(char_before_cursor() ?? '');
    if (char_before_cursor() == '}') {
        if (code_above) {
            code_above = code_above.replace(/\{/, '\x1b[7m{\x1b[m');
        }
    }
    if (code_above) {
        process.stdout.write(ansi_rewrite_above(code_above));
    }
    rl.output.write(cmd_code);
};

rl.on('line', function(line) {
    cmd += line;
    const output = ansi_rewrite_above(javascript(cmd));
    process.stdout.write(output);
    cmd += '\n';
});

process.stdin.on('keypress', (c, k) => {
    setTimeout(function() {
        // we force triggering rl._writeToOutput function
        // so we have the change to syntax highlight the command line
        // this needs to happen on next tick so the string have time
        // to updated with a given key
        rl._refreshLine();
    }, 0);
});

rl.prompt();

function strip_ansi(str) {
    return str.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}

function calculate_overflow(str) {
    const cols = process.stdout.columns;
    return Math.floor(strip_ansi(str).length / cols);
}

function format_input_code(code) {
    if (code) {
        // we remove trailing newline from code
        code = code.substring(0, code.length - 1);
        return javascript(code);
    }
}

function char_before_cursor() {
    return rl.line[rl.cursor - 1];
}

function ansi_rewrite_above(ansi_code, overflow = 0) {
    const lines = ansi_code.split('\n');
    const stdout = lines.map((line, i) => {
        line = prompt + line;
        overflow += calculate_overflow(line);
        return '\x1b[K' + line;
    }).join('\n');
    const len = lines.length;
    // overwrite all lines to get rid of any artifacts left my stdin
    // mostly because of parenthesis matching
    return `\x1b[${len + overflow}F${stdout}\n`;
}

function javascript(str) {
    return highlight(str, 'javascript', {
        grammar: Prism.languages.javascript,
        newlines: true
    });
}

function log_error(message) {
    const date = (new Date()).toISOString();
    message = message.split('\n').map(line => {
        return `${date}: ${line}`;
    }).join('\n');
    fs.appendFileSync(path.join(os.homedir(), 'repl.log'), message + '\n');
}
