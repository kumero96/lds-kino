/* Кинотеатр ЛДС — плеер. ES5. */

function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    var mm = (m < 10 && h ? "0" : "") + m, ss = (sec < 10 ? "0" : "") + sec;
    return h ? h + ":" + mm + ":" + ss : mm + ":" + ss;
}

var Player = {
    active: false,
    d: null,
    group: null,
    index: 0,
    video: null,
    hideTimer: null,
    saveTimer: null,
    nextTimer: null,
    seekTarget: null,
    seekTimer: null,

    open: function(d, group, index) {
        Player.d = d;
        Player.group = group;
        Player.active = true;
        Router.saveState();
        Player.returnKey = Focus.valid() ? Focus.cur.getAttribute("data-k") : null;
        var p = document.getElementById("player");
        p.innerHTML = "";
        p.className = "on show";
        var v = document.createElement("video");
        v.setAttribute("playsinline", "");
        v.setAttribute("preload", "auto");
        Player.video = v;
        p.appendChild(v);
        // касание/клик по видео: показать панель, повторно — пауза
        v.onclick = function() {
            if (Player.uiVisible()) Player.toggle();
            else Player.showUi();
        };
        Player.buildUi(p);
        v.addEventListener("timeupdate", Player.tick);
        v.addEventListener("progress", Player.tick);
        v.addEventListener("waiting", function() { Player.busy(true); });
        v.addEventListener("playing", function() { Player.busy(false); Player.updatePlayBtn(); Player.autoHide(); });
        v.addEventListener("pause", function() { Player.updatePlayBtn(); Player.showUi(); });
        v.addEventListener("ended", Player.onEnded);
        v.addEventListener("error", Player.onError);
        v.addEventListener("loadedmetadata", Player.onMeta);
        Keys.handlers.push(Player.onKey);
        Player.saveTimer = setInterval(Player.save, 5000);
        Player.load(index);
    },

    buildUi: function(p) {
        var ui = el("div", "ui");
        Player.titleEl = el("div", "ptop");
        ui.appendChild(Player.titleEl);
        var bottom = el("div", "pbottom");
        var bar = el("div", "bar");
        Player.bufEl = el("div", "buf");
        Player.posEl = el("div", "pos");
        Player.dotEl = el("div", "dot");
        bar.appendChild(Player.bufEl);
        bar.appendChild(Player.posEl);
        bar.appendChild(Player.dotEl);
        bottom.appendChild(bar);
        var times = el("div", "times");
        Player.curEl = el("span", null, "0:00");
        Player.durEl = el("span", null, "");
        times.appendChild(Player.curEl);
        times.appendChild(Player.durEl);
        bottom.appendChild(times);
        var btns = el("div", "pbtns");
        Player.btns = btns;
        bottom.appendChild(btns);
        ui.appendChild(bottom);
        p.appendChild(ui);
        Player.osd = el("div", "osd");
        p.appendChild(Player.osd);
        Player.nextBox = el("div", "next");
        p.appendChild(Player.nextBox);
        Player.spin = el("div", "busy", '<div class="spinner"></div>');
        p.appendChild(Player.spin);
    },

    buildButtons: function() {
        var b = Player.btns;
        b.innerHTML = "";
        var files = Player.group.files;
        var add = function(html, key, fn) {
            var e = pill(html, null, key, function() {
                fn();
                Player.autoHide();
            });
            b.appendChild(e);
            return e;
        };
        if (Player.index > 0) add(icon("prev") + "Пред.", "p-prev", function() { Player.load(Player.index - 1); });
        add(icon("rew") + "10 с", "p-rew", function() { Player.seekBy(-10); });
        Player.playBtn = add(icon("pause"), "p-play", function() { Player.toggle(); });
        add(icon("ff") + "10 с", "p-ff", function() { Player.seekBy(10); });
        if (Player.index < files.length - 1) add(icon("next") + "След.", "p-next", function() { Player.load(Player.index + 1); });
        var v = Player.video;
        if (v.audioTracks && v.audioTracks.length > 1) add(icon("audio") + "Озвучка", "p-audio", Player.chooseAudio);
        if (Player.d.groups.length > 1) add(icon("hd") + escHtml(Player.group.label), "p-quality", Player.chooseQuality);
        add(icon("report") + "Проблема", "p-report", function() {
            reportDialog(Player.d, Player.file(), Player.group);
        });
        Player.updatePlayBtn();
    },

    file: function() {
        return Player.group.files[Player.index];
    },

    load: function(index) {
        var f = Player.group.files[index];
        if (!f) return;
        Player.save();
        Player.index = index;
        Player.hideNext();
        var d = Player.d;
        Player.titleEl.innerHTML = escHtml(d.name) + (f.episode > 0 ? ' <span style="color:#8DACC7">· ' + escHtml(f.title) + "</span>" : "");
        Store.addHistory(toMovie(d), Player.group.key, f.name, f.title);
        Player.resumeAt = Store.resumeAt(f.name);
        Player.busy(true);
        Player.video.src = f.url;
        try { Player.video.load(); } catch (e) {}
        var pr = Player.video.play();
        if (pr && pr.catch) pr.catch(function() {});
        Player.buildButtons();
        Player.showUi();
        Focus.set(Player.playBtn, true);
    },

    onMeta: function() {
        var v = Player.video;
        if (Player.resumeAt > 0 && Player.resumeAt < v.duration - 5) {
            try { v.currentTime = Player.resumeAt; } catch (e) {}
            Player.flash("Продолжаем с " + fmtTime(Player.resumeAt));
        }
        Player.resumeAt = 0;
        Player.buildButtons();
        if (Focus.cur && !document.getElementById("player").contains(Focus.cur)) Focus.set(Player.playBtn, true);
        else if (Focus.cur && !document.body.contains(Focus.cur)) Focus.set(Player.playBtn, true);
    },

    tick: function() {
        var v = Player.video;
        if (!v || !v.duration) return;
        var t = Player.seekTarget !== null ? Player.seekTarget : v.currentTime;
        var pct = Math.min(100, t / v.duration * 100);
        Player.posEl.style.width = pct + "%";
        Player.dotEl.style.left = pct + "%";
        try {
            if (v.buffered.length) Player.bufEl.style.width = Math.min(100, v.buffered.end(v.buffered.length - 1) / v.duration * 100) + "%";
        } catch (e) {}
        Player.curEl.innerHTML = fmtTime(t);
        Player.durEl.innerHTML = "−" + fmtTime(v.duration - t);
    },

    save: function() {
        var v = Player.video;
        if (!v || !Player.d || !v.duration || v.currentTime < 1) return;
        var f = Player.file();
        Store.savePosition(Player.d.id, f.name, v.ended ? v.duration : v.currentTime, v.duration);
    },

    toggle: function() {
        var v = Player.video;
        if (v.paused) {
            var pr = v.play();
            if (pr && pr.catch) pr.catch(function() {});
        } else v.pause();
        Player.showUi();
    },

    updatePlayBtn: function() {
        if (!Player.playBtn) return;
        Player.playBtn.innerHTML = icon(Player.video.paused ? "play" : "pause");
    },

    // перемотка: удержание кнопки ускоряет шаг, сама перемотка — после паузы в нажатиях
    seekBy: function(sec) {
        var v = Player.video;
        if (!v.duration) return;
        var base = Player.seekTarget !== null ? Player.seekTarget : v.currentTime;
        Player.seekTarget = Math.max(0, Math.min(v.duration - 2, base + sec));
        Player.tick();
        Player.flash((sec > 0 ? "» " : "« ") + fmtTime(Player.seekTarget) + " / " + fmtTime(v.duration));
        clearTimeout(Player.seekTimer);
        Player.seekTimer = setTimeout(function() {
            try { v.currentTime = Player.seekTarget; } catch (e) {}
            Player.seekTarget = null;
        }, 450);
    },

    flash: function(text) {
        Player.osd.innerHTML = escHtml(text);
        Player.osd.className = "osd on";
        clearTimeout(Player.osdTimer);
        Player.osdTimer = setTimeout(function() { Player.osd.className = "osd"; }, 1500);
    },

    busy: function(on) {
        Player.spin.className = "busy" + (on ? " on" : "");
    },

    showUi: function() {
        var p = document.getElementById("player");
        if (!/\bshow\b/.test(p.className)) p.className = "on show";
        Player.autoHide();
    },

    hideUi: function() {
        document.getElementById("player").className = "on";
    },

    uiVisible: function() {
        return /\bshow\b/.test(document.getElementById("player").className);
    },

    autoHide: function() {
        clearTimeout(Player.hideTimer);
        Player.hideTimer = setTimeout(function() {
            if (Player.active && !Player.video.paused && !Modal.active && !/\bon\b/.test(Player.nextBox.className)) Player.hideUi();
        }, 4500);
    },

    onKey: function(ev, code) {
        if (!Player.active || Modal.active) return false;
        var visible = Player.uiVisible();
        if (isKey(code, KEY.BACK)) {
            if (/\bon\b/.test(Player.nextBox.className)) {
                Player.hideNext();
                return true;
            }
            if (visible && !Player.video.paused) {
                Player.hideUi();
                return true;
            }
            Player.close();
            return true;
        }
        if (isKey(code, KEY.PLAY) || isKey(code, KEY.PAUSE)) {
            Player.toggle();
            return true;
        }
        if (isKey(code, KEY.STOP)) {
            Player.close();
            return true;
        }
        if (isKey(code, KEY.FF)) {
            Player.seekBy(30);
            return true;
        }
        if (isKey(code, KEY.RW)) {
            Player.seekBy(-30);
            return true;
        }
        if (!visible) {
            // панель скрыта: влево/вправо — перемотка, ОК — пауза, вверх/вниз — показать панель
            if (code === KEY.LEFT || code === KEY.RIGHT) {
                var step = ev.repeat ? 30 : 10;
                Player.seekBy(code === KEY.LEFT ? -step : step);
                return true;
            }
            if (code === KEY.ENTER) {
                Player.toggle();
                return true;
            }
            if (code === KEY.UP || code === KEY.DOWN) {
                Player.showUi();
                Focus.set(Player.playBtn, true);
                return true;
            }
            return false;
        }
        // панель видна: обычная навигация по кнопкам, но таймер скрытия продлеваем
        Player.autoHide();
        if (code === KEY.UP || code === KEY.DOWN) return true;
        return false;
    },

    onEnded: function() {
        Player.save();
        var files = Player.group.files;
        if (Player.index >= files.length - 1) {
            Player.close();
            return;
        }
        // следующая серия через 10 секунд, как в онлайн-кинотеатрах
        var n = files[Player.index + 1];
        var left = 10;
        var box = Player.nextBox;
        box.innerHTML = "";
        var txt = el("div", null, "");
        box.appendChild(txt);
        var btns = el("div", "buttons");
        var go = pill(icon("play") + "Смотреть", "primary", null, function() { Player.load(Player.index + 1); });
        btns.appendChild(go);
        btns.appendChild(pill("Отмена", null, null, function() {
            Player.hideNext();
            Player.close();
        }));
        box.appendChild(btns);
        var draw = function() {
            txt.innerHTML = "Следующая: <b>" + escHtml(n.title) + "</b> через " + left + " с";
        };
        draw();
        box.className = "next on";
        Player.showUi();
        Focus.set(go, true);
        clearInterval(Player.nextTimer);
        Player.nextTimer = setInterval(function() {
            left--;
            if (left <= 0) {
                clearInterval(Player.nextTimer);
                Player.load(Player.index + 1);
            } else draw();
        }, 1000);
    },

    hideNext: function() {
        clearInterval(Player.nextTimer);
        if (Player.nextBox) Player.nextBox.className = "next";
    },

    onError: function() {
        if (!Player.active) return;
        Player.busy(false);
        var f = Player.file();
        var dlg = el("div", "dialog");
        dlg.appendChild(el("h3", null, "Не удалось воспроизвести"));
        dlg.appendChild(el("p", null, "Этот файл (" + escHtml(f.ext.toUpperCase()) + ", " + escHtml(Player.group.label) +
            ") не поддерживается браузером телевизора или временно недоступен."));
        var b = el("div", "buttons");
        var first = null;
        if (Player.d.groups.length > 1) {
            first = pill(icon("hd") + "Другое качество", "primary", null, function() {
                Modal.hide();
                Player.chooseQuality();
            });
            b.appendChild(first);
        }
        var rep = pill(icon("report") + "Сообщить", null, null, function() {
            Modal.hide();
            reportDialog(Player.d, f, Player.group);
        });
        b.appendChild(rep);
        b.appendChild(pill("Закрыть", null, null, function() {
            Modal.hide();
            Player.close();
        }));
        dlg.appendChild(b);
        Modal.show(dlg, null, first || rep);
    },

    chooseQuality: function() {
        var d = Player.d, opts = [];
        for (var i = 0; i < d.groups.length; i++) opts.push([d.groups[i].key, d.groups[i].label]);
        Modal.choose("Качество", opts, Player.group.key, function(k) {
            var cur = Player.file();
            for (var i = 0; i < d.groups.length; i++) {
                if (d.groups[i].key !== k) continue;
                var g = d.groups[i], idx = 0;
                // та же серия в другом качестве
                for (var j = 0; j < g.files.length; j++) {
                    if (g.files[j].season === cur.season && g.files[j].episode === cur.episode) idx = j;
                }
                Player.save();
                Player.group = g;
                Player.load(idx);
            }
        });
    },

    chooseAudio: function() {
        var tr = Player.video.audioTracks, opts = [], sel = null;
        for (var i = 0; i < tr.length; i++) {
            var t = tr[i];
            opts.push([String(i), t.label || t.language || "Дорожка " + (i + 1)]);
            if (t.enabled) sel = String(i);
        }
        Modal.choose("Озвучка", opts, sel, function(v) {
            for (var i = 0; i < tr.length; i++) tr[i].enabled = String(i) === v;
        });
    },

    close: function() {
        if (!Player.active) return;
        Player.save();
        Player.active = false;
        clearInterval(Player.saveTimer);
        clearTimeout(Player.hideTimer);
        Player.hideNext();
        var i = Keys.handlers.indexOf(Player.onKey);
        if (i >= 0) Keys.handlers.splice(i, 1);
        var v = Player.video;
        try {
            v.pause();
            v.removeAttribute("src");
            v.load();
        } catch (e) {}
        Player.video = null;
        var p = document.getElementById("player");
        p.className = "";
        p.innerHTML = "";
        // обновить страницу фильма: «Продолжить», отметки серий
        var entry = Router.current();
        if (entry) {
            entry.focusKey = Player.returnKey || entry.focusKey;
            Router.show(entry, true);
        }
    }
};
