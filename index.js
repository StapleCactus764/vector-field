setup();

field.init();
field.initgl();


const loop = () => {
    ctx.clearRect(0, 0, width, height);

    field.runPoints();
    field.fillBuffer();
    field.rungl();
    field.displayBorder();

    if (!clicked) frame ++;

    window.requestAnimationFrame(loop);
};
loop();
