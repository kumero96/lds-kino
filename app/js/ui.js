/* Кинотеатр ЛДС — ядро интерфейса: элементы, фокус пультом, экраны, меню, окна. ES5. */

/* ---------- иконки (Material Icons, пути SVG) ---------- */

var ICONS = {
    back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
    menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
    search: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
    star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
    starBorder: "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z",
    history: "M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
    movie: "M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z",
    tv: "M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z",
    child: "M12 2a10 10 0 100 20 10 10 0 000-20zm-3.5 7A1.5 1.5 0 118.5 12 1.5 1.5 0 018.5 9zm7 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 17.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z",
    sparkle: "M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5z",
    globe: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    tune: "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    report: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    next: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
    prev: "M6 6h2v12H6zm3.5 6l8.5 6V6z",
    rew: "M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z",
    ff: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z",
    audio: "M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
    hd: "M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm2-6h4c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1h-4V9zm1.5 4.5h2v-3h-2v3z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    forward: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
};

function icon(name) {
    return '<svg viewBox="0 0 24 24"><path d="' + ICONS[name] + '"/></svg>';
}

/* ---------- создание элементов ---------- */

function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined && html !== null) e.innerHTML = html;
    return e;
}

function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// делает элемент выбираемым пультом; key — чтобы после «Назад» вернуть фокус на то же место
function focusable(e, key, action) {
    e.setAttribute("data-f", "1");
    if (key) e.setAttribute("data-k", key);
    e._act = action;
    e.onclick = function() {
        Focus.set(e);
        if (e._act) e._act();
    };
    return e;
}

function pill(html, cls, key, action) {
    return focusable(el("div", "pill" + (cls ? " " + cls : ""), html), key, action);
}

/* ---------- фокус и навигация стрелками ---------- */

var Focus = {
    cur: null,

    layerRoot: function() {
        if (Modal.active) return [document.getElementById("modal")];
        if (Player.active) return [document.getElementById("player")];
        if (Menu.open) return [document.getElementById("menu")];
        return [document.getElementById("top"), document.getElementById("page")];
    },

    items: function() {
        var roots = Focus.layerRoot();
        var out = [];
        for (var r = 0; r < roots.length; r++) {
            var list = roots[r].querySelectorAll("[data-f]");
            for (var i = 0; i < list.length; i++) {
                if (list[i].offsetWidth > 0 || list[i].offsetHeight > 0) out.push(list[i]);
            }
        }
        return out;
    },

    set: function(e, noScroll) {
        if (!e) return;
        if (Focus.cur && Focus.cur !== e) Focus.cur.className = Focus.cur.className.replace(/\s*\bfocus\b/g, "");
        Focus.cur = e;
        if (!/\bfocus\b/.test(e.className)) e.className += " focus";
        if (!noScroll) Scroll.reveal(e);
        if (e._onfocus) e._onfocus();
    },

    first: function() {
        var list = Focus.items();
        // сначала — элементы страницы, а не шапки
        for (var i = 0; i < list.length; i++) {
            if (!Focus.inTop(list[i])) return list[i];
        }
        return list[0] || null;
    },

    inTop: function(e) {
        var top = document.getElementById("top");
        while (e) {
            if (e === top) return true;
            e = e.parentNode;
        }
        return false;
    },

    byKey: function(key) {
        if (!key) return null;
        var list = Focus.items();
        for (var i = 0; i < list.length; i++) if (list[i].getAttribute("data-k") === key) return list[i];
        return null;
    },

    valid: function() {
        if (!Focus.cur || !document.body.contains(Focus.cur)) return false;
        var list = Focus.items();
        for (var i = 0; i < list.length; i++) if (list[i] === Focus.cur) return true;
        return false;
    },

    // ищем ближайший элемент в нужную сторону по положению на экране
    move: function(dir) {
        if (!Focus.valid()) {
            Focus.set(Focus.first());
            return true;
        }
        var c = Focus.cur.getBoundingClientRect();
        var cx = c.left + c.width / 2, cy = c.top + c.height / 2;
        var list = Focus.items();
        var best = null, bestScore = 1e9, bestSame = null, bestSameScore = 1e9;
        for (var i = 0; i < list.length; i++) {
            var e = list[i];
            if (e === Focus.cur) continue;
            var r = e.getBoundingClientRect();
            var x = r.left + r.width / 2, y = r.top + r.height / 2;
            var d, side, overlap;
            if (dir === "left" || dir === "right") {
                d = dir === "right" ? r.left - c.left : c.right - r.right;
                if (d <= 2 || (dir === "right" ? x <= cx : x >= cx)) continue;
                overlap = r.bottom > c.top + 4 && r.top < c.bottom - 4;
                side = Math.abs(y - cy);
                var sh = d + side * 3;
                if (overlap && d < bestSameScore) {
                    bestSame = e;
                    bestSameScore = d;
                }
                if (sh < bestScore) {
                    best = e;
                    bestScore = sh;
                }
            } else {
                d = dir === "down" ? r.top - c.top : c.bottom - r.bottom;
                if (d <= 2 || (dir === "down" ? y <= cy : y >= cy)) continue;
                side = Math.abs(x - cx);
                // вертикальная близость важнее горизонтальной, но из ряда постеров
                // переходим к ближайшему по горизонтали элементу следующего ряда
                var sv = d * 1.5 + side;
                if (sv < bestScore) {
                    best = e;
                    bestScore = sv;
                }
            }
        }
        // влево/вправо — только в пределах своего ряда (иначе из первого столбца
        // фокус уезжал бы в шапку, а должно открываться меню)
        var target = dir === "left" || dir === "right" ? bestSame : best;
        if (target) {
            Focus.set(target);
            return true;
        }
        return false;
    }
};

/* ---------- прокрутка ---------- */

var Scroll = {
    // горизонтальные ряды прокручиваются мгновенно (надёжнее и быстрее на слабых ТВ)
    reveal: function(e) {
        // списки в окнах (жанры, страны…) прокручиваются внутри окна
        var list = e.parentNode;
        if (list && (" " + list.className + " ").indexOf(" list ") >= 0) {
            var top0 = e.offsetTop - list.offsetTop;
            if (top0 < list.scrollTop) list.scrollTop = top0;
            else if (top0 + e.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top0 + e.offsetHeight - list.clientHeight;
            return;
        }
        var row = e.parentNode;
        if (row && /\brow-items\b/.test(row.className)) {
            var pad = row.firstChild ? row.firstChild.offsetLeft : 0;
            var left = e.offsetLeft - pad;
            var right = e.offsetLeft + e.offsetWidth + pad - row.clientWidth;
            if (row.scrollLeft > left) row.scrollLeft = Math.max(0, left);
            else if (row.scrollLeft < right) row.scrollLeft = right;
        }
        var sc = Scroll.container(e);
        if (!sc) return;
        var top = 0, n = e;
        while (n && n !== sc) {
            top += n.offsetTop;
            n = n.offsetParent;
        }
        var h = window.innerHeight;
        var rem = h / 54;
        var cur = -(sc._y || 0);
        var headH = 6.5 * rem;
        var elTop = top, elBottom = top + e.offsetHeight;
        // заголовок ряда тоже должен быть виден
        var row2 = e.parentNode && e.parentNode.parentNode;
        if (row2 && /\brow\b/.test(row2.className)) {
            var rt = 0, m = row2;
            while (m && m !== sc) {
                rt += m.offsetTop;
                m = m.offsetParent;
            }
            elTop = Math.min(elTop, rt);
        }
        var target = cur;
        if (elTop - cur < headH) target = elTop - headH;
        else if (elBottom - cur > h - 2 * rem) target = elBottom - h + 3 * rem;
        if (Focus.first() === e || elTop < h * 0.35) target = Math.min(target, 0);
        target = Math.max(0, target);
        Scroll.to(sc, target);
    },
    container: function(e) {
        while (e && e !== document.body) {
            if (/\bscroll\b/.test(e.className)) return e;
            e = e.parentNode;
        }
        return null;
    },
    to: function(sc, y) {
        sc._y = -y;
        var t = "translateY(" + (-y) + "px)";
        sc.style.webkitTransform = t;
        sc.style.transform = t;
    }
};

/* ---------- экраны и история ---------- */

var Screens = {}; // name → function(params, ctx)

var Router = {
    stack: [],
    render: null,

    go: function(name, params, replace) {
        Router.saveState();
        var entry = { name: name, params: params || {}, focusKey: null, y: 0, rows: {} };
        if (replace) Router.stack = [entry];
        else Router.stack.push(entry);
        Router.show(entry, false);
        try {
            window.history.pushState({ d: Router.stack.length }, "");
            Router.pushed++;
        } catch (e) {}
    },

    pushed: 0,

    root: function(name, params) {
        Router.go(name, params, true);
    },

    saveState: function() {
        var cur = Router.stack[Router.stack.length - 1];
        if (!cur) return;
        if (Focus.valid() && !Focus.inTop(Focus.cur)) cur.focusKey = Focus.cur.getAttribute("data-k");
        var sc = document.querySelector("#page .scroll");
        cur.y = sc ? -(sc._y || 0) : 0;
        var rows = document.querySelectorAll("#page .row-items");
        cur.rows = {};
        for (var i = 0; i < rows.length; i++) if (rows[i].id) cur.rows[rows[i].id] = rows[i].scrollLeft;
    },

    back: function() {
        if (Router.stack.length > 1) {
            Router.stack.pop();
            Router.show(Router.stack[Router.stack.length - 1], true);
            return true;
        }
        return false;
    },

    // restoring: вернулись назад — восстановить прокрутку и фокус
    show: function(entry, restoring) {
        var page = document.getElementById("page");
        page.innerHTML = "";
        var sc = el("div", "scroll");
        page.appendChild(sc);
        Scroll.to(sc, 0);
        Backdrop.set(null);
        Top.update(entry);
        Menu.mark(entry.name);
        var token = {};
        Router.token = token;
        var ctx = {
            root: sc,
            entry: entry,
            alive: function() {
                return Router.token === token;
            },
            // экран дорисовал содержимое — ставим фокус
            ready: function(defaultEl) {
                if (Router.token !== token) return;
                var target = null;
                if (restoring) {
                    for (var id in entry.rows) {
                        var r = document.getElementById(id);
                        if (r) r.scrollLeft = entry.rows[id];
                    }
                    target = Focus.byKey(entry.focusKey);
                }
                if (!target) target = defaultEl || Focus.first();
                if (target) Focus.set(target);
                else Focus.cur = null;
            }
        };
        Screens[entry.name](entry.params, ctx);
    },

    current: function() {
        return Router.stack[Router.stack.length - 1];
    }
};

/* ---------- шапка ---------- */

var Top = {
    init: function() {
        var top = document.getElementById("top");
        top.innerHTML = "";
        top.appendChild(focusable(el("div", "icon-btn", icon("back")), null, function() { Keys.back(); }));
        top.appendChild(focusable(el("div", "icon-btn", icon("menu")), null, function() { Menu.show(); }));
        var logo = el("img", "logo");
        logo.src = "img/logo.png";
        top.appendChild(logo);
        Top.title = el("div", "title");
        top.appendChild(Top.title);
        top.appendChild(focusable(el("div", "icon-btn", icon("search")), null, function() { Router.root("search"); }));
    },
    update: function(entry) {
        Top.title.innerHTML = escHtml(entry.params.title || MENU_TITLES[entry.name] || "Кинотеатр");
    }
};

/* ---------- фон по выбранному фильму ---------- */

var Backdrop = {
    timer: null,
    set: function(url) {
        var b = document.getElementById("backdrop");
        clearTimeout(Backdrop.timer);
        if (!url) {
            b.className = "";
            return;
        }
        // небольшая задержка, чтобы не грузить фоны при быстром пролистывании
        Backdrop.timer = setTimeout(function() {
            b.style.backgroundImage = "url('" + url + "')";
            b.className = "on";
        }, 350);
    }
};

/* ---------- боковое меню ---------- */

var MENU = [
    ["home", "home", "Главная"],
    ["search", "search", "Поиск"],
    ["fav", "star", "Избранное"],
    ["history", "history", "История"],
    null,
    ["films", "movie", "Фильмы"],
    ["serials", "tv", "Сериалы"],
    ["cartoons", "child", "Мультфильмы"],
    ["anime", "sparkle", "Аниме"],
    ["docs", "globe", "Документальные"],
    ["catalog", "tune", "Каталог"]
];
var MENU_TITLES = {};

var Menu = {
    open: false,
    returnTo: null,
    items: {},

    init: function() {
        var m = document.getElementById("menu");
        for (var i = 0; i < MENU.length; i++) {
            if (!MENU[i]) {
                m.appendChild(el("div", "sep", "Разделы"));
                continue;
            }
            (function(item) {
                MENU_TITLES[item[0]] = item[2];
                var e = focusable(el("div", "menu-item", icon(item[1]) + "<span>" + item[2] + "</span>"), "menu-" + item[0], function() {
                    Menu.hide(true);
                    Router.root(item[0]);
                });
                Menu.items[item[0]] = e;
                m.appendChild(e);
            })(MENU[i]);
        }
        document.getElementById("menu-shade").onclick = function() { Menu.hide(); };
    },

    mark: function(name) {
        for (var k in Menu.items) {
            Menu.items[k].className = Menu.items[k].className.replace(/\s*\bactive\b/g, "") + (k === name ? " active" : "");
        }
    },

    show: function() {
        if (Menu.open) return;
        Menu.returnTo = Focus.cur;
        Menu.open = true;
        document.getElementById("menu").className = "open";
        document.getElementById("menu-shade").className = "on";
        var root = Router.stack[0];
        Focus.set(Menu.items[root ? root.name : "home"] || Menu.items.home, true);
    },

    hide: function(navigating) {
        if (!Menu.open) return;
        Menu.open = false;
        document.getElementById("menu").className = "";
        document.getElementById("menu-shade").className = "";
        if (!navigating && Menu.returnTo && document.body.contains(Menu.returnTo)) Focus.set(Menu.returnTo);
    }
};

/* ---------- окна поверх экрана ---------- */

var Modal = {
    active: false,
    returnTo: null,
    onClose: null,

    show: function(content, onClose, focusEl) {
        var m = document.getElementById("modal");
        if (!Modal.active) Modal.returnTo = Focus.cur;
        m.innerHTML = "";
        m.appendChild(content);
        m.className = "on";
        Modal.active = true;
        Modal.onClose = onClose || null;
        Focus.set(focusEl || Focus.first());
    },

    hide: function() {
        if (!Modal.active) return;
        Modal.active = false;
        document.getElementById("modal").className = "";
        document.getElementById("modal").innerHTML = "";
        var cb = Modal.onClose;
        Modal.onClose = null;
        if (Modal.returnTo && document.body.contains(Modal.returnTo)) Focus.set(Modal.returnTo, true);
        else if (!Player.active) Focus.set(Focus.first());
        if (cb) cb();
    },

    // список вариантов (выбор фильтра, качества, озвучки)
    choose: function(title, options, selected, onPick) {
        var d = el("div", "dialog");
        d.appendChild(el("h3", null, escHtml(title)));
        var list = el("div", "list");
        var focusEl = null;
        for (var i = 0; i < options.length; i++) {
            (function(o) {
                var sel = o[0] === selected;
                var e = focusable(el("div", "opt" + (sel ? " sel" : ""), (sel ? "✓ " : "") + escHtml(o[1])), null, function() {
                    Modal.hide();
                    onPick(o[0]);
                });
                if (sel) focusEl = e;
                list.appendChild(e);
            })(options[i]);
        }
        d.appendChild(list);
        Modal.show(d, null, focusEl);
    }
};

function toast(text) {
    var t = document.getElementById("toast");
    t.innerHTML = escHtml(text);
    t.className = "on";
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function() {
        t.className = "";
    }, 3000);
}

/* ---------- кнопки пульта ---------- */

var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
    BACK: [8, 27, 10009, 461, 166, 196],
    PLAY: [415, 10252, 179, 250],
    PAUSE: [19],
    STOP: [413],
    FF: [417, 228],
    RW: [412, 227]
};

function isKey(code, list) {
    for (var i = 0; i < list.length; i++) if (list[i] === code) return true;
    return false;
}

var Keys = {
    handlers: [], // перехватчики (плеер, клавиатура поиска)

    init: function() {
        document.addEventListener("keydown", function(ev) {
            var code = ev.keyCode;
            for (var i = Keys.handlers.length - 1; i >= 0; i--) {
                if (Keys.handlers[i](ev, code)) {
                    ev.preventDefault();
                    return;
                }
            }
            if (code === KEY.LEFT || code === KEY.RIGHT || code === KEY.UP || code === KEY.DOWN) {
                ev.preventDefault();
                var dir = code === KEY.LEFT ? "left" : code === KEY.RIGHT ? "right" : code === KEY.UP ? "up" : "down";
                var moved = Focus.move(dir);
                if (!moved && dir === "left" && !Menu.open && !Modal.active && !Player.active) Menu.show();
                else if (!moved && dir === "right" && Menu.open) Menu.hide();
            } else if (code === KEY.ENTER) {
                ev.preventDefault();
                if (Focus.valid() && Focus.cur._act) Focus.cur._act();
                else if (!Focus.valid()) Focus.set(Focus.first());
            } else if (isKey(code, KEY.BACK)) {
                ev.preventDefault();
                Keys.back();
            }
        }, false);

        // кнопка «Назад» браузера / Android
        window.addEventListener("popstate", function() {
            if (Keys.back(true)) {
                try {
                    window.history.pushState({ d: Router.stack.length }, "");
                } catch (e) {}
            }
        });
    },

    // true — «Назад» обработан внутри приложения
    back: function(fromHistory) {
        if (Player.active) {
            Player.close();
            return true;
        }
        if (Modal.active) {
            Modal.hide();
            return true;
        }
        if (Menu.open) {
            Menu.hide();
            return true;
        }
        if (Router.back()) return true;
        // корневой экран: сначала открыть меню, затем предложить выйти
        if (Router.current() && Router.current().name !== "home") {
            Router.root("home");
            return true;
        }
        Exit.ask(fromHistory);
        return true;
    }
};

var Exit = {
    ask: function() {
        var d = el("div", "dialog");
        d.appendChild(el("h3", null, "Выйти из кинотеатра?"));
        var b = el("div", "buttons");
        var no = pill("Остаться", "primary", null, function() { Modal.hide(); });
        b.appendChild(no);
        b.appendChild(pill("Выйти", null, null, function() {
            Modal.hide();
            Exit.now();
        }));
        d.appendChild(b);
        Modal.show(d, null, no);
    },
    now: function() {
        try {
            if (window.tizen) {
                window.tizen.application.getCurrentApplication().exit();
                return;
            }
        } catch (e) {}
        try {
            if (window.webOS && window.webOS.platformBack) {
                window.webOS.platformBack();
                return;
            }
        } catch (e) {}
        // в MSX и обычном браузере — вернуться туда, откуда открыли кинотеатр
        window.history.go(-(Router.pushed + 1));
        setTimeout(function() {
            try { window.close(); } catch (e) {}
        }, 300);
    }
};
