// ==UserScript==
// @name        yoedge-horizontal-screen
// @namespace   https://github.com/Lockvictor
// @author      Lockvictor
// @description 实现灰机汉化组漫画网站（yoedge.com）的横屏阅读模式 
// @homepage    https://github.com/Lockvictor/yoedge-horizontal-screen
// @updateURL   https://github.com/Lockvictor/yoedge-horizontal-screen/raw/master/yoedge-horizontal-screen.user.js
// @match       http://*.yoedge.com/smp-app/*
// @version     1.0.1
// @grant       none
// ==/UserScript==

const MANGA_ASPECT_RATIO = 1.5; //漫画宽高比

const DEFAULT_SCALE_RATIO = 0.6; //默认缩放比例
const MAX_SCALE_RATIO = 1; //最大缩放比例，与屏幕等宽
const MIN_SCALE_RATIO = 0.5; //最小缩放比例，屏幕的50%
const SCALE_STEP = 0.05;

const PAGE_BUTTON_AREA_RATIO = 0.1; //顶部和底部响应翻页事件的区域比例，10%
var SCROLLBY_RATIO = 0.15; //快捷键滚动屏幕比例

var gMangaAreaRatio = DEFAULT_SCALE_RATIO; //漫画宽度占屏幕宽度的比例


(function () {
    'use strict';

    // 调整工具按钮，把position由absolute改为fixed固定在右下角
    // 工具按钮延迟加载，因此采用定时检测
    var settingButtonFlag;
    settingButtonFlag = setInterval(function () {
        var normalButton = document.getElementById('normal-button');
        var settingButton = normalButton.parentElement;
        if (settingButton !== null) {
            settingButton.style.position = 'fixed';
            // 把弹出的工具栏也改为fixed固定在右下角
            // 每次点击工具按钮弹出工具栏时都会计算工具栏的位置，所以只能把修改注册到click事件中
            normalButton.addEventListener('click', function (event) {
                var toolContainer = document.getElementsByClassName('tool-container')[0];
                toolContainer.style.position = 'fixed';
                toolContainer.style.top = '';
                toolContainer.style.bottom = '0.5%';
            });
            clearInterval(settingButtonFlag);
        }
    }, 1000);

    // 调整container和canvas
    var canvasObj = document.getElementsByTagName('canvas')[0];
    var containerObj = canvasObj.parentElement;

    containerObj.style.width = '100%';
    containerObj.style.height = 'auto';
    containerObj.style.margin = '0';
    containerObj.style.textAlign = 'center';
    scaleCanvas(canvasObj, 0);

    // 添加mask覆盖canvas，屏蔽原有事件，以便实现自定义点击翻页和缩放
    addCanvasMask(canvasObj, containerObj);

    // 修正最后一页的弹出导航框被mask遮盖的问题
    fixModalBehavior();

    // 自定义缩放、滚动、翻页快捷键
    customizeShortcut(canvasObj);
})();


function scaleCanvas(canvasObj, increment) {
    if (increment > 0) {
        gMangaAreaRatio = (gMangaAreaRatio >= MAX_SCALE_RATIO) ? MAX_SCALE_RATIO : (gMangaAreaRatio + increment);
    } else if (increment < 0) {
        gMangaAreaRatio = (gMangaAreaRatio <= MIN_SCALE_RATIO) ? MIN_SCALE_RATIO : (gMangaAreaRatio + increment);
    }

    var newWidth = screen.width * gMangaAreaRatio;
    var newHeight = newWidth * MANGA_ASPECT_RATIO;

    canvasObj.style.width = newWidth + 'px';
    canvasObj.style.height = newHeight + 'px';

    var canvasMask = document.getElementById('canvasMask');
    if (canvasMask !== null) {
        canvasMask.style.width = newWidth + 'px';
        canvasMask.style.height = newHeight + 'px';
        canvasMask.style.marginLeft = - newWidth / 2 + 'px';
    }
}


function addCanvasMask(canvasObj, containerObj) {
    var canvasWidth = screen.width * gMangaAreaRatio;
    var canvasHeight = canvasWidth * MANGA_ASPECT_RATIO;

    var canvasMask = document.createElement('div');
    canvasMask.id = 'canvasMask';
    canvasMask.style.width = canvasWidth + 'px';
    canvasMask.style.height = canvasHeight + 'px';
    canvasMask.style.zIndex = 1;
    canvasMask.style.position = 'absolute';
    canvasMask.style.top = '0';
    canvasMask.style.left = '50%';
    canvasMask.style.marginLeft = - canvasWidth / 2 + 'px';
    // canvasMask.style.backgroundColor = 'rgba(211, 211, 211, 0.3)';

    //添加鼠标点击翻页事件
    canvasMask.addEventListener('mouseup', function (event) {
        var canvasHeight = screen.width * gMangaAreaRatio * MANGA_ASPECT_RATIO;
        var pageButtonAreaHeight = canvasHeight * PAGE_BUTTON_AREA_RATIO;
        if (event.layerY <= pageButtonAreaHeight) {
            prePage()
        } else if (event.layerY >= (canvasHeight - pageButtonAreaHeight)) {
            nextPage()
        }
    });

    containerObj.appendChild(canvasMask);
}


function fixModalBehavior() {
    var modalInner = document.getElementsByClassName('modal__inner')[0];
    var modalLabel = modalInner.previousElementSibling;
    modalInner.style.zIndex = '2';
    // 把click事件传给label，该label对应一个checkbox，可以控制弹出框的显隐
    modalInner.addEventListener('click', function (event) {
        modalLabel.dispatchEvent(new MouseEvent(event.type, event));
    });
}


function customizeShortcut(canvasObj) {
    //漫画缩放、滚动、翻页
    document.addEventListener('keydown', function (event) {
        switch (event.key) {
            case '=':
                scaleCanvas(canvasObj, SCALE_STEP);
                break;
            case '-':
                scaleCanvas(canvasObj, -SCALE_STEP);
                break;
            case '0':
                gMangaAreaRatio = DEFAULT_SCALE_RATIO;
                scaleCanvas(canvasObj, 0);
                break;
            case 'j':
                smoothyScrollBy(0, screen.width * gMangaAreaRatio * MANGA_ASPECT_RATIO * SCROLLBY_RATIO);
                break;
            case 'k':
                smoothyScrollBy(0, -screen.width * gMangaAreaRatio * MANGA_ASPECT_RATIO * SCROLLBY_RATIO);
                break;
            case 'h':
                prePage();
                break;
            case 'l':
                nextPage();
                break;
            default:
                break;
        }
    });
}


function prePage() {
    if (0 != smp.controller.now && !smp.controller.loading && !smp.controller.quickPlay()) {
        smp.controller.prePage();
        smoothyScrollTo(0, document.body.scrollHeight);
    }
}

function nextPage() {
    if (!smp.controller.loading && !smp.controller.quickPlay()) {
        smp.controller.nextPage();
        smoothyScrollTo(0, 0);
    }
}


function smoothyScrollBy(offsetX, offsetY) {
    window.scrollBy({top: offsetY, left: offsetX, behavior: 'smooth'});
}

function smoothyScrollTo(x, y) {
    window.scrollTo({top: y, left: x, behavior: 'smooth'});
}