
document.addEventListener("DOMContentLoaded", (event) => {
    console.log("LOADED");

});

var points = [];
var lines = [];
var canvasLocks = [];
var canvasKeys = [];
var canvasDoor = undefined;
var allDoorsUnlocked = false;

var pointsStart;
var fric = 0.95; // drag or air friction
var surF = 0.95; // ground and box friction
var grav = 0.9;   // gravity
var ballRad = 10;  // chain radius set as ball radius
var stiffness = 12;  // number of itterations for line constraint
const fontSize = 33;
var chainImages = [new Image(), new Image(), new Image(), new Image()];
chainImages[0].src = "./m0xqQ.png";
chainImages[1].src = "./fv77t.png";

var gameData = [];

function drawCanvasDoor() {
    if (canvasDoor != undefined) {
        canvasDoor.draw();
    }
}

function createCanvasDoor() {
    var doorImage = new Image();
    doorImage.src = "./door.svg";

    canvasDoor = {
        isOpening: false,
        image: doorImage,
        angleY: 0,
        isDone: false,
        draw() {
            if (!this.isDone && this.image && this.isOpening) {
                const position = { x: 450, y: 0 };
                // In degrees
                const rotation = { x: 0, y: this.angleY, z: 0 };
                // Rotation relative to here (this is the center of the image)
                const rotPt = { x: 0, y: this.image.height / 2 };

                ctx.save();
                ctx.setTransform(new DOMMatrix()
                    .translateSelf(position.x + rotPt.x, position.y + rotPt.y)
                    .rotateSelf(rotation.x, rotation.y, rotation.z)
                );
                ctx.drawImage(this.image, -rotPt.x, -rotPt.y);
                ctx.restore();
                this.angleY -= .5;
                if (this.angleY <= -90) {
                    this.isDone = true;
                    var candyElement = document.getElementById("theCandy");
                    candyElement.className = "animate__animated animate__backInDown"
                }
            }

        }
    };
}
// add a point
function addPoint(x, y, vx, vy, rad = 10, fixed = false) {
    points.push({
        x: x,
        y: y,
        ox: x - vx,
        oy: y - vy,
        fixed: fixed,
        radius: rad,
    })
    return points[points.length - 1];
}
// add a constrained line
function addLine(p1, p2, image) {
    lines.push({
        p1, p2, image,
        len: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        draw() {
            if (this.image !== undefined) {
                var img = chainImages[this.image];
                var xdx = this.p2.x - this.p1.x;
                var xdy = this.p2.y - this.p1.y;
                var len = Math.hypot(xdx, xdy);
                xdx /= len;
                xdy /= len;
                if (this.image === 2) { // oops block drawn in wrong direction. Fix just rotate here
                    // also did not like the placement of 
                    // the block so this line's image
                    // is centered on the lines endpoint
                    ctx.setTransform(xdx, xdy, -xdy, xdx, this.p2.x, this.p2.y);

                    ctx.rotate(-Math.PI / 2);
                } else {
                    ctx.setTransform(xdx, xdy, -xdy, xdx, (this.p1.x + this.p2.x) / 2, (this.p1.y + this.p2.y) / 2);
                }

                ctx.drawImage(img, -img.width / 2, - img.height / 2);

            }
        }
    })
    return lines[lines.length - 1];
}
// Constrain a point to the edge of the canvas
function constrainPoint(p) {
    if (p.fixed) {
        return;
    }
    var vx = (p.x - p.ox) * fric;
    var vy = (p.y - p.oy) * fric;
    var len = Math.hypot(vx, vy);
    var r = p.radius;
    if (p.y <= r) {
        p.y = r;
        p.oy = r + vy * surF;
    }
    if (p.y >= h - r) {
        var c = vy / len
        p.y = h - r
        p.oy = h - r + vy * surF;
        p.ox += c * vx;
    }
    if (p.x < r) {
        p.x = r;
        p.ox = r + vx * surF;
    }
    if (p.x > w - r) {
        p.x = w - r;
        p.ox = w - r + vx * surF;
    }
}
// move a point 
function movePoint(p) {
    if (p.fixed) {
        return;
    }
    var vx = (p.x - p.ox) * fric;
    var vy = (p.y - p.oy) * fric;
    p.ox = p.x;
    p.oy = p.y;
    p.x += vx;
    p.y += vy;
    p.y += grav;
}
// move a line's end points constrain the points to the lines length
function constrainLine(l) {
    var dx = l.p2.x - l.p1.x;
    var dy = l.p2.y - l.p1.y;
    var ll = Math.hypot(dx, dy);
    var fr = ((l.len - ll) / ll) / 2;
    dx *= fr;
    dy *= fr;
    if (l.p2.fixed) {
        if (!l.p1.fixed) {
            l.p1.x -= dx * 2;
            l.p1.y -= dy * 2;
        }
    } else if (l.p1.fixed) {
        if (!l.p2.fixed) {
            l.p2.x += dx * 2;
            l.p2.y += dy * 2;
        }
    } else {
        l.p1.x -= dx;
        l.p1.y -= dy;
        l.p2.x += dx;
        l.p2.y += dy;
    }
}

// locate the poitn closest to x,y (used for editing)
function closestPoint(x, y) {
    var min = 40;
    var index = -2;
    for (var i = 0; i < points.length; i++) {
        var p = points[i];
        var dist = Math.hypot(p.x - x, p.y - y);
        if (dist < min) {
            min = dist;
            index = i;

        }

    }
    return index;
}

function constrainPoints() {
    for (var i = 0; i < points.length; i++) {
        constrainPoint(points[i]);
    }
}
function movePoints() {
    for (var i = 0; i < points.length; i++) {
        movePoint(points[i]);
    }
}
function constrainLines() {
    for (var i = 0; i < lines.length; i++) {
        constrainLine(lines[i]);
    }
}
function drawLines() {
    // draw back images first
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].image !== 1) {
            lines[i].draw();
        }
    }
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].image === 1) {
            lines[i].draw();
        }
    }
}

function drawCanvasLocks() {
    var doosLockedCount = 0;
    for (var i = 0; i < canvasLocks.length; i++) {
        if (canvasLocks[i].image !== undefined) {
            canvasLocks[i].draw();

            if (canvasLocks[i].lockContext.IsLocked) {
                doosLockedCount++;
            }
        }
    }

    if (!allDoorsUnlocked && doosLockedCount == 0) {
        allDoorsUnlocked = true;
        canvasDoor.isOpening = true;
        var door = document.getElementById("theDoor");
        door.parentElement.removeChild(door);
    }
}

function drawCanvasKeys(timer) {
    var toRemoveIndexes = [];
    for (var i = 0; i < canvasKeys.length; i++) {
        if (canvasKeys[i].image !== undefined) {
            canvasKeys[i].draw(timer);

            if (canvasKeys[i].completed) {
                toRemoveIndexes.push(i);
            }
        }
    }

    for (var i = toRemoveIndexes.length - 1; i >= 0; i--) {
        canvasKeys.splice(i, 1);
    }
}

function createHorizontalChain(startX, startY, numLinks) {
    var i = chainImages[1];
    var w = i.width;
    var h = i.height;

    var localPoints = [];
    localPoints[0] = addPoint(startX, startY, 0, 0, 8, true);

    for (let i = 1; i < numLinks; i++) {
        var xOffset = ((i) * .6) * w;
        localPoints[i] = addPoint(startX + xOffset, startY, 0, 1, 10, i == numLinks - 1);
    }

    for (let i = 0; i < localPoints.length - 1; i++) {
        addLine(localPoints[i], localPoints[i + 1], (i) % 2);
    }

    localPoints[0].x -= 50;
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function AddCanvasKey(keyIndex, destinationX, destinationY, lockContext) {

    canvasKeys.push({
        completed: false,
        image: chainImages[keyIndex],
        x: 0,
        y: 0,
        destX: destinationX,
        destY: destinationY,
        startTime: null,
        lock: lockContext,

        draw(timer) {
            if (!this.startTime) this.startTime = timer;
            const progress = (timer - this.startTime) / 1500;
            var img = this.image;

            if (progress < 1) {
                if (img) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.drawImage(img, this.x, this.y);

                    this.x = this.destX * easeInOutQuad(progress);
                    this.y = this.destY * easeInOutQuad(progress);
                }
            }
            else if (this.completed) {
                this.y += 8;
            }
            else if (!this.completed) {
                this.completed = true;
                this.lock.IsLocked = false;
                points[this.lock.breakChainRightIdx].fixed = false;
                points[this.lock.breakChainLeftIdx].fixed = false;
            }
        }
    });
}

function createLock(lockData) {

    var left = lockData.StartX + 550;
    var top = lockData.StartY;
    var id = lockData.Name;

    var svgLockToCopy = document.getElementById("svgLock");

    var replacedColor = svgLockToCopy.outerHTML.replaceAll("#2aff80", lockData.LightColor);
    //replacedColor = replacedColor.replaceAll("#aaffcc", lockData.LightColor);
    replacedColor = replacedColor.replaceAll("#235b3a", lockData.DarkColor);


    var newCanvasLockImage = new Image();
    const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(replacedColor);
    newCanvasLockImage.src = svgDataUri;

    var svgKeyToCopy = document.getElementById("svgKey");
    var replacedKeyColor = svgKeyToCopy.outerHTML.replaceAll("#bc3535", lockData.LightColor);
    var newCanvasKeyImage = new Image();
    var svgDataUriKey = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(replacedKeyColor);
    newCanvasKeyImage.src = svgDataUriKey;
    chainImages.push(newCanvasKeyImage);

    canvasLocks.push({
        image: newCanvasLockImage,
        lockContext: lockData,
        xLoc: left,
        yLoc: top,
        keyIndex: chainImages.length - 1,
        keyPoint1: undefined,
        keyPoint2: undefined,
        draw() {
            var img = this.image;
            var associatedTextElement = document.getElementById(this.lockContext.Name);

            if (!this.lockContext.KeyShown && associatedTextElement.innerText.toLowerCase() === this.lockContext.CorrectCode.toLowerCase()) {
                this.lockContext.KeyShown = true;
                AddCanvasKey(this.keyIndex, this.xLoc, this.yLoc, this.lockContext);
            }

            if (img) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.drawImage(img, this.xLoc, this.yLoc);

                if (this.keyPoint1 != undefined && this.keyPoint2 != undefined) {
                    if (Math.abs(this.keyPoint1.x - this.xLoc) < 10 && Math.abs(this.keyPoint1.y - this.yLoc) < 10) {
                        this.unlocked = true;
                    }
                }
                if (!this.lockContext.IsLocked) {
                    this.yLoc += 8;
                }
            }
        }
    });



    var lockText = document.createElement("div");
    lockText.id = id;
    lockText.contentEditable = "true";
    lockText.classList.add("editText")
    lockText.innerText = "";
    lockText.style.top = (top) + 'px';
    lockText.style.color = lockData.LightColor;
    lockText.style.border = '1px solid ' + lockData.LightColor;
    document.body.appendChild(lockText);
}

function createSolidChain() {

    fetch('./data.json') // Path to your JSON file
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json(); // Parse the JSON data
        })
        .then(data => {
            gameData = data;
            for (let i = 0; i < gameData.locks.length; i++) {

                createHorizontalChain(gameData.locks[i].StartX, gameData.locks[i].StartY, gameData.locks[i].NumLinks);

                var numLinksAfterFirstChain = points.length - 1;
                createHorizontalChain(gameData.locks[i].StartX + 600, gameData.locks[i].StartY, gameData.locks[i].NumLinks);

                gameData.locks[i].breakChainRightIdx = numLinksAfterFirstChain;
                gameData.locks[i].breakChainLeftIdx = numLinksAfterFirstChain + 1;

                createLock(gameData.locks[i]);
            }
            console.log(gameData);
        })
        .catch(error => {
            console.error('Error fetching or parsing JSON:', error);
            const dataContainer = document.getElementById('data-container');
            dataContainer.innerHTML = `<p style="color: red;">Failed to load data.</p>`;
        });

    setTimeout(function () {
        //    points[19].fixed = false;
        //    points[20].fixed = false;
    }, 5000);
}

var lastChainLink = 0;

function addChainLink() {
    var lp = points[points.length - 1];
    addPoint(lp.x, lp.y - (chainImages[0].width - ballRad * 2), 0, 0, ballRad);
    addLine(points[points.length - 2], points[points.length - 1], lastChainLink % 2);
    lastChainLink += 1;
}

function loading() {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "black";
    ctx.fillText("Loading media pleaase wait!!", w / 2, 30);
    if (chainImages.every(image => image.complete)) {
        doSim = runSim;
    }
}
var onResize = function () { // called from boilerplate
    blockAttached = false;
    lines.length = 0;  // remove all lines and points.
    points.length = 0;
    lastChainLink = 0; // controls which chain image to use next
}
var blockAttached = false;
var linkAddSpeed = 20;
var linkAddCount = 0;

function runSim(timer) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "black";
    if (points.length > 0) {

        movePoints();
        constrainPoints();
        for (var i = 0; i < stiffness; i++) {
                            constrainLines();
        }
        drawLines();
        drawCanvasLocks();
        drawCanvasKeys(timer);
        drawCanvasDoor();
    } 
}

var doSim = loading;

var w, h, cw, ch, canvas, ctx, globalTime = 0, firstRun = true;

; (function () {
    const RESIZE_DEBOUNCE_TIME = 100;
    var createCanvas, resizeCanvas, setGlobals, resizeCount = 0;
    createCanvas = function () {
        var c, cs;
        cs = (c = document.createElement("canvas")).style;
        cs.position = "absolute";
        cs.top = cs.left = "0px";
        cs.zIndex = 1000;
        document.body.appendChild(c);
        return c;
    }
    resizeCanvas = function () {
        if (canvas === undefined) {
            canvas = createCanvas();
        }
        canvas.width = 2000;
        canvas.height = 1350;

        var horizontalZoom = innerWidth / 2000;
        var verticalZoom = innerHeight / 1350;
        var smallest = Math.min(verticalZoom, horizontalZoom);

        document.body.style.zoom = smallest.toString();

        ctx = canvas.getContext("2d");
        if (typeof setGlobals === "function") {
            setGlobals();
        }
        if (typeof onResize === "function") {
            if (firstRun) {
                onResize();
                firstRun = false;
            } else {
                resizeCount += 1;
                setTimeout(debounceResize, RESIZE_DEBOUNCE_TIME);
            }
        }
    }
    function debounceResize() {
        resizeCount -= 1;
        if (resizeCount <= 0) {
            onResize();
        }
    }
    setGlobals = function () {
        cw = (w = canvas.width) / 2;
        ch = (h = canvas.height) / 2;
        ctx.font = fontSize + "px arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

    }

    function update(timer) { // Main update loop
        doSim(timer); // call demo code
        requestAnimationFrame(update);
    }
    setTimeout(function () {
        document.body.classList.add("bodyLoaded");
        resizeCanvas();
        //window.addEventListener("resize", resizeCanvas);
        requestAnimationFrame(update);
        createSolidChain();
        createCanvasDoor();
        setTimeout(function () {
            shakeDoorPeriodically();
        }, 2000);
    }, 1000);


    function shakeDoorPeriodically() {


        var door = document.getElementById("theDoor");
        if (!door) {
            return;
        }

        door.className = "";

        setTimeout(function () {
            var animClassNames = ["animate__wobble", "animate__heartBeat", "animate__jello"]
            var animIndex = Math.floor(Math.random() * animClassNames.length);
            door.className = "animate__animated  " + animClassNames[animIndex];
        }, 100);

        setTimeout(function () {
            shakeDoorPeriodically();
        }, 5000);
    }
})();
