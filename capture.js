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

function getHeatMap(canvas, imagedata) {

    var data = imagedata.data;

    for (var i = 0; i < data.length; i += 4) {
        let R = data[i + 0];
        let G = data[i + 1];
        let B = data[i + 2];
        let I = 0.2126*R + 0.7152*G + 0.0722*B;
        data[i + 0] = I;
        data[i + 1] = data[i + 2] = 0;
    }

    return canvas.putImageData(imagedata, 0, 0).toDataURL('image/png');
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

    let neighborhood = (imageData.width - 1) / 2;

    let coords = getOldCoords(neighborhood, neighborhood, x, y);

    var data = imageData.data;

    let index = ((coords.y * (imageData.width * 4)) + (coords.x * 4));

    //alert("x = " + coords.x + " , y = " + coords.y + ' , width = ' + imageData.width);

    let R = data[index + 0];
    let G = data[index + 1];
    let B = data[index + 2];
    let I = 0.2126*R + 0.7152*G + 0.0722*B;
   // alert("I is " + I);

    return I;
}

function found_move(oldImageData, newImageData, x_start, y_start, neighborhood, maxWidth, maxHeight, verbose) {

    if (x_start < neighborhood || y_start < neighborhood || (maxWidth - x_start) <= neighborhood || (maxHeight - y_start) <= neighborhood)
        return {x: 0, y: 0};

   // var oldImageData = context_old.getImageData(x_start - neighborhood, y_start - neighborhood, 2*neighborhood + 1, 2*neighborhood + 1);
    //var newImageData = context_new.getImageData(x_start - neighborhood, y_start - neighborhood, 2*neighborhood + 1, 2*neighborhood + 1);

    let a = 0, b = 0, c = 0, d = 0, d1 = 0, d2 = 0;

   // alert("first a is " + a);

    for (let i = -neighborhood + 1; i <= neighborhood - 1; i++) {
        for (let j = -neighborhood + 1; j <= neighborhood - 1; j++) {
            let cur_i = x_start + i;
            let cur_j = y_start + j;
            let newCoords = getNewCoords(x_start, y_start, cur_i, cur_j);
            let weight = getGauss(newCoords.x, newCoords.y, 0.2);

            let x_deriv = getXDerivative(1, 1, oldImageData, newImageData, newCoords.x, newCoords.y);
            let y_deriv = getYDerivative(1, 1, oldImageData, newImageData, newCoords.x, newCoords.y);
            let t_deriv = getTDerivative(1, 1, oldImageData, newImageData, newCoords.x, newCoords.y);

            if (verbose)
                alert('x_deriv is ' + x_deriv + ' y_deriv is ' + y_deriv + ' t_deriv is ' + t_deriv + ' i = ' + i + ' j = ' + j);


            a = a + weight * x_deriv * x_deriv;
            b = b + weight * x_deriv * y_deriv;
            d = d + weight * y_deriv * y_deriv;

            d1 = d1 - weight * t_deriv * x_deriv;
            d2 = d2 - weight * t_deriv * y_deriv;
        }
    }
    c = b;

   // alert("a is " + a);

    let det = a*d - b*c;
    if (det === 0) {
        alert("det is 0");
        return {x: 0, y: 0};
    } else {
      //  alert("det is " + det);
    }

    let answer = {x: (d*d1 - b*d2) / det, y: (-c*d1 + a*d2) / det};

    if (verbose)
        alert('answer.x = ' + answer.x + ' , answer.y = ' + answer.y);


    return answer;   // Vector of movement
}

window.onload = function () {

    let photo = document.getElementById('photo');
    let photoOld = document.getElementById('photoprev');

    let photoint = document.getElementById('photo');
    let photoOldint = document.getElementById('photoprev');

    let canvas = document.getElementById('canvas');
    let canvas1 = document.getElementById('canvas1');

    let canvas2 = document.getElementById('canvas2');
    let canvas3 = document.getElementById('canvas3');

    let video = document.getElementById('video');
    let capture_button = document.getElementById('capture_button');
   // let previous_button = document.getElementById('previous_image_button');
    let allow = document.getElementById('allow');
    let context = canvas.getContext('2d');
    let context1 = null; //canvas1.getContext('2d');

    // функция которая будет выполнена при нажатии на кнопку захвата кадра
    var captureMe = function () {

        if (context1) {
            context.drawImage(video, 0, 0, video.width, video.height);

            photo.src = canvas.toDataURL('image/png');

            let future_previous = context.getImageData(0, 0, video.width, video.height);

            let neighborhood = 30;

           // alert('video width is ' + video.width);

           // let i = 100;
           // let j = 100;
          //  let diff = found_move(context.getImageData(i - neighborhood, j - neighborhood, 2*neighborhood + 1, 2*neighborhood + 1),
           //     context1.getImageData(i - neighborhood, j - neighborhood, 2*neighborhood + 1, 2*neighborhood + 1),
           //     i, j, neighborhood, video.width, video.height);

            for (let i = 0; i < video.width; i++) {
                if (i % 50 === 0)
                    console.log("current width", i);
                for (let j = 0; j < video.height; j++) {
                    let verbose = false;//i % 10 === 0 & j % 10 === 0;
                    let diff = found_move(context.getImageData(i - neighborhood, j - neighborhood, 2*neighborhood + 1, 2*neighborhood + 1),
                        context1.getImageData(i - neighborhood, j - neighborhood, 2*neighborhood + 1, 2*neighborhood + 1),
                        i, j, neighborhood, video.width, video.height, verbose);


                    if (i % 5 === 0 & j % 5 === 0)
                        draw_strela(context, i, j, diff.x, diff.y);
                }
            }

            photoint.src = getHeatMap(canvas2, future_previous);
            photoOldint.src = getHeatMap(canvas3, context1.getImageData(0, 0, video.width, video.height));

            photo.src = canvas.toDataURL('image/png');
            photoOld.src = canvas1.toDataURL('image/png');

            context1.putImageData(future_previous, 0, 0);
        } else {
            context1 = canvas1.getContext('2d');
            context1.drawImage(video, 0, 0, video.width, video.height);
            photoOld.src = canvas1.toDataURL('image/png');
        }


    };

    capture_button.addEventListener('click', captureMe);

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    navigator.getUserMedia({video: true}, function (stream) {
        allow.style.display = "none";

        video.srcObject = stream;
    }, function () {
        alert('Oh, i am sorry, did i break your concentration? TURN THE CAMERA ON!');
    });
};