const vertexShader = `#version 300 es
in vec4 apos;
in vec3 aage;

out vec3 vage;
out vec2 vpos;

vec2 lerp(vec2 a, vec2 b, float t) {
    return a + (b - a) * t;
}

void main() {
    vage = aage;
    
    vec2 tpos = lerp(apos.xy, apos.zw, 1.0 - aage.z) * vec2(1, -1);
    vpos = tpos;

    gl_Position = vec4(tpos, 0, 1);
}`;

const fragmentShader = `#version 300 es
precision highp float;

in vec3 vage;
in vec2 vpos;
out vec4 outCol;

vec3 lerp(vec3 a, vec3 b, float t) {
    return a + (b - a) * t;
}

void main () {
    vec3 dark = vec3(20.0 / 255.0, 20.0 / 255.0, 20.0 / 255.0);
    vec3 light = vec3(0.2 + (vpos.x / 1.6 - 0.25) * 1.0, 0.4, 0.6 + (vpos.y / 2.0 - 0.1) * 1.0) / 1.0; //vec3(240.0 / 255.0, 240.0 / 255.0, 240.0 / 255.0);

    vec3 col = lerp(dark, light, pow(max(0.0, min(1.0 - vage.x / 3.0, vage.y) + 0.3), 2.0));
    outCol = vec4(col, 1);//vage / 10.0);
}`;

const field = {
    numPoints: 8000,
    points: [],
    time: 0,

    glReady: false,

    init() {
        this.width = width;
        this.height = height;

        this.radius = Math.min(width, height) * 0.8 / 2;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        if (first) {
            for (let i = 0; i < this.numPoints; i ++) {
                this.points[i] = new FieldPoint();
            }
        }
    },
    initgl() {
        this.program = createProgram(
            this.gl,
            createShader(
                this.gl,
                this.gl.VERTEX_SHADER,
                vertexShader,
            ),
            createShader(
                this.gl,
                this.gl.FRAGMENT_SHADER,
                fragmentShader,
            ),
        );

        this.posAttrib = this.gl.getAttribLocation(this.program, 'apos');
        this.ageAttrib = this.gl.getAttribLocation(this.program, 'aage');
        this.camUniform = this.gl.getUniformLocation(this.program, 'cam');
        this.ptUniform = this.gl.getUniformLocation(this.program, 'pt');
        
        this.posBuffer = this.gl.createBuffer();
        this.ageBuffer = this.gl.createBuffer();

        this.positions = [];
        this.ages = [];
        
        this.pvao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.pvao);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.positions), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.posAttrib);
        this.gl.vertexAttribPointer(this.posAttrib, 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.ageBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.ages), this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.ageAttrib);
        this.gl.vertexAttribPointer(this.ageAttrib, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.viewport(0, 0, this.width, this.height);
    },
    fillBuffer() {
        this.positions.length = 0;
        this.ages.length = 0;
        
        /*
        Figure out how to do stuff with tail...
        Tail only updates every once-in-a-while
        Maybe sync everything? 
        Only update buffer when needed?
        
        Only update parts of buffer?
        Only one segment will change at a time,
        but that segment's location in the buffer
        will change as well.
        */

        for (const p of this.points) {
            if (p.tail.length > 2) {
                const pt = (frame + p.updateOffset) % FieldPoint.updateDelay / FieldPoint.updateDelay;

                this.positions.push(
                    p.x / this.width * 2,
                    p.y / this.height * 2,
                    p.x / this.width * 2,
                    p.y / this.height * 2,


                    p.tail[0] / this.width * 2,
                    p.tail[1] / this.height * 2,
                    p.tail[2] / this.width * 2,
                    p.tail[3] / this.height * 2,
                );

                // Age, transparency, pt
                this.ages.push(
                    0, p.trans, pt,
                    1, p.trans, pt,
                );

                for (let i = 0; i < p.tail.length - 6; i += 2) {
                    this.positions.push(
                        p.tail[i    ] / this.width * 2, // Current point
                        p.tail[i + 1] / this.height * 2,
                        p.tail[i + 2] / this.width * 2, // Lerp point
                        p.tail[i + 3] / this.height * 2,

                        p.tail[i + 2] / this.width * 2, // Next point
                        p.tail[i + 3] / this.height * 2,
                        p.tail[i + 4] / this.width * 2, // Lerp point
                        p.tail[i + 5] / this.height * 2,
                    );

                    // Age, transparency, pt
                    this.ages.push(
                        i / 2 + 1, p.trans, pt,
                        i / 2 + 2, p.trans, pt
                    );
                }
            }
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.positions), this.gl.STATIC_DRAW);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.ageBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.ages), this.gl.STATIC_DRAW);
    },

    canvas: document.getElementById('field-canvas'),
    gl: document.getElementById('field-canvas').getContext('webgl2'),

    runPoints() {
        if (clicked) return

        for (const point of this.points) point.update();

        this.time += 0.001;
    },
    displayBorder() {
        ctx.lineWidth = 7;
        ctx.strokeStyle = palette.light;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, this.radius, 0, tau);
        ctx.closePath();
        ctx.stroke();
    },
    
    rungl() {
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.useProgram(this.program);

        this.gl.bindVertexArray(this.pvao);

        // Each line has two verticies ( / 2) and each vertex takes 4 floats ( / 4)
        this.gl.drawArrays(this.gl.LINES, 0, this.positions.length / 4 / 2 * 2);
    },
};

class FieldPoint {
    static updateDelay = 10;
    static flag = true;
    constructor() {
        this.setPos();

        this.tailLen = 5;
        this.tail = [];

        this.updateOffset = Math.random() * FieldPoint.updateDelay | 0;

        this.cx = this.x + width / 2;
        this.cy = this.y + height / 2;
        this.speed = 1.5;
        this.scale = 1/300;

        this.lifespan = 10 + Math.random() * 10 | 0;
        this.life = this.lifespan ;
        this.age = 0;
        this.trans = 0;

        this.baby = true; // Juss a wittle babie (I don't know why I wrote that, haha)

        if (FieldPoint.flag) {
            FieldPoint.flag = false;
            this.flag = true;
        }     

        this.angle = (noise.perlin3(this.x * this.scale, this.y * this.scale, field.time)) * tau;
    }
    setPos() {
        const angle = Math.random() * tau;
        this.x = Math.cos(angle) * Math.random() * field.radius;
        this.y = Math.sin(angle) * Math.random() * field.radius;
        // this.x = (Math.random() - 0.5) * field.radius * 2;
        // this.y = (Math.random() - 0.5) * field.radius * 2;
    }
    respawn() {
        this.setPos();

        this.life = this.lifespan;
        this.age = 0;

        this.tail.length = 0;

        this.angle = (noise.perlin3(this.x * this.scale, this.y * this.scale, field.time)) * tau;
    }
    update() {
        let dx = Math.cos(this.angle) * this.speed,
            dy = Math.sin(this.angle) * this.speed;

        this.x += dx;
        this.y += dy;

        if ((frame + this.updateOffset) % FieldPoint.updateDelay === 0) {
            this.tail.unshift(this.x, this.y);
            if (this.tail.length > this.tailLen * 2) {
                this.tail.pop();
                this.tail.pop();
            }

            this.baby = this.tail.length !== this.tailLen * 2;

            if (!this.baby) {
                this.age ++;
                this.life --;
            }
        }

        this.trans = this.baby ? 0 : 1;
        if (!this.baby) {
            if (this.age < this.lifespan / 3) this.trans = (this.age - 1 + (frame + this.updateOffset) % FieldPoint.updateDelay / FieldPoint.updateDelay) * 3 / this.lifespan;
            if (this.life < this.lifespan / 3) this.trans = (this.life - (frame + this.updateOffset) % FieldPoint.updateDelay / FieldPoint.updateDelay) * 3 / this.lifespan;
        }

        this.angle = (noise.perlin3(this.x * this.scale, this.y * this.scale, field.time)) * tau;

        const dist = Math.sqrt(this.x ** 2 + this.y ** 2);

        if (this.life === 0 || dist > field.radius) this.respawn();
    }
}
