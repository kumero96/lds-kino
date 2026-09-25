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
var APP_VERSION = "14";
var Diag = {
    el: null,
    info: "",
    // включается ?debug=1 в адресе или тремя нажатиями «0» на пульте
    init: function() {
        var zeros = 0, zt = 0;
        document.addEventListener("keydown", function(ev) {
            if (ev.keyCode === 48 || ev.keyCode === 96) {
                var now = Date.now();
                zeros = now - zt < 1500 ? zeros + 1 : 1;
                zt = now;
                if (zeros >= 3 && !Diag.el) Diag.show();
            }
        }, false);
        if (/[?&]debug=1/.test(window.location.search)) Diag.show();
    },
    // что умеет телевизор: системные плееры Samsung/LG, форматы видео и дорожки
    caps: function() {
        var v = document.createElement("video");
        var can = function(t) {
            try { return v.canPlayType(t) ? "да" : "нет"; } catch (e) { return "?"; }
        };
        var w = window;
        return "Samsung tizen: " + (w.tizen ? "да" : "нет") +
            ", webapis: " + (w.webapis ? "да" : "нет") +
            ", avplay: " + (w.webapis && w.webapis.avplay ? "да" : "нет") +
            " · LG webOS: " + (w.webOS || w.PalmSystem ? "да" : "нет") +
            " · MKV: " + can("video/x-matroska") + ", HEVC: " + can('video/mp4; codecs="hvc1"') +
            ", AC3: " + can('audio/mp4; codecs="ac-3"') +
            " · дорожки звука: " + (v.audioTracks ? "да" : "нет");
    },
    show: function() {
        var ua = navigator.userAgent;
        var m = ua.match(/Tizen [\d.]+|Web0S|webOS[^;)]*|Android [\d.]+/);
        var c = ua.match(/Chrome\/(\d+)/);
        Diag.info = "v" + APP_VERSION + " · " + (m ? m[0] : "браузер") + (c ? " · Chrome " + c[1] : "") +
            " · " + window.innerWidth + "×" + window.innerHeight + (window.devicePixelRatio ? " ×" + window.devicePixelRatio : "");
        Diag.el = document.createElement("div");
        Diag.el.id = "diag";
        Diag.info += "<br>" + Diag.caps();
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
