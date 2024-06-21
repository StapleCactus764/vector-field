const ctx = canvas.getContext('2d');

const tau = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

const col = {
    grayscale: {
        light: 'rgb(240, 240, 240)',
        dark: 'rgb(20, 20, 20)',

        lightArr: [240, 240, 240],
        darkArr: [20, 20, 20],
    },
};
let palette = col.grayscale;

let first = true;

const wrapper = document.getElementById('wrapper');
const input = document.getElementById('points-input');
input.addEventListener('change', e => {
    const num = +input.value;
    if (num < field.numPoints) {
        field.points.length = num;
    } else {
        for (let i = field.numPoints; i < num; i ++) {
            field.points[i] = new FieldPoint();
        }
    }
    field.numPoints = num;
});

let width, height;
const setup = () => {
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    field.init();
    field.initgl();

    wrapper.style.top = (height / 2 - field.radius) / 2 - 40 + 'px';

    document.body.style.backgroundColor = palette.dark;

    first = false;
};



let frame = 0;

onresize = setup;

let clicked = false;
canvas.onmousedown = e => {
    if (Math.sqrt((e.offsetX - width / 2) ** 2 + (e.offsetY - height / 2) ** 2) < field.radius)
        clicked = !clicked;
};

const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
   
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
};
const createProgram =(gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
};
