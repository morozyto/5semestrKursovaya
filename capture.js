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

function getGauss(new_x, new_y, otklonenie) {
    return (1. / (Math.sqrt(2*Math.PI) * otklonenie)) * Math.exp(- (new_x*new_x + new_y*new_y) / 2*otklonenie*otklonenie);
}

function getXDerivative(dx, dy, old_image, new_image, i, j) {
    return (1. / 4.) * dx * ((getI(old_image, i + dx, j) + getI(old_image, i + dx, j + dy) + getI(new_image, i + dx, j) + getI(new_image, i + dx, j + dy))
        - (getI(old_image, i, j) + getI(old_image, i, j + dy) + getI(new_image, i, j) + getI(new_image, i, j + dy)));
}

function getYDerivative(dx, dy, old_image, new_image, i, j) {
    return (1. / 4.) * dy * ((getI(old_image, i, j + dy) + getI(old_image, i + dx, j + dy) + getI(new_image, i, j + dy) + getI(new_image, i + dx, j + dy))
        - (getI(old_image, i, j) + getI(old_image, i + dx, j) + getI(new_image, i, j) + getI(new_image, i + dx, j)));
}

function getTDerivative(dx, dy, old_image, new_image, i, j) {
    return (1. / 4.) * ((getI(new_image, i, j) + getI(new_image, i + dx, j) + getI(new_image, i, j + dy) + getI(new_image, i + dx, j + dy))
        - (getI(old_image, i, j) + getI(old_image, i + dx, j) + getI(old_image, i, j + dy) + getI(old_image, i + dx, j + dy)));
}

function getNewCoords(x_centre, y_centre, x, y) {
    return {x: x - x_centre, y: y - y_centre};
}

function getOldCoords(x_centre, y_centre, x_new, y_new) {
    return {x: x_new + x_centre, y: y_new + y_centre};
}

function getI(imageData, x, y) {

    var data = imageData.data;

    let index = ((y * (imageData.width * 4)) + (x * 4));

    let R = data[index + 0];
    let G = data[index + 1];
    let B = data[index + 2];

    return (0.2126*R + 0.7152*G + 0.0722*B);
}

function found_move(context_old, context_new, x_start, y_start, neighborhood, maxWidth, maxHeight) {

    if (x_start < neighborhood || y_start < neighborhood || (maxWidth - x_start) <= neighborhood || (maxHeight - y_start) <= neighborhood)
        return {x: 0, y: 0};

    var oldImageData = context_old.getImageData(x_start - neighborhood, y_start - neighborhood, 2*neighborhood + 1, 2*neighborhood + 1);
    var newImageData = context_new.getImageData(x_start - neighborhood, y_start - neighborhood, 2*neighborhood + 1, 2*neighborhood + 1);

    let a = 0, b = 0, c = 0, d = 0, d1 = 0, d2 = 0;

    for (let i = -neighborhood; i <= neighborhood; i++) {
        for (let j = -neighborhood; j <= neighborhood; j++) {
            let cur_i = x_start + i;
            let cur_j = y_start + j;
            let newCoords = getNewCoords(x_start, y_start, cur_i, cur_j);
            let weight = getGauss(newCoords.x, newCoords.y, 2);

            let x_deriv = getXDerivative(1, 1, oldImageData, newImageData, cur_i, cur_j);
            let y_deriv = getYDerivative(1, 1, oldImageData, newImageData, cur_i, cur_j);
            let t_deriv = getTDerivative(1, 1, oldImageData, newImageData, cur_i, cur_j);

            a = a + weight * x_deriv * x_deriv;
            b = b + weight * x_deriv * y_deriv;
            d = d + weight * y_deriv * y_deriv;

            d1 = d1 - weight * t_deriv * x_deriv;
            d2 = d2 - weight * t_deriv * y_deriv;
        }
    }
    c = b;

    let det = a*d - b*c;
    if (det === 0) {
        alert("det is 0");
        return {x: 0, y: 0};
    }

    return {x: (d*d1 - b*d2) / det, y: (-c*d1 + a*d2) / det};   // Vector of movement
}

var previous_image;

window.onload = function () {

    let photo = document.getElementById('photo');
    let canvas = document.getElementById('canvas');
    let video = document.getElementById('video');
    let capture_button = document.getElementById('capture_button');
    let previous_button = document.getElementById('previous_image_button');
    let allow = document.getElementById('allow');
    let context = canvas.getContext('2d');
    let videoStreamUrl = false;

    // функция которая будет выполнена при нажатии на кнопку захвата кадра
    var captureMe = function () {
        if (!videoStreamUrl) alert('Allow camera first!');

        previous_image = photo.src;
        photo.src = start(video,

            function(context, leftX, rightX, downY, upY) {

                var myImageData = context.getImageData(leftX, downY, rightX - leftX, upY - downY);
                var data = myImageData.data;

                var sum = 0;

                for (var i = 0; i < data.length; i += 4) {
                    if (data[i] > 12*max(data[i + 1], data[i + 2]) / 7)
                        sum += 1;
                }

                var pixelCount = data.length / 4;

                return sum > pixelCount * 9 / 10;
            },

            function(context, left, right, bottom, top) {

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
            });
    };

    capture_button.addEventListener('click', captureMe);

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    //window.URL.createObjectURL = window.URL.createObjectURL || window.URL.webkitCreateObjectURL || window.URL.mozCreateObjectURL || window.URL.msCreateObjectURL;

    navigator.getUserMedia({video: true}, function (stream) {
        allow.style.display = "none";

        video.srcObject = stream;
    }, function () {
        alert('Oh, i am sorry, did i break your concentration? TURN THE CAMERA ON!');
    });
};

function start(video, find_callback, mark_callback) {

    let context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, video.width, video.height);


    let maxWidth = video.width;
    let maxHeigth = video.height;
    let max = min(maxHeigth, maxWidth);


    for (var currentSize = 30; currentSize < max; currentSize = currentSize + 40) {

        let step = currentSize / 4;

        for (var x = 0; x < maxWidth; x = x + step) {
            for (var y = 0; y < maxHeigth; y = y + step) {
                let leftX = x;
                let rightX = x + currentSize;
                let downY = y;
                let upY = y + currentSize;
                if (find_callback(context, leftX, rightX, downY, upY)) {
                    mark_callback(context, leftX, rightX, downY, upY);
                }
            }
        }
    }

    return canvas.toDataURL('image/png');
}