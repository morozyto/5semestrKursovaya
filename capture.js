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

    return sum > pixelCount * 80 / 100;
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

function check_intersection(obj1, obj2) {
    const x00 = obj1['leftx'];
    const x10 = obj1['rightx'];
    const y00 = obj1['downy'];
    const y10 = obj1['upy'];

    const x01 = obj2['leftx'];
    const x11 = obj2['rightx'];
    const y01 = obj2['downy'];
    const y11 = obj2['upy'];

    return !(y00 >= y11 || y10 <= y01 || x10 <= x01 || x11 <= x00);
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

    let weights = [];
    const neighborhood = 10; // окрестность, в которой будем искать движения пикселя
    const derivativeNeighborhoodX = 1;
    const derivativeNeighborhoodY = 1;
    const maxObjects = 3;

    const maxFramesCountWithoutRecognition = 10;

    for (let i = -neighborhood; i <= neighborhood - 1; i++) {
        for (let j = -neighborhood; j <= neighborhood - 1; j++) {

            weights[j * neighborhood + i] = getGauss(i, j);

        }
    }


    let get_weight = function (x, y) {
        return weights[y * neighborhood + x];
    };

    let frameCount = 0;
    const objects = [];

    const captureMe = function () {

        if (objects && frameCount >= maxFramesCountWithoutRecognition) {
            objects.length = 0;
            frameCount = 0;
        }

        if (context1 && objects.length !== 0 && maxObjects !== 0) {

            frameCount = frameCount + 1;
            const start_time = performance.now();  // позволяет посчитать перфоманс обработки одного кадра

            context.drawImage(video, 0, 0, video.width, video.height);

            photo.src = canvas.toDataURL('image/png');

            const future_previous = context.getImageData(0, 0, video.width, video.height);
            const is = [];
            const derivs = [];

            const get_val = function (index) {
                return future_previous.data[index];
            };

            const get_i = function (x, y) {
                return is[y * video.width + x];
            };

            const get_deriv = function (x, y, offset) {
                return derivs[y * video.width * 3 + x * 3 + offset];
            };


            const current_previuos = context1.getImageData(0, 0, video.width, video.height);
            const is_old = [];

            const get_val_old = function (index) {
                return current_previuos.data[index];
            };

            const get_i_old = function (x, y) {
                return is_old[y * video.width + x];
            };

            const count_I = function(value_getter, start_index) {
                const R = value_getter(start_index + 0);
                const G = value_getter(start_index + 1);
                const B = value_getter(start_index + 2);
                return 0.2126 * R + 0.7152 * G + 0.0722 * B;
            };

            for (let i = 0; i < objects.length; i++) {
                const object = objects[i];

                const x0 = object['leftx'];
                const x1 = object['rightx'];
                const y0 = object['downy'];
                const y1 = object['upy'];

                const minXIndex = max(x0 - neighborhood, 0);
                const minYIndex = max(y0 - neighborhood, 0);
                const maxXIndex = min(x1 + derivativeNeighborhoodX + neighborhood, video.width);
                const maxYIndex = min(y1 + derivativeNeighborhoodY + neighborhood, video.height);

                for (let i = minXIndex; i < maxXIndex; i++) {
                    for (let j = minYIndex; j < maxYIndex; j++) {

                        const index = j * video.width + i;
                        const pixelIndex = index * 4;

                        is[index] = count_I(get_val, pixelIndex);
                        is_old[index] = count_I(get_val_old, pixelIndex);
                    }
                }

                const minX = max(0, x0 - neighborhood),
                    maxX = min(video.width - derivativeNeighborhoodX, x1 + neighborhood);
                const minY = max(0, y0 - neighborhood),
                    maxY = min(video.height - derivativeNeighborhoodY, y1 + neighborhood);

                for (let i = minX; i < maxX; i++) {
                    for (let j = minY; j < maxY; j++) {
                        const x_deriv = getXDerivative(derivativeNeighborhoodX, derivativeNeighborhoodY, get_i_old, get_i, i, j);
                        const y_deriv = getYDerivative(derivativeNeighborhoodX, derivativeNeighborhoodY, get_i_old, get_i, i, j);
                        const t_deriv = getTDerivative(derivativeNeighborhoodX, derivativeNeighborhoodY, get_i_old, get_i, i, j);

                        const index = j * video.width * 3 + i * 3;

                        derivs[index + 0] = x_deriv;
                        derivs[index + 1] = y_deriv;
                        derivs[index + 2] = t_deriv;
                    }
                }

                let averageX = 0, averageY = 0;
                for (let i = x0; i < x1; i++) {
                    for (let j = y0; j < y1; j++) {

                        const diff = found_move(get_deriv, i, j, neighborhood, video.width, video.height, get_weight);

                        averageX += diff.x;
                        averageY += diff.y;

                        if (i % 5 === 0 && j % 5 === 0)
                            draw_strela(context, i, j, diff.x, diff.y);
                    }
                }

                const pixelCount = (x1 - x0) * (y1 - y0);

                averageX = Math.trunc(averageX / pixelCount);
                averageY = Math.trunc(averageY / pixelCount);

                objects[i] = {'leftx': x0 + averageX, 'rightx': x1 + averageX, 'downy': y0 + averageY, 'upy': y1 + averageY};
            }

            photo.src = canvas.toDataURL('image/png');
            photoOld.src = canvas1.toDataURL('image/png');

            context1.putImageData(future_previous, 0, 0);

            console.log('Время выполнения = ', performance.now() - start_time);
        } else {

            context1 = canvas1.getContext('2d');
            context1.drawImage(video, 0, 0, video.width, video.height);

            const maxWidth = video.width;
            const maxHeigth = video.height;
            const max = min(maxHeigth, maxWidth);

            const buffer = context1.getImageData(0, 0, video.width, video.height);

            const currentSize = Math.trunc(max / 10);

            const step = Math.trunc(currentSize / 4);

            if (maxObjects !== 0) {

                for (let x = 0; x + currentSize < maxWidth; x = x + step) {
                    let exit = false;
                    for (let y = 0; y + currentSize < maxHeigth; y = y + step) {
                        const leftX = x;
                        const rightX = x + currentSize;
                        const downY = y;
                        const upY = y + currentSize;
                        if (is_red(context1, leftX, rightX, downY, upY)) {
                            const obj = {'leftx': leftX, 'rightx': rightX, 'downy': downY, 'upy': upY};

                            let badOne = false;
                            for (let i = 0; i < objects.length; i++) {
                                const object1 = objects[i];

                                if (check_intersection(obj, object1)) {
                                    badOne = true;
                                    break;
                                }
                            }

                            if (badOne) {
                                continue;
                            }

                            objects.push(obj);

                            if (objects.length === maxObjects) {
                                exit = true;
                                break;
                            }

                        }
                    }
                    if (exit) {
                        break;
                    }
                }

                for (let i = 0; i < objects.length; i++) {
                    const object = objects[i];
                    smile(context1, object['leftx'], object['rightx'], object['downy'], object['upy']);
                }
            }

            photoOld.src = canvas1.toDataURL('image/png');

            if (objects) {
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