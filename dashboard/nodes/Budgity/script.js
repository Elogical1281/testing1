const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
ctx.strokeStyle = 'black';
ctx.fillStyle = 'black';
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const W = canvas.width;
const H = canvas.height;

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
    console.log(n)
    let node = document.body.appendChild(document.createElement('div'));
    //node.innerHTML = `
    //    <div id="handle${n}" class="handle">
    //        <p>: : :</p>
    //    </div>
    //`;
    $(node).load(
        'nodes/' + a + '.html'
    );
    node.classList.add('node');
    node.classList.add(a);
    node.id = 'drag' + n;
    console.log(JSON.stringify((node.id)));
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

let frame = () => {
    total = 0;
    ctx.clearRect(0, 0, W, H);
    for (let i = 1; i < n; i++) {
        if (i !== 0) {
        ctx.beginPath();
        ctx.moveTo(W/2, (H/2)-90);
        ctx.lineTo($("#drag" + i).position().left+100, $("#drag" + i).position().top+10);
        ctx.stroke();
        }
    }
    for (let f = 1; f < nodesUnsorted.length; f++) {
        if (document.querySelector(('#drag' + f) + ' input[name="expense"]').valueAsNumber) {
        nodesUnsorted[f].value = document.querySelector(('#drag' + f) + ' input[name="expense"]').valueAsNumber;
        }
    }
    for (let j = 0; j < nodes[0].length; j++) {
        total += nodesUnsorted[nodes[0][j]].value
    }
    console.log(total);
    window.requestAnimationFrame(frame);
}

let center = createNode('total');
center.style.left = (window.innerWidth/2)-100 + 'px';
center.style.top = (window.innerHeight/2)-100 + 'px';
frame();