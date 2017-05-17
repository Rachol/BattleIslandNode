const Stopwatch = require("node-stopwatch").Stopwatch;
var stopwatch = Stopwatch.create();
stopwatch.start();

const path = require('path');
const fs = require('fs');

const DIR = 'E:/Programming/MEAN/wozzweglem/server-src/uploads';
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
    return eval(`(function() {${str}})`)()
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


var allFiles = walk(DIR);
var selectedFiles = getRandomEntries(allFiles, 4);
var scripts = loadSelectedFiles(selectedFiles);
var game = getGame();

resetGame(game, scripts);

// var robots = game.robots();

 var frameNumber = 1;
 var winnerIndex = game.play();
 while(typeof winnerIndex === 'undefined') {
     frameNumber++;
     console.log(frameNumber);
     winnerIndex = game.play();
 }

console.log(selectedFiles);

console.log("execution time: " + stopwatch.elapsedMilliseconds)


