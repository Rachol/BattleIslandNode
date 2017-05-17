/*
  robot entry is as follows:
  { script: object,
    x: number,
    y: number,
    dxc: number,
    dyc: number,
    diameter: number
    rotation: number,
    hp: number,
    velocity: number,
    collided: boolean,
    damageTaken: number,
    shot: boolean,
    shootDelay: number,
    token: string,
    call_count: number
    }
  */
var robots = [];

/*
  robot entry is as follows:
  { x: number,
    y: number,
    diameter: number
    }
  */
var frame = 0;
var healthItems = [];
var dealtDamage = 0;

var ISLAND_RADIUS = 375;
var HEALT_ITEM_DIAMETER = 15;
var HEALT_ITEM_HP_BONUS = 20;
var SHOT_DELAY = 15
var CALL_COUNT = 5

//////////////////////
/////  UTILITY  //////
//////////////////////
function getRobot(token){
    for(var i=0; i<robots.length; i++){
        if(token===robots[i].token){
            return robots[i];
        }
    }
    return null; //If not found
}

function angleTo(item1, item2) {
    var angle = 90 - Math.atan2((item2.x-item1.x), (item2.y-item1.y)) * 180 / Math.PI
    if (angle<0) angle += 360;
    if (angle>360) angle -=360;
    return angle;
}

function angleDiff(angle1, angle2) {
    var angDiff = Math.abs(angle1 - angle2)
    if (angDiff > 180) angDiff = 360 - angDiff;
    return angDiff;
}

function distAng(robot, item, degrees, beamDist) {
    var result = { 'distance': -1, 'angle': 0};
    var dist = Math.floor(itemDistance(robot, item))
    if (dist > beamDist) {
        return result;
    }

    var ang = Math.floor(angleTo(robot, item))
    var angDiff = angleDiff(ang, robot.rotation);
    if (angDiff > degrees/2) {
        if (angDiff > 90) {
            return result;
        }
        var angleDiffRad = (angDiff-(degrees/2)) * Math.PI/180;
        var hitDiff = Math.sin(angleDiffRad) * dist;
        if (hitDiff > item.diameter/2) {
            return result;
        }
    }
    result.distance = dist;
    result.angle = ang;
    return result;
}

function itemDistance(item1, item2) {
    return Math.sqrt((item1.x-item2.x)*(item1.x-item2.x) + (item1.y-item2.y)*(item1.y-item2.y))
}

function findAngleClosestToEdge(robotCenter, islandCenter){
    return ((Math.atan2(robotCenter.y-islandCenter.y, robotCenter.x-islandCenter.y) * 180 / Math.PI) + 360)%360
}

function findClosestDistToEdge(robotCenter, islandCenter, ISLAND_RADIUS){
    return ISLAND_RADIUS - itemDistance(robotCenter, islandCenter)
}

function getDistToEdgeInViewArea(robot, searchWidth, searchRadius){
    var robotCenter = {x: robot.x, y: robot.y}
    var islandCenter = {x: ISLAND_RADIUS, y: ISLAND_RADIUS}

    var i1 = findInter(robotCenter,
                       islandCenter,
                       robot.rotation-90-searchWidth/2,
                       searchRadius)

    var i2 = findInter(robotCenter,
                       islandCenter,
                       robot.rotation-90+searchWidth/2,
                       searchRadius)

    //get the angle to closest point on the shore of the island
    var aC = findAngleClosestToEdge(robotCenter,
                                    islandCenter)
    var dC = findClosestDistToEdge( robotCenter,
                                    islandCenter)



    //if ac is inside search area, it is the closest, return it
    var safeSearchAngle = robot.rotation%360 + 360
    var safeaC = aC%360 + 360

    if(dC > 0  && (safeaC >= (safeSearchAngle - searchWidth)) && (safeaC < (safeSearchAngle + searchWidth))){
        return dC;
    }
    else{
        var d1 = -1;
        var d2 = -1;
        //get the shorter distance from one of the intersections
        if(i1!==null){
            d1 = itemDistance(robotCenter,i1)
        }

        if(i2!==null){
            d2 = itemDistance(robotCenter,i2)
        }

        if(d1 > 0 || d2 > 0){
            return Math.max(d1, d2)
        }
    }

    return null
}

function findInter(robotCenter, islandCenter, searchAngle, searchRadius){
    var x1 = robotCenter.x
    var y1 = robotCenter.y
    var x2 = x1 + searchRadius * Math.cos(2*Math.PI*searchAngle/360)
    var y2 = y1 + searchRadius * Math.sin(2*Math.PI*searchAngle/360)

    var m = (y2-y1)/(x2-x1)
    var c = y1 - m*x1

    var p = islandCenter.x
    var q = islandCenter.y
    var r = ISLAND_RADIUS

    var A = m*m + 1
    var B = 2*(m*c -m*q - p)
    var C = q*q - r*r + p*p -2*c*q + c*c

    var xdiff = Math.sqrt(B*B - 4*A*C)

    var xinter1 = (-B + xdiff)/(2*A)
    var yinter1 = m*xinter1 + c

    var xinter2 = (-B - xdiff)/(2*A)
    var yinter2 = m*xinter2 + c

    if(xinter1 >= x1 && xinter1 <= x2)
    {
        return {x: xinter1, y: yinter1}
    }

    if(xinter2 >= Math.min(x1,x2) && xinter2 <= Math.max(x1,x2))
    {
        return {x: xinter2, y: yinter2}
    }

    return null;
}

function isColiding(robot){
    var coliding = false
    for(var i=0; i<robots.length; i++){
        if(itemDistance(robot, robots[i]) < robot.diameter){
            ////console.log(robot.x, robot.y)
            coliding = true;
            break;
        }
    }
    return coliding;
}

//////////////////////
/// INITILAIZATION ///
//////////////////////
function initialize() {
    frame = 0;
    robots = [];
    healthItems = [];
    dealtDamage = 0;
}

function addHealthItem() {
    var radius = (ISLAND_RADIUS - 20) * Math.random();
    var dir = 2*Math.PI * Math.random();
    healthItems.push({
                         x: ISLAND_RADIUS + Math.sin(dir)*radius ,
                         y: ISLAND_RADIUS + Math.cos(dir)*radius,
                         diameter: HEALT_ITEM_DIAMETER
                     });
}

function addRobot( scriptObject ) {
    var radius = (ISLAND_RADIUS - 40) * Math.random();
    var dir = 2*Math.PI * Math.random();
    var rotation = Math.random() * 360;
    //console.log("DIR",dir)
    var robot = {
        script: scriptObject,
        x: ISLAND_RADIUS + Math.sin(dir)*radius,
        y: ISLAND_RADIUS + Math.cos(dir)*radius,
        dxc: 0,
        dyc: 0,
        diameter: 40,
        rotation: rotation,
        hp: 100,
        velocity: 0,
        collided: false,
        shot: false,
        damageTaken: 0,
        shootDelay: 0,
        token: "some random string" + robots.length,
        call_count: 0
    };


    //make sure that this robot is not on top of another one
    var coliding = isColiding(robot)
    while(isColiding(robot)){
        ////console.log("looping...", robots.length)
        dir = 2*Math.PI * Math.random();
        radius = (ISLAND_RADIUS - 40) * Math.random();
        robot.x = ISLAND_RADIUS + Math.sin(dir)*radius;
        robot.y = ISLAND_RADIUS + Math.cos(dir)*radius;
        coliding = isColiding(robot)
    }
    robots.push(robot)

    //initialize scriptObject
    scriptObject.init(
                robot.token,
                accelerate,
                turnClockwise,
                scanHealth,
                scanEdge,
                scanRobot,
                shoot,
                hasCollided,
                wasShot,
                damagePercent
                )

    ////console.log(scriptObject);
}


//////////////////////
/// PLAY FUNCTION ////
//////////////////////
function play() {
    {
        frame++
        ////console.log(frame);

        //do the thing here
        var elminatedRobotsCount = 0;
        var robotIndexWithHpLeft = -1;
        for(var i = 0; i < robots.length; ++i){
            try {
                if(robots[i].hp > 0){
                    robots[i].call_count = CALL_COUNT;
                    robots[i].script.executeEvents();
                }
            } catch (err) {
                //Do nothing, just print and continue
                //console.log(err);
            }
        }

        //console.log(robots[0])

        for(var i = 0; i < robots.length; ++i){
            if(robots[i].hp < 1){
                elminatedRobotsCount++;
            }else{
                robotIndexWithHpLeft = i;
            }
        }
        if(elminatedRobotsCount  >= robots.length - 1) {
            //game ends here
            //console.log("Game ends at ", frame)
            return robotIndexWithHpLeft;
        }else{
            advance();
        }
    }
}

////////////////////////////////////
/// MAIN FUNCTIONALITY FUNCTION ////
////////////////////////////////////
function advance() {
    //console.log("advance")
    var robot;
    var rad;
    var posArray = [];

    //console.log(robots[0].x)

    // Calculate new positions
    for (var i=0; i<robots.length; i++) {
        var pos = {'x': 0, 'y':0, 'dx':0, 'dy':0, 'dxc':0, 'dyc':0, 'damage':0, 'name':"" };
        robot = robots[i];
        //console.log(robot);
        rad = robot.rotation * Math.PI/180;
        pos.dy = Math.sin(rad) * robot.velocity;
        pos.dx = Math.cos(rad) * robot.velocity;
        pos.x = robot.x + pos.dx + robot.dxc;
        pos.y = robot.y + pos.dy + robot.dyc;
        //pos.name = robot.name
        posArray.push(pos);
        //console.log("UUU",robot.rotation)
    }
    //console.log(robots[0].x)
    // Check for collisions
    for (var i=0; i<posArray.length; i++) {
        for (var j=i+1; j<posArray.length; j++) {
            if (robots[i].hp < 1) continue;
            if (robots[j].hp < 1) continue;
            var dist = itemDistance(posArray[i], posArray[j]);
            if (dist < robot.diameter) {
                ////console.log("Collision dist=", dist, posArray[i].name, posArray[j].name);
                posArray[i].dxc = (posArray[i].x - posArray[j].x) / 2;
                posArray[j].dxc = (posArray[j].x - posArray[i].x) / 2;

                posArray[i].dyc = (posArray[i].y - posArray[j].y) / 2;
                posArray[j].dyc = (posArray[j].y - posArray[i].y) / 2;

                posArray[i].damage += dist/30;
                posArray[j].damage += dist/30;
                dealtDamage += dist/15;
                //robots[j].soundCollision();
            }
        }
    }
    //console.log(robots[0].x)

    // Set new positions
    for (var i=0; i<robots.length; i++) {
        if (robots[i].hp < 1) continue;
        robots[i].x = posArray[i].x;
        robots[i].y = posArray[i].y;
        robots[i].dxc += posArray[i].dxc;
        robots[i].dyc += posArray[i].dyc;
        robots[i].dxc/=4;
        robots[i].dyc/=4;
        robots[i].hp = Math.floor(robots[i].hp - posArray[i].damage);
        robots[i].collided = posArray[i].damage > 0;
        if (robots[i].hp <= 0) {
            robots[i].hp = 0;
        }
        //console.log(robots[0].x)

        // Apply shoot damage
        dealtDamage += robots[i].damageTaken;
        robots[i].hp = Math.floor(robots[i].hp - robots[i].damageTaken);
        robots[i].shot = robots[i].damageTaken > 0;
        robots[i].damageTaken = 0;
        if (robots[i].hp <= 0) {
            robots[i].hp = 0;
            //robots[i].soundCrash();
        }

        if (robots[i].shootDelay > 0) robots[i].shootDelay--;

        // Check if we have found a health item
        var itemsPicked = []
        for (var j=0; j<healthItems.length; j++) {
            ////console.log(children[i].name, itemDistance(children[i], healthItems[j]), healthItems[j].diameter)
            if (itemDistance(robots[i], healthItems[j]) < healthItems[j].diameter) {
                // the robot gets 20 more hp
                robots[i].hp += HEALT_ITEM_HP_BONUS;
                if (robots[i].hp > 100) {
                    robots[i].hp = 100;
                }
                itemsPicked.push(j);
                //robots[i].soundPowerUp();
            }
        }

        for(var j=0; j < itemsPicked.length; j++){
            var index = itemsPicked[j] - j;
            healthItems.splice(index, 1);
        }

        // Check if we have left the island
        var islandCenter = {x: ISLAND_RADIUS, y: ISLAND_RADIUS}
        var robotCenter = {x: robots[i].x, y: robots[i].y}
        if(itemDistance(robotCenter, islandCenter) > ISLAND_RADIUS){
            robots[i].hp = 0;
            //robots[i].soundDrown();
        }
    }

    // Create a health pack if needed
    if (dealtDamage > 40) {
        dealtDamage -= 40;
        addHealthItem();
    }
}

//////////////////////////////////////////
/// FUNCTIONS AVAILABLE TO THE SCRIPT ////
//////////////////////////////////////////
function scanHealth(robot_token, degrees) {
    //console.log("scanHealth", robot_token);
    var robot = getRobot(robot_token)
    if (robot.callCount === 0) return null;
    robot.callCount--;

    var beamDist = 180*4 - (degrees * 4)

    var curRes = { 'distance': -1, 'angle': 0};
    var newRes;
    for (var i=0; i<healthItems.length; i++) {
        newRes = distAng(robot, healthItems[i], degrees, beamDist)
        if (newRes.distance > 0 && (newRes.distance < curRes.distance || curRes.distance === -1)) {
            curRes = newRes;
        }
    }

    //if (curRes.distance > 0) //console.log("robot:", robot.index, "Found a robot", curRes.distance, curRes.angle);
    return curRes.distance;
}

function scanEdge(robot_token, degrees) {
    //console.log("scanEdge", robot_token);
    var robot = getRobot(robot_token)
    if (robot.callCount === 0) return null;
    robot.callCount--;

    var beamDist = 180*4 - (degrees * 4)

    return getDistToEdgeInViewArea(robot, degrees, beamDist)
}

function scanRobot(robot_token, degrees) {
    //console.log("scanRobot", robot_token);
    var robot = getRobot(robot_token)
    if (robot.callCount === 0) return null;
    robot.callCount--;

    var beamDist = 180*4 - (degrees * 4)

    var curRes = { 'distance': -1, 'angle': 0};
    var newRes;

    for (var i=0; i<robots.length; i++) {
        if (robot.token === robots[i].token) continue;
        if (robots[i].hp < 1) continue;
        newRes = distAng(robot, robots[i], degrees, beamDist)
        ////console.log("robot:", robot.index, "checking", children[i].index, newRes.distance, newRes.angle);
        if (newRes.distance > 0 && (newRes.distance < curRes.distance || curRes.distance === -1)) {
            curRes = newRes;
        }
    }

    //if (curRes.distance > -1) //console.log("robot:", robot.index, "Found a robot", curRes.distance, curRes.angle);
    return curRes.distance;
}

function shoot(robot_token) {
    //console.log("shoot", robot_token);
    var robot = getRobot(robot_token)

    if (robot.callCount === 0) return null;
    robot.callCount--;
    if (robot.shootDelay > 0) return null;

    // FIXME hardcoded limit
    robot.shootDelay = SHOT_DELAY;

    var angleDiffRad;
    var distance;
    var hitDiff;
    var hit = false;
    for (var i=0; i<robots.length; i++) {
        if (robot.token === robots[i].token) continue;
        if (robots[i].hp < 1) continue;
        // calculate the distance from the center of the shot robot
        angleDiffRad = angleDiff(angleTo(robot, robots[i]), robot.rotation) * Math.PI/180;
        distance = itemDistance(robot, robots[i]);
        hitDiff = Math.sin(angleDiffRad) * distance;
        // check if the hit is inside the robot
        if (hitDiff < robot.diameter*0.9) {
            // dead center hit -> max damage = 10 points
            var damage = (robot.diameter - hitDiff)/4;

            // The front of the robot is stronger -> less damage
            if (angleDiff(robot.rotation, robots[i]) > 100) {
                damage /= 2
            }
            robots[i].damageTaken += damage;
            hit = true;
        }
    }
    return hit;
}

function accelerate(robot_token, a) {
    //console.log("accelerate", robot_token);
    var robot = getRobot(robot_token)
    if (robot.callCount === 0) return false;
    robot.callCount--;

    // Limit the acceleration
    if (Math.abs(a) > 2) {
        return false;
    }

    // Limit the speed
    if ((robot.velocity + a) > 7) {
        return false;
    }
    if ((robot.velocity + a) < -3) {
        return false;
    }

    robot.velocity += a;
    return true;
}

function turnClockwise(robot_token, degrees) {
    //console.log("turnClockwise", robot_token);
    var robot = getRobot(robot_token)
    if (robot.callCount === 0) {
        return false;
    }
    robot.callCount--;

    // Limit the turning
    if ((10 - Math.abs(robot.velocity*2)) < Math.abs(degrees)) {
        return false;
    }

    robot.rotation += degrees
    if (robot.rotation > 360) robot.rotation -= 360;
    if (robot.rotation < 0) robot.rotation += 360;
    return true;
}

function wasShot(robot_token) {
    //console.log("wasShot", robot_token);
    var robot = getRobot(robot_token)
    return robot.shot;
}

function hasCollided(robot_token) {
    //console.log("hasCollided", robot_token);
    var robot = getRobot(robot_token)
    return robot.collided;
}

function damagePercent(robot_token) {
    //console.log("damagePercent", robot_token);
    var robot = getRobot(robot_token)
    return 100 - robot.hp;
}
