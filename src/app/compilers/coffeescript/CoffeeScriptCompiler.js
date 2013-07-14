/**
 * CoffeeScriptCompiler module
 */

'use strict';

var fs          = require('fs'),
    path        = require('path'),
    exec        = require('child_process').exec,
    coffee      = require('coffee-script'),
    FileManager = global.getFileManager(),
    Compiler    = require(FileManager.appScriptsDir + '/Compiler'),
    notifier    = require(FileManager.appScriptsDir + '/notifier.js'),
    appConfig   = require(FileManager.appScriptsDir + '/appConfig.js').getAppConfig();

function CoffeeScriptCompiler(config) {
    Compiler.call(this, config);
}
require('util').inherits(CoffeeScriptCompiler, Compiler);
module.exports = CoffeeScriptCompiler;

/**
 * compile coffee file
 * @param  {Object} file    compile file object
 * @param  {Function} success compile success calback
 * @param  {Function} fail    compile fail callback
 */
CoffeeScriptCompiler.prototype.compile = function (file, success, fail) {
    //compile file by system command
    if (appConfig.useSystemCommand.coffeescript) {
        this.compileBySystemCommand(file, success, fail);
        return false;
    }

    var filePath = file.src,
        output = file.output,
        javascript;

    var options = file.settings;
    for (var k in appConfig.coffeescript) {
        if (!options.hasOwnProperty(k)) {
            options[k] = appConfig.coffeescript[k];
        }
    }

    //read code
    fs.readFile(filePath, 'utf8', function (rErr, code) {
        if (rErr) {
            if (fail) fail();
            notifier.throwError(rErr.message);
            return false;
        }

        try {
            javascript = coffee.compile(code, {
                bare: options.bare,
                literate: options.literate
            });
            //write output
            fs.writeFile(output, javascript, 'utf8', function (wErr) {
                if (wErr) {
                    if (fail) fail();
                    notifier.throwError(wErr.message);
                } else {
                    if (success) success();
                }
            });
        } catch (err) {
            //compile error
            if (fail) fail();
            notifier.throwError(err.message, file.src);
        }
    });
};

/**
 * compile file by system command
 * @param  {Object} options compile options
 */
CoffeeScriptCompiler.prototype.compileBySystemCommand = function (file, success, fail) {
    var filePath = file.src,
        output = file.output,
        options = file.settings,
        argv = [];

    argv.push('--compile');

    if (options.bare) {
        argv.push('--bare');
    }

    if (options.literate) {
        argv.push('--literate');
    }

    argv.push('"' + filePath.replace(/\\/g, '/') + '"');

    exec('coffee ' + argv.join(' '), {timeout: 5000}, function (error, stdout, stderr) {
        if (error !== null) {
            if (fail) fail();
            notifier.throwError(stderr, filePath);
        } else {
            //move the result js file to output path
            if (path.dirname(filePath) === path.dirname(output)) {
                if (path.basename(filePath, '.coffee') !== path.basename(output, '.js')) {
                    moveResutToOutput();
                } else {
                    if (success) success();
                }
            } else {
                moveResutToOutput();
            }
        }
    });

    //move file
    function  moveResutToOutput () {
        var result = path.join(path.dirname(filePath), path.basename(filePath, '.coffee') + '.js');

        fs.rename(result, output, function (err) {
            if (err) {
                if (fail) fail();
                notifier.throwError(err.message, filePath);
            } else {
                if (success) success();
            }
        });
    }
};