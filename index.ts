import * as ts from "typescript/lib/tsserverlibrary";
import allFilesAreJsOrDts = ts.server.allFilesAreJsOrDts;
const safeEval = require('safe-eval')
const path = require('path');
const fs = require('fs');
var zlib = require('zlib');
var sqlite3 = require('sqlite3').verbose();
const DB_PATH = "E:/Programming/BattleIsland/storage/Databases/96529230ba69f6ed1ef0770a494441cd.sqlite"

const DIR = 'E:/Programming/MEAN/wozzweglem/server-src/uploads';
const CONVERTED_DIR_PATH = path.join(DIR, "");

const ROBOT_API = './RobotAPI.js';
const ROBOT_TEMPLATE = fs.readFileSync(ROBOT_API, 'utf8')

const commandLineArgs = require('command-line-args')

const optionDefinitions = [
    { name: 'src', type: String, defaultValue: "E:/Programming/MEAN/wozzweglem/server-src/uploads" },
    { name: 'number', alias: 'n', type: Number, defaultValue: -1 },
    { name: 'logData', alias: 'd', type: Boolean , defaultValue: false },
    { name: 'logCompress', alias: 'c', type: Boolean , defaultValue: false }
]

const options = commandLineArgs(optionDefinitions);

var walk = function(dir) {
    var results = [];
    var files = fs.readdirSync(dir);
    for(var i=0; i<files.length; ++i){
        var absoluteFilePath = path.join(dir, files[i]);
        if(fs.lstatSync(absoluteFilePath).isDirectory()){
            results = results.concat(walk(absoluteFilePath));
        }else{
            if(absoluteFilePath.endsWith(".js")){
                results.push(absoluteFilePath);
            }
        }
    }
    return results;
};

//randomize 4 files from the list
function getRandomEntries(list, number, unique) {
    var results = []
    if(list.length !== 0){
        while (results.length < number) {
            let fileName = list[Math.floor(Math.random() * list.length)]
            if(!unique || results.indexOf(fileName) === -1 || list.length <= results.length)
                results.push(fileName);
        }
    }
    return results;
}

function loadSelectedFiles(files) {
    var results = []

    for (var i = 0; i < files.length; i++) {
        var fileContent = fs.readFileSync(files[i], 'utf8')
        //how am I going to load these...
        var functionContent = ROBOT_TEMPLATE + fileContent +
        `
        
            return {
                 init: init,
                 executeEvents: executeEvents,
                 robot: robot
            }
        `
        var script = evaluate(functionContent);
       // console.log("lul", script);
        results.push(script);
    }

    return results;
}

function resetGame(game, scripts){
    game.initialize()
    for(var i=0; i<scripts.length; i++){
        game.addRobot(scripts[i]);
    }
}
function evaluate(str) {
    var context = {
        console: {
            log: function(){}
        }
    }
    return safeEval(`(function() {${str}})`, context)()
}

function getGame(){
    var fileContent = fs.readFileSync('./Game.js', 'utf8')
    var functionContent = ROBOT_TEMPLATE + fileContent +
        `
        
            return {
                 play: play,
                 addRobot: addRobot,
                 initialize: initialize,
                 GetDrawData: GetDrawData
            }
        `;
    return evaluate(functionContent);
}

function initDB(){
    var db = new sqlite3.Database(DB_PATH);
    db.serialize(function() {
        db.run('CREATE TABLE IF NOT EXISTS Results(script TEXT, games NUMBER, wins NUMBER, PRIMARY KEY (script))');
    });
    db.close();
}

function writeToDB(winner, files) {
    var db = new sqlite3.Database(DB_PATH);
    db.serialize(function() {
        var winnerScript = winner.replace(CONVERTED_DIR_PATH + "\\", "");
        var uniqueNames = []
        for (var i = 0; i < files.length; ++i) {
            var name = files[i].replace(CONVERTED_DIR_PATH + "\\", "");
            if (uniqueNames.indexOf(name) == -1) {
                uniqueNames.push(name)
            }
        }

        dbCounter = uniqueNames.length;

        // console.log(uniqueNames);

        for (var i = 0; i < uniqueNames.length; ++i) {
            let script = uniqueNames[i];
            db.all("SELECT * FROM Results WHERE script=?",[script], function (err, rows) {
                //here we get the result and we can update it
                // console.log("select for script", script)
                // console.log(err, rows);

                if(err) {console.log(err); return}
                var games = 0;
                var wins = 0;
                if (rows.length === 1) {
                    games = rows[0].games + 1
                    wins = rows[0].wins
                }
                if (script === winnerScript) {
                    wins++
                }

                if (rows.length === 0) {
                    db.run("INSERT INTO Results (script, games, wins) VALUES(?, ?, ?)", [script, games, wins], function (err, rows) {
                        dbCounter--;
                    });

                } else {
                    db.run("UPDATE Results SET games=?, wins=? WHERE script=?", [games, wins, script], function (err, rows) {
                        dbCounter--;
                    });
                }
            });
        }
    });
}

function playOneGame(players, unique){
    let allFiles = walk(DIR);
    let selectedFiles = getRandomEntries(allFiles, players, unique);
    let scripts = loadSelectedFiles(selectedFiles);

    //console.log(selectedFiles);

    resetGame(game, scripts);
    replayData = [];
    if(options.logData){
        replayData.push(game.GetDrawData())
    }

    let frameNumber = 1;
    let winnerIndex = game.play();
    while(typeof winnerIndex === 'undefined' && frameNumber < 10000) {
        if(options.logData){
            replayData.push(game.GetDrawData())
        }
        frameNumber++;
        winnerIndex = game.play();
    }
    if(winnerIndex >= 0 && winnerIndex < scripts.length){
        var winnerName = selectedFiles[winnerIndex].replace(CONVERTED_DIR_PATH + "\\", "");

        writeToDB(selectedFiles[winnerIndex], selectedFiles);
        // console.log("Winner:", winnerName);
    } else {
        // console.log("A draw!")
    }

    if(options.logData){
        var logOutputData = {
            islandRadius: 375,
            healthItemWidth: 15,
            robotWidth: 40,
            names: [],
            frames: replayData
        }

        for(var i=0; i < selectedFiles.length; i++){
            logOutputData.names[i] = selectedFiles[i].replace(CONVERTED_DIR_PATH + "\\", "");
        }

        var logOutput = JSON.stringify(logOutputData, null, 4) ;
        if(options.logCompress) {
            logOutput = zlib.deflateSync(JSON.stringify(logOutput, null, 4)).toString('base64');
        }
        //logData = zlib.inflateSync(new Buffer(logData, 'base64')).toString();
        fs.writeFile(".\\replayData.json", logOutput, function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("The file was saved!");
        });
    }

    console.log("Game", gameNumber, "ended at", frameNumber);
}

var dbCounter = 0;

let gameNumber = 0;
let game = getGame();

var lastTime = Date.now();
var onlyUniquePlayers = true;

var simualtionsLeft = options.number;

var replayData = [];

function main() {
    if(dbCounter === 0)
    //for(let i=0; i<10; i++)
    {
        if(simualtionsLeft > 0 ){
            simualtionsLeft--;
        }
        //cleanup
        global.gc();

        try{
            gameNumber++;
            playOneGame(4, onlyUniquePlayers);
        }catch(err){
            console.log(err);
            dbCounter = 0;
        }

        // let curTime = Date.now();
        // if(lastTime != 0){
        //     console.log("execution time:",curTime - lastTime, "ms");
        // }
        // lastTime = curTime;
    }
    if(simualtionsLeft == 0) {
        return
    }else{
        //add command line input for breaking out of the loop
        setImmediate(function immediate () {
            main()
        });
    }
}

initDB();
main();
