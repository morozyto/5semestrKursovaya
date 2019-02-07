"use strict";

function min(a, b) {
    if (a > b)
        return b;
    else
        return a;
}

function max(a, b) {
    if (a > b)
        return a;
    else
        return b;
}

function is_red(context, leftX, rightX, downY, upY) {

    var myImageData = context.getImageData(leftX, downY, rightX - leftX, upY - downY);
    var data = myImageData.data;

    var sum = 0;

    for (var i = 0; i < data.length; i += 4) {
        if (data[i] > 3*max(data[i + 1], data[i + 2]) / 2)
            sum += 1;
    }

    var pixelCount = data.length / 4;

    return sum > pixelCount * 99 / 100;
}

function smile(context, left, right, bottom, top) {

    context.beginPath();
    let midX = (left + right) / 2;
    let midY = (bottom + top) / 2;
    let lenX = right - left;
    let lenY = top - bottom;
    if (lenX < 0)
        return;
    if (lenY < 0)
        return;

    let t = min(lenX, lenY) / 2;

    context.arc(midX, midY, t, 0, Math.PI*2, true); // Внешняя окружность

    let bigRadius = (2*t)/3;

    context.moveTo(midX + bigRadius, midY);

    context.arc(midX, midY, bigRadius, 0, Math.PI, false);  // рот (по часовой стрелке)

    let miniRadius = t / 8;

    context.moveTo(midX - (t / 4) + miniRadius, midY - (t / 3));
    context.arc(midX - (t / 4), midY - (t / 3), miniRadius, 0, Math.PI*2, true);  // Левый глаз
    context.moveTo(midX + (t / 4) + miniRadius, midY - (t / 3));
    context.arc(midX + (t / 4), midY - (t / 3), miniRadius, 0, Math.PI*2, true);  // Правый глаз
    context.stroke();
}




/*
Метод отрисовывает "стрелку" (черный отрезок с оранжевым наконечником).
Аргументами задается контекст, координаты начала стрелки, длина ее проекции на оси
*/
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

/*
Метод вычисляет значение функции гаусса для заданных координат
*/
function getGauss(new_x, new_y) {
    const otklonenie = 0.2;
    return (1. / (Math.sqrt(2*Math.PI) * otklonenie)) * Math.exp(- (new_x*new_x + new_y*new_y) / 2*otklonenie*otklonenie);
}

/*
Метод вычисляет производную оптического потока по координате x
*/
function getXDerivative(dx, dy, get_i_old, get_i, i, j) {
    return (1. / 4.) * dx * ((get_i_old(i + dx, j) + get_i_old(i + dx, j + dy) + get_i(i + dx, j) + get_i(i + dx, j + dy))
        - (get_i_old(i, j) + get_i_old(i, j + dy) + get_i(i, j) + get_i(i, j + dy)));
}

/*
Метод вычисляет производную оптического потока по координате y
*/
function getYDerivative(dx, dy, get_i_old, get_i, i, j) {
    return (1. / 4.) * dy * ((get_i_old(i, j + dy) + get_i_old(i + dx, j + dy) + get_i(i, j + dy) + get_i(i + dx, j + dy))
        - (get_i_old(i, j) + get_i_old(i + dx, j) + get_i(i, j) + get_i(i + dx, j)));
}

/*
Метод вычисляет производную оптического потока по времени
*/
function getTDerivative(dx, dy, get_i_old, get_i, i, j) {
    return (1. / 4.) * ((get_i(i, j) + get_i(i + dx, j) + get_i(i, j + dy) + get_i(i + dx, j + dy))
        - (get_i_old(i, j) + get_i_old(i + dx, j) + get_i_old(i, j + dy) + get_i_old(i + dx, j + dy)));
}

/*
Метод вычисляет вектор движения пикселя между кадрами.
Аргументами передается @get_deriv - лямбда, которая хранит посчитанные производные для данной точки,
                       @x_start, @y_star - координаты точки
                       @neighborhood - окрестность, для которой искать движение
                       @maxWidth, @maxHeight - размеры окна
                       @get_weight - лямбда, которая хранит посчитанные веса
*/
function found_move(get_deriv, x_start, y_start, neighborhood, maxWidth, maxHeight, get_weight) {

    if (x_start < neighborhood || y_start < neighborhood || (maxWidth - x_start) <= neighborhood || (maxHeight - y_start) <= neighborhood)
        return {x: 0, y: 0};

    let a = 0, b = 0, c = 0, d = 0, d1 = 0, d2 = 0;

    for (let i = -neighborhood; i <= neighborhood - 1; i++) {
        for (let j = -neighborhood; j <= neighborhood - 1; j++) {
            const cur_i = x_start + i;
            const cur_j = y_start + j;
            const weight = get_weight(i, j);

            const x_deriv = get_deriv(cur_i, cur_j, 0);
            const y_deriv = get_deriv(cur_i, cur_j, 1);
            const t_deriv = get_deriv(cur_i, cur_j, 2);

            const t1 = weight * x_deriv;
            const t2 = weight * y_deriv;

            a = a + t1 * x_deriv;
            b = b + t1 * y_deriv;
            d = d + t2 * y_deriv;

            d1 = d1 - t_deriv * t1;
            d2 = d2 - t_deriv * t2;
        }
    }
    c = b;

    const det = a*d - b*c;
    if (det === 0) {
        return {x: 0, y: 0};
    }

    return {x: (d*d1 - b*d2) / det, y: (-c*d1 + a*d2) / det};// Vector of movement
}

window.onload = function () {

    const photo = document.getElementById('photo');
    const photoOld = document.getElementById('photoprev');

    const canvas = document.getElementById('canvas');
    const canvas1 = document.getElementById('canvas1');


    const video = document.getElementById('video');
    const allow = document.getElementById('allow');
    const context = canvas.getContext('2d');
    let context1 = null; //canvas1.getContext('2d');

    let x0 = null, x1 = null, y0 = null, y1 = null;
    let found = false;

    const captureMe = function () {

        if (context1 && found) {

            const start_time = performance.now();  // позволяет посчитать перфоманс обработки одного кадра

            context.drawImage(video, 0, 0, video.width, video.height);

            photo.src = canvas.toDataURL('image/png');

            const future_previous = context.getImageData(0, 0, video.width, video.height);
            let is = [];
            let derivs = [];

            let get_val = function (index) {
                return future_previous.data[index];
            };

            let get_i = function (x, y) {
                return is[y * video.width + x];
            };

            let get_deriv = function (x, y, offset) {
                return derivs[y * video.width * 3 + x * 3 + offset];
            };

            for (let i = 0; i < video.width; i++) {

                for (let j = 0; j < video.height; j++) {

                    let index = (j * (video.width * 4)) + (i * 4);

                    let R = get_val(index + 0);
                    let G = get_val(index + 1);
                    let B = get_val(index + 2);
                    let I = 0.2126 * R + 0.7152 * G + 0.0722 * B;
                    is[j * video.width + i] = I;
                }
            }

            const current_previuos = context1.getImageData(0, 0, video.width, video.height);
            let is_old = [];

            let get_val_old = function (index) {
                return current_previuos.data[index];
            };

            let get_i_old = function (x, y) {
                return is_old[y * video.width + x];
            };

            for (let i = 0; i < video.width; i++) {

                for (let j = 0; j < video.height; j++) {

                    let index = (j * (video.width * 4)) + (i * 4);
                    let R = get_val_old(index + 0);
                    let G = get_val_old(index + 1);
                    let B = get_val_old(index + 2);
                    let I = 0.2126 * R + 0.7152 * G + 0.0722 * B;
                    is_old[j * video.width + i] = I;
                }
            }

            for (let i = 0; i < video.width - 1; i++) {

                for (let j = 0; j < video.height - 1; j++) {

                    let x_deriv = getXDerivative(1, 1, get_i_old, get_i, i, j);
                    let y_deriv = getYDerivative(1, 1, get_i_old, get_i, i, j);
                    let t_deriv = getTDerivative(1, 1, get_i_old, get_i, i, j);

                    let index = j * video.width * 3 + i * 3;

                    derivs[index + 0] = x_deriv;
                    derivs[index + 1] = y_deriv;
                    derivs[index + 2] = t_deriv;
                }
            }

            let weights = [];
            const neighborhood = 10; // окрестность, в которой будем искать движения пикселя

            for (let i = -neighborhood; i <= neighborhood - 1; i++) {
                for (let j = -neighborhood; j <= neighborhood - 1; j++) {

                    weights[j * neighborhood + i] = getGauss(i, j);

                }
            }

            let get_weight = function (x, y) {
                return weights[y * neighborhood + x];
            };

            let count = 0;
            let averageX = 0, averageY = 0;
            for (let i = x0; i < x1; i++) {

                for (let j = y0; j < y1; j++) {
                    const diff = found_move(get_deriv, i, j, neighborhood, video.width, video.height, get_weight);

                    count++;
                    averageX += 2*diff.x;
                    averageY += 2*diff.y;

                    if (i % 5 === 0 & j % 5 === 0)
                        draw_strela(context, i, j, diff.x, diff.y);
                }
            }

            averageX = Math.trunc(averageX / count);
            averageY = Math.trunc(averageY / count);

            x0 += averageX;
            x1 += averageX;
            y0 += averageY;
            y1 += averageY;

            photo.src = canvas.toDataURL('image/png');
            photoOld.src = canvas1.toDataURL('image/png');

            context1.putImageData(future_previous, 0, 0);

            console.log('Время выполнения = ', performance.now() - start_time);
        } else {

            context1 = canvas1.getContext('2d');
            context1.drawImage(video, 0, 0, video.width, video.height);

            let maxWidth = video.width;
            let maxHeigth = video.height;
            let max = min(maxHeigth, maxWidth);

            const buffer = context1.getImageData(0, 0, video.width, video.height);

            const currentSize = Math.trunc(max / 10);

            let step = Math.trunc(currentSize / 4);

            for (let x = 0; x + currentSize < maxWidth; x = x + step) {
                for (let y = 0; y + currentSize < maxHeigth; y = y + step) {
                    let leftX = x;
                    let rightX = x + currentSize;
                    let downY = y;
                    let upY = y + currentSize;
                    if (is_red(context1, leftX, rightX, downY, upY)) {
                        x0 = leftX;
                        x1 = rightX;
                        y0 = downY;
                        y1 = upY;
                        smile(context1, leftX, rightX, downY, upY);
                        found = true;
                        break;
                    }
                }
            }

            photoOld.src = canvas1.toDataURL('image/png');

            if (found) {
                context1.putImageData(buffer, 0, 0);
            }
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
         setTimeout(run, 200);
     }, 1000);
};