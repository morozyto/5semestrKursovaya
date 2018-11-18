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

window.onload = function () {

    let photo = document.getElementById('photo');
    let canvas = document.getElementById('canvas');
    let video = document.getElementById('video');
    let button = document.getElementById('button');
    let allow = document.getElementById('allow');
    let context = canvas.getContext('2d');
    let videoStreamUrl = false;

    // функция которая будет выполнена при нажатии на кнопку захвата кадра
    var captureMe = function () {
        if (!videoStreamUrl) alert('Allow camera first!')

        //context.drawImage(video, 0, 0, video.width, video.height);

        photo.src = start(video,


            function(context, leftX, rightX, downY, upY) {

                var myImageData = context.getImageData(leftX, downY, rightX - leftX, upY - downY);
                var data = myImageData.data;

                var sum = 0;

                for (var i = 0; i < data.length; i += 4) {
                    if (data[i] > 3*max(data[i + 1], data[i + 2]) / 2)
                        sum += 1;
                }

                var pixelCount = data.length / 4;

                if (sum > pixelCount * 9 / 10)
                    return true;
                else
                    return false;
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
    }

    button.addEventListener('click', captureMe);

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL.createObjectURL = window.URL.createObjectURL || window.URL.webkitCreateObjectURL || window.URL.mozCreateObjectURL || window.URL.msCreateObjectURL;

    navigator.getUserMedia({video: true}, function (stream) {
        allow.style.display = "none";

        videoStreamUrl = window.URL.createObjectURL(stream);

        video.src = videoStreamUrl;
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


    for (var currentSize = 150; currentSize < max; currentSize = currentSize + 50) {

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

    let base64dataUrl = canvas.toDataURL('image/png');

    return base64dataUrl;
}