import * as ts from "typescript/lib/tsserverlibrary";
import allFilesAreJsOrDts = ts.server.allFilesAreJsOrDts;
const safeEval = require('safe-eval')
const path = require('path');
const fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
const DB_PATH = "E:/Programming/BattleIsland/storage/Databases/96529230ba69f6ed1ef0770a494441cd.sqlite"

const DIR = 'E:/Programming/MEAN/wozzweglem/server-src/uploads';
const CONVERTED_DIR_PATH = path.join(DIR, "");

const ROBOT_API = './RobotAPI.js';
const ROBOT_TEMPLATE = fs.readFileSync(ROBOT_API, 'utf8')

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
function getRandomEntries(list, number) {
    var results = []
    if(list.length !== 0){
           while(results.length < number){
               results.push(list[Math.floor(Math.random()*list.length)]);
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
                 initialize: initialize
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

function playOneGame(players){
    let allFiles = walk(DIR);
    let selectedFiles = getRandomEntries(allFiles, players);
    let scripts = loadSelectedFiles(selectedFiles);

    resetGame(game, scripts);

    let frameNumber = 1;
    let winnerIndex = game.play();
    while(typeof winnerIndex === 'undefined' && frameNumber < 10000) {
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
    console.log("Game", gameNumber, "ended at", frameNumber);
}

var dbCounter = 0;

let gameNumber = 0;
let game = getGame();

var lastTime = 0;

function main() {
    if(dbCounter === 0)
    //for(let i=0; i<10; i++)
    {
        //cleanup
        global.gc();

        // let curTime = Date.now();
        // if(lastTime != 0){
        //     console.log("execution time:",curTime - lastTime, "ms");
        // }
        //
        // lastTime = curTime;
        try{
            gameNumber++;
            playOneGame(4);
        }catch(err){
            console.log(err);
            dbCounter = 0;
        }


    }
    setImmediate(function immediate () {
        main()
    });
}

initDB();
main();

console.log("Finished?")


