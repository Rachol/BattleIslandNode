var robot = {
    accelerate: null,           //parameters: robot_token, acceleration from +- (2)
    turnClockwise: null,     //parameters: robot_token, angle in degrees  +- (10 - robot velocity)
    scanHealth: null,           //parameters: robot_token, angle in degrees
    scanEdge: null,               //parameters: robot_token, angle in degrees
    scanRobot: null,             //parameters: robot_token, angle in degrees
    shoot: null,                     //parameters: robot_token
    hasCollided: null,            //parameters: robot_token
    wasShot: null,                    //parameters: robot_token
    damagePercent: null,            //parameters: robot_token
    token: null,                 //<- not a function, this is needed to call other functions,
    displayMessage: null //support for old scripts
}
function init(
    robot_token,
    accelerateFn,
    turnClockwiseFn,
    scanHealthFn,
    scanEdgeFn,
    scanRobotFn,
    shootFn,
    collidedFn,
    shotFn,
    damageFn
    ){

    [robot.token].concat([].slice.call(arguments));

    console.log("initializing")
    robot.accelerate =      function(){var argsCopy = [robot.token].concat([].slice.call(arguments)); return accelerateFn.apply(this,argsCopy)};    //parameters: robot_token, acceleration from +- (2)
    robot.turnClockwise =   function(){var argsCopy = [robot.token].concat([].slice.call(arguments)); return turnClockwiseFn.apply(this,argsCopy)}; //parameters: robot_token, angle in degrees  +- (10 - robot velocity)
    robot.scanHealth =      function(){var argsCopy = [robot.token].concat([].slice.call(arguments)); return scanHealthFn.apply(this,argsCopy)};    //parameters: robot_token, angle in degrees
    robot.scanEdge =        function(){var argsCopy = [robot.token].concat([].slice.call(arguments)); return scanEdgeFn.apply(this,argsCopy)};      //parameters: robot_token, angle in degrees
    robot.scanRobot =       function(){var argsCopy = [robot.token].concat([].slice.call(arguments)); return scanRobotFn.apply(this,argsCopy)};     //parameters: robot_token, angle in degrees
    robot.shoot =           function(){return shootFn(robot.token)};         //parameters: robot_token
    robot.hasCollided =     function(){return collidedFn(robot.token)};      //parameters: robot_token
    robot.wasShot =         function(){return shotFn(robot.token)};          //parameters: robot_token
    robot.damagePercent =   function(){return damageFn(robot.token)};        //parameters: robot_token
    robot.token =           robot_token;                                                //<- not a function, this is needed to call other functions,
    robot.displayMessage = function (message) {if(false)console.log(message)};          //support for old scripts
}
