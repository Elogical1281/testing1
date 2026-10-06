const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

// Canvas size follows the window (or the iframe it's embedded in). It's
// re-checked every frame, so it still works if the page loads while hidden
// (0x0) or the container is resized later.
let W = 0;
let H = 0;
function syncSize() {
    if (window.innerWidth === W && window.innerHeight === H) return false;
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    applyLineColor();
    return true;
}

// Line colour comes from the current theme (see style.css).
function applyLineColor() {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--nd-line').trim() || 'black';
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
}
window.addEventListener('budgity-theme', applyLineColor);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLineColor);
syncSize();

let total = 0;
let n = 0;
let nodes = [];
let nodesUnsorted = [];

let mouse = {
    x: 0,
    y: 0
}

class Nodey {
    constructor (b, type, value) {
        this.b = b;
        this.type = type;
        this.value = value;
    }
}

let createNode = (a) => {
    let node = document.body.appendChild(document.createElement('div'));
    $(node).load(
        'nodes/' + a + '.html'
    );
    node.classList.add('node');
    node.classList.add(a);
    node.id = 'drag' + n;
    if (n === 0) {
        nodesUnsorted.push(new Nodey(n, a, 0));
        nodes.push([n]);
    } else {
        nodesUnsorted.push(new Nodey(n, a, 0));
        nodes.push([0]);
        node.classList.add('ttt');
        nodes[0].push(n);
        $('#drag' + n).draggable({
            handle: ".handle",
            containment: "window"
        });
    }
    n++;
    return node;
}

$('#menu').menu();

$( document ).contextmenu(function( event ) {
    $('#menu').removeClass('hidden');
    event.preventDefault();
    $( "#menu" ).position({
        my: "left bottom",
        of: event,
        collision: "fit"
    });
});

$( document ).click(function( event ) {
    $('#menu').addClass('hidden');
});

document.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

let preventNonNumericalInput = (e) => {
    e = e || window.event;
    let charCode = (typeof e.which == "undefined") ? e.keyCode : e.which;
    let charStr = String.fromCharCode(charCode);

  if (charStr.match(/[^0-9.-]/g))
    e.preventDefault();
}

// Keeps the total node in the middle of whatever size the window currently is.
let center = createNode('total');
function placeCenter() {
    center.style.left = (W / 2) - 100 + 'px';
    center.style.top = (H / 2) - 100 + 'px';
}
placeCenter();

let frame = () => {
    if (syncSize()) placeCenter();

    total = 0;
    ctx.clearRect(0, 0, W, H);

    // Lines run from the middle of the total node to each other node.
    const cx = center.offsetLeft + center.offsetWidth / 2;
    const cy = center.offsetTop + 10;
    for (let i = 1; i < n; i++) {
        const p = $("#drag" + i).position();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.left + 100, p.top + 10);
        ctx.stroke();
    }

    for (let f = 1; f < nodesUnsorted.length; f++) {
        const exp = $(`#drag${f} > input[name=expense]`);
        const inc = $(`#drag${f} > input[name=income]`);
        // (a jQuery object is always truthy, so check .length, not the object)
        if (exp.length) {
            nodesUnsorted[f].value = -(Number(exp.val()) || 0);
        } else if (inc.length) {
            nodesUnsorted[f].value = Number(inc.val()) || 0;
        }
    }
    for (let j = 0; j < nodes[0].length; j++) {
        total += nodesUnsorted[nodes[0][j]].value;
    }
    center.innerHTML = 'Total: $' + total;
    window.requestAnimationFrame(frame);
}
frame();
