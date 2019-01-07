"use strict";

function min(a, b) {
    if (a > b)
        return b;
    return a;
}

function max(a, b) {
    if (a > b)
        return a;
    return b;
}

function abs(a) {
    if (a > 0)
        return a;
    return -a;
}

function draw_strela(ctx, x_start, y_start, dx, dy) {
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(x_start, y_start);
    ctx.lineTo(x_start + dx, y_start + dy);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = "orange";
    ctx.beginPath();
    ctx.strokeRect(x_start + dx, y_start + dy, 1, 1);
    ctx.closePath();
    ctx.stroke();
}

function getGauss(new_x, new_y, otklonenie) {
    return (1. / (Math.sqrt(2*Math.PI) * otklonenie)) * Math.exp(- (new_x*new_x + new_y*new_y) / 2*otklonenie*otklonenie);
}

function getXDerivative(dx, dy, get_i_old, get_i, i, j) {
    return (1. / 4.) * dx * ((get_i_old(i + dx, j) + get_i_old(i + dx, j + dy) + get_i(i + dx, j) + get_i(i + dx, j + dy))
        - (get_i_old(i, j) + get_i_old(i, j + dy) + get_i(i, j) + get_i(i, j + dy)));
}

function getYDerivative(dx, dy, get_i_old, get_i, i, j) {
    return (1. / 4.) * dy * ((get_i_old(i, j + dy) + get_i_old(i + dx, j + dy) + get_i(i, j + dy) + get_i(i + dx, j + dy))
        - (get_i_old(i, j) + get_i_old(i + dx, j) + get_i(i, j) + get_i(i + dx, j)));
}

function getTDerivative(dx, dy, get_i_old, get_i, i, j) {
    return (1. / 4.) * ((get_i(i, j) + get_i(i + dx, j) + get_i(i, j + dy) + get_i(i + dx, j + dy))
        - (get_i_old(i, j) + get_i_old(i + dx, j) + get_i_old(i, j + dy) + get_i_old(i + dx, j + dy)));
}

function found_move(get_deriv, x_start, y_start, neighborhood, maxWidth, maxHeight, verbose, get_weight) {

    if (x_start < neighborhood || y_start < neighborhood || (maxWidth - x_start) <= neighborhood || (maxHeight - y_start) <= neighborhood)
        return {x: 0, y: 0};

    let a = 0, b = 0, c = 0, d = 0, d1 = 0, d2 = 0;

    for (let i = -neighborhood; i <= neighborhood - 1; i++) {
        for (let j = -neighborhood; j <= neighborhood - 1; j++) {
            let cur_i = x_start + i;
            let cur_j = y_start + j;
            let weight = get_weight(i, j);

            let x_deriv = get_deriv(cur_i, cur_j, 0);
            let y_deriv = get_deriv(cur_i, cur_j, 1);
            let t_deriv = get_deriv(cur_i, cur_j, 2);

            if (verbose)
                alert('x_deriv is ' + x_deriv + ' y_deriv is ' + y_deriv + ' t_deriv is ' + t_deriv + ' i = ' + i + ' j = ' + j);

            let t1 = weight * x_deriv;
            let t2 = weight * y_deriv;

            a = a + t1 * x_deriv;
            b = b + t1 * y_deriv;
            d = d + t2 * y_deriv;

            d1 = d1 - t_deriv * t1;
            d2 = d2 - t_deriv * t2;
        }
    }
    c = b;

    let det = a*d - b*c;
    if (det === 0) {
        return {x: 0, y: 0};
    }

    let answer = {x: (d*d1 - b*d2) / det, y: (-c*d1 + a*d2) / det};

    if (verbose)
        alert('answer.x = ' + answer.x + ' , answer.y = ' + answer.y);


    return answer;   // Vector of movement
}

window.onload = function () {

    let photo = document.getElementById('photo');
    let photoOld = document.getElementById('photoprev');


    let canvas = document.getElementById('canvas');
    let canvas1 = document.getElementById('canvas1');


    let video = document.getElementById('video');
    let capture_button = document.getElementById('capture_button');
    let allow = document.getElementById('allow');
    let context = canvas.getContext('2d');
    let context1 = null; //canvas1.getContext('2d');

    // функция которая будет выполнена при нажатии на кнопку захвата кадра

    var captureMe = function () {

        if (context1) {
            context.drawImage(video, 0, 0, video.width, video.height);

            photo.src = canvas.toDataURL('image/png');

            let future_previous = context.getImageData(0, 0, video.width, video.height);
         //   photoint.src = getHeatMap(canvas2, future_previous);
            let is = [];
            let derivs = [];

            let get_val = function(index) {
                return future_previous.data[index];
            };

            let get_i = function(x, y) {
                return is[y*video.width + x];
            };

            let get_deriv = function(x, y, offset) {
                return derivs[y*video.width*3 + x*3 + offset];
            };

            for (let i = 0; i < video.width; i++) {

                for (let j = 0; j < video.height; j++) {

                    let index = (j * (video.width * 4)) + (i * 4);

                    let R = get_val(index + 0);
                    let G = get_val(index + 1);
                    let B = get_val(index + 2);
                    let I = 0.2126*R + 0.7152*G + 0.0722*B;
                    is[j*video.width + i] = I;
                }
            }

            let current_previuos = context1.getImageData(0, 0, video.width, video.height);
            let is_old = [];

            let get_val_old = function(index) {
                return current_previuos.data[index];
            };

            let get_i_old = function(x, y) {
                return is_old[y*video.width + x];
            };

            for (let i = 0; i < video.width; i++) {

                for (let j = 0; j < video.height; j++) {

                    let index = (j * (video.width * 4)) + (i * 4);
                    let R = get_val_old(index + 0);
                    let G = get_val_old(index + 1);
                    let B = get_val_old(index + 2);
                    let I = 0.2126*R + 0.7152*G + 0.0722*B;
                    is_old[j*video.width + i] = I;
                }
            }

            let neighborhood = 10;


            for (let i = 0; i < video.width - 1; i++) {

                for (let j = 0; j < video.height - 1; j++) {

                    let x_deriv = getXDerivative(1, 1, get_i_old, get_i, i, j);
                    let y_deriv = getYDerivative(1, 1, get_i_old, get_i, i, j);
                    let t_deriv = getTDerivative(1, 1, get_i_old, get_i, i, j);

                    let index = j*video.width*3 + i*3;

                    derivs[index + 0] = x_deriv;
                    derivs[index + 1] = y_deriv;
                    derivs[index + 2] = t_deriv;
                }
            }

            let weights = [];

            for (let i = -neighborhood; i <= neighborhood - 1; i++) {
                for (let j = -neighborhood; j <= neighborhood - 1; j++) {

                    weights[j*neighborhood + i] = getGauss(i, j, 0.2);

                }
            }

            let get_weight = function(x, y) {
                return weights[y*neighborhood + x];
            };

            for (let i = 0; i < video.width; i++) {
                if (i % 50 === 0)
                    console.log("current width", i);
                for (let j = 0; j < video.height; j++) {
                    let verbose = false;//i % 10 === 0 & j % 10 === 0;
                    let diff = found_move(get_deriv, i, j, neighborhood, video.width, video.height, verbose, get_weight);

                    if (i % 5 === 0 & j % 5 === 0)
                        draw_strela(context, i, j, diff.x, diff.y);
                }
            }

          //  photoOldint.src = getHeatMap(canvas3, context1.getImageData(0, 0, video.width, video.height));

            photo.src = canvas.toDataURL('image/png');
            photoOld.src = canvas1.toDataURL('image/png');

            context1.putImageData(future_previous, 0, 0);
        } else {
            context1 = canvas1.getContext('2d');
            context1.drawImage(video, 0, 0, video.width, video.height);
            photoOld.src = canvas1.toDataURL('image/png');
        }


    };

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    navigator.getUserMedia({video: true}, function (stream) {
        allow.style.display = "none";

        video.srcObject = stream;
    }, function () {
        alert('Oh, i am sorry, did i break your concentration? TURN THE CAMERA ON!');
    });

     setTimeout(function run() {
         captureMe();
         setTimeout(run, 1);
     }, 1000);
};