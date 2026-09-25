/* Кинотеатр ЛДС — запуск. ES5. */

// 1rem = 1/96 ширины экрана: интерфейс одинаков на 720p, 1080p и 4K (на телефоне — крупнее)
function fitScreen() {
    var w = window.innerWidth || document.documentElement.clientWidth || 1280;
    // ?tv=1 — всегда телевизионная раскладка (для проверки на компьютере)
    var forceTv = /[?&]tv=1/.test(window.location.search);
    var size = w < 900 && !forceTv ? Math.max(9, w / 48) : w / 96;
    document.documentElement.className = w < 900 && !forceTv ? "phone" : "";
    document.documentElement.style.fontSize = size + "px";
}

window.onerror = function(msg, src, line) {
    try { toast("Ошибка: " + msg + " (" + line + ")"); } catch (e) {}
};

// Временная диагностика: версия, браузер телевизора и скорость отклика на нажатия.
var APP_VERSION = "12";
var Diag = {
    el: null,
    info: "",
    init: function() {
        // показывается только с ?debug=1 в адресе
        if (!/[?&]debug=1/.test(window.location.search)) return;
        var ua = navigator.userAgent;
        var m = ua.match(/Tizen [\d.]+|Web0S|webOS[^;)]*|Android [\d.]+/);
        var c = ua.match(/Chrome\/(\d+)/);
        Diag.info = "v" + APP_VERSION + " · " + (m ? m[0] : "браузер") + (c ? " · Chrome " + c[1] : "") +
            " · " + window.innerWidth + "×" + window.innerHeight + (window.devicePixelRatio ? " ×" + window.devicePixelRatio : "");
        Diag.el = document.createElement("div");
        Diag.el.id = "diag";
        Diag.el.innerHTML = Diag.info;
        document.body.appendChild(Diag.el);
        var t0 = 0;
        window.addEventListener("keydown", function() {
            t0 = Date.now();
        }, true);
        document.addEventListener("keydown", function(ev) {
            var t1 = Date.now();
            var raf = window.requestAnimationFrame || function(f) { setTimeout(f, 16); };
            raf(function() {
                raf(function() {
                    var t2 = Date.now();
                    Diag.el.innerHTML = Diag.info + " · код " + ev.keyCode + ": обработка " + (t1 - t0) + " мс, кадр " + (t2 - t0) + " мс";
                });
            });
        }, false);
    }
};

(function start() {
    fitScreen();
    window.addEventListener("resize", fitScreen);
    Top.init();
    Menu.init();
    Keys.init();
    // Array.indexOf/filter есть во всех браузерах ТВ с 2013 года; на всякий случай проверим
    if (!Array.prototype.filter || !window.localStorage) toast("Браузер устарел: часть функций может не работать");
    // Samsung (Tizen): медиакнопки пульта нужно явно запросить у системы
    try {
        if (window.tizen && window.tizen.tvinputdevice) {
            var keys = ["MediaPlayPause", "MediaPlay", "MediaPause", "MediaStop", "MediaFastForward", "MediaRewind", "ColorF0Red"];
            for (var i = 0; i < keys.length; i++) {
                try { window.tizen.tvinputdevice.registerKey(keys[i]); } catch (e) {}
            }
        }
    } catch (e) {}
    Diag.init();
    Router.root("home");
})();
