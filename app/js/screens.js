/* Кинотеатр ЛДС — экраны. ES5. */

/* ---------- общие элементы ---------- */

function loading(root, text) {
    var m = el("div", "message", '<div class="spinner"></div>' + escHtml(text || "Загрузка…"));
    root.appendChild(m);
    return m;
}

function errorBox(root, text, retry) {
    var m = el("div", "message", escHtml(text) + "<br>Кинотеатр работает только при подключении к интернету ЛДС.<br>");
    var b = pill("Повторить", "primary", "retry", retry);
    m.appendChild(b);
    root.appendChild(m);
    return b;
}

function openMovie(m) {
    Router.go("movie", { id: m.id, title: cleanName(m.name) });
}

// постер: рейтинг, «новая серия», прогресс просмотра
function card(m, key) {
    var c = el("div", "card");
    var img = el("div", "img");
    // картинку грузим, только когда карточка рядом с экраном (Lazy.check)
    if (m.cover) img.setAttribute("data-bg", m.cover);
    else img.appendChild(el("div", "noimg", escHtml(m.name)));
    if (m.rating) img.appendChild(el("div", "badge rating", escHtml(m.rating)));
    if (newEpisodes[m.id] > 0) img.appendChild(el("div", "badge new", newEpisodes[m.id] === 1 ? "Новая серия" : "+" + newEpisodes[m.id] + " серий"));

    var total = Store.get("eps:" + m.id, 0);
    var frac = -1, done = false, label = null;
    if (total > 1) {
        var w = Math.min(Store.watched(m.id), total);
        var lastEp = Store.last(m.id);
        var part = lastEp ? Store.progress(lastEp.file) : -1;
        part = part > 0 && part < WATCHED ? part : 0;
        if (w > 0 || part > 0.01) {
            frac = (w + part) / total;
            done = w >= total;
            if (done) label = "✓ Просмотрено";
            else if (w > 0) label = w + " из " + total + " серий";
            else if (lastEp && lastEp.title) label = lastEp.title.replace("Сезон ", "С").replace(", серия ", " · серия ");
        }
    } else {
        var last = Store.last(m.id);
        if (last) {
            var p = Store.progress(last.file);
            if (p > 0.01) {
                frac = p;
                done = p >= WATCHED;
                if (done) label = "✓ Просмотрено";
            }
        }
    }
    if (label) img.appendChild(el("div", "badge " + (done ? "watched" : "count"), label));
    if (frac > 0) {
        var bar = el("div", "progress");
        var fill = el("i", done ? "done" : "");
        fill.style.width = Math.max(4, Math.round(frac * 100)) + "%";
        bar.appendChild(fill);
        img.appendChild(bar);
    }
    c.appendChild(img);
    c.appendChild(el("div", "name", escHtml(m.name)));
    if (m.year) c.appendChild(el("div", "year", escHtml(m.year)));
    focusable(c, key, function() { openMovie(m); });
    c._onfocus = function() { Backdrop.set(m.cover); };
    return c;
}

var rowSeq = 0;

// ряд постеров с заголовком и кнопкой «Все» справа от заголовка (как в Lampa)
function row(title, movies, keyPrefix, onAll) {
    var r = el("div", "row");
    var head = el("div", "row-head");
    head.appendChild(el("h2", null, escHtml(title)));
    if (onAll) head.appendChild(pill('Все<span class="after">' + icon("forward") + "</span>", "small", keyPrefix + "/all", onAll));
    r.appendChild(head);
    var items = el("div", "row-items");
    items.id = "row-" + keyPrefix;
    for (var i = 0; i < movies.length; i++) items.appendChild(card(movies[i], keyPrefix + "/" + movies[i].id));
    if (onAll) {
        var more = focusable(el("div", "card more-card", '<div class="img"><b>' + icon("forward") + '</b></div><div class="name">Все</div>'), keyPrefix + "/more", onAll);
        more.querySelector("b").style.width = "100%";
        items.appendChild(more);
    }
    r.appendChild(items);
    return r;
}

function grid(root, movies, keyPrefix) {
    var g = el("div", "grid");
    for (var i = 0; i < movies.length; i++) g.appendChild(card(movies[i], keyPrefix + "/" + movies[i].id));
    root.appendChild(g);
    return g;
}

/* ---------- главная ---------- */

var HOME_ROWS = [
    { title: "Последние добавления", params: { order: 0 }, cat: { order: "0" } },
    { title: "ТОП недели", best: true },
    { title: "Фильмы", params: { order: 0, genre: "!34" }, cat: { order: "0", genre: "!34" } },
    { title: "Зарубежные сериалы", params: { order: 0, genre: "34|0", country: "!61,!7,!4,!32|0" }, cat: { order: "0", genre: "34" } },
    { title: "Русские сериалы и шоу", params: { order: 0, genre: "34|0", country: "61,7,4,32|0" }, cat: { order: "0", genre: "34", country: "7" } },
    { title: "Популярное сейчас", params: { order: 8 }, cat: { order: "8" } },
    { title: "Комедии", params: { order: 0, genre: "4,!3,!7" }, cat: { order: "0", genre: "4" } },
    { title: "Боевики", params: { order: 0, genre: "6,18,12,3|0" }, cat: { order: "0", genre: "6" } },
    { title: "Фантастика и фэнтези", params: { order: 0, genre: "5,10|0" }, cat: { order: "0", genre: "5" } },
    { title: "Ужасы", params: { order: 0, genre: "7|0" }, cat: { order: "0", genre: "7" } },
    { title: "Мультфильмы", params: { order: 0, genre: "13|0" }, cat: { order: "0", genre: "13" } },
    { title: "Аниме", params: { order: 0, genre: "25|0" }, cat: { order: "0", genre: "25" } },
    { title: "Документальные", params: { order: 0, genre: "23|0" }, cat: { order: "0", genre: "23" } },
    { title: "Лучшее по КиноПоиску", params: { order: 9 }, cat: { order: "9" } }
];
var homeCache = {};

Screens.home = function(params, ctx) {
    var root = ctx.root;
    var spin = loading(root);
    var results = [];
    var left = HOME_ROWS.length + 1;
    var failed = null;
    var finish = function() {
        if (--left > 0 || !ctx.alive()) return;
        root.removeChild(spin);
        var any = false;
        var hist = Store.history();
        if (hist.length) {
            root.appendChild(row("Продолжить просмотр", hist.slice(0, 20), "hist", hist.length > 20 ? function() { Router.go("history", { title: "История" }); } : null));
            any = true;
        }
        var favs = Store.favorites(), withNew = [];
        for (var f = 0; f < favs.length; f++) if (newEpisodes[favs[f].id] > 0) withNew.push(favs[f]);
        if (withNew.length) root.appendChild(row("Новые серии в избранном", withNew, "new"));
        for (var i = 0; i < HOME_ROWS.length; i++) {
            if (!results[i] || !results[i].length) continue;
            any = true;
            (function(r, i) {
                root.appendChild(row(r.title, results[i], "r" + i, r.cat ? function() {
                    Router.go("catalog", { title: r.title, filters: r.cat });
                } : null));
            })(HOME_ROWS[i], i);
        }
        if (!any) ctx.ready(errorBox(root, failed || "Пустой ответ сервера", function() { Router.root("home"); }));
        else ctx.ready(root.querySelector(".card"));
    };
    checkNewEpisodes(finish);
    for (var i = 0; i < HOME_ROWS.length; i++) {
        (function(i) {
            var r = HOME_ROWS[i];
            var ok = function(list) {
                homeCache[i] = list;
                results[i] = list;
                finish();
            };
            var bad = function(e) {
                failed = e;
                results[i] = homeCache[i];
                finish();
            };
            if (r.best) {
                api("Video.getBestsellers", {}, function(x) { ok(flatten(x.bestsellers)); }, bad);
            } else {
                var p = { offset: 0, size: 20 };
                for (var k in r.params) p[k] = r.params[k];
                api("Video.getCatalog", p, function(x) { ok(parseMovies(x.movies)); }, bad);
            }
        })(i);
    }
};

/* ---------- каталог с фильтрами ---------- */

var SORTS = [["0", "Новые поступления"], ["1", "По году"], ["8", "Популярное"], ["6", "Хиты"], ["9", "Рейтинг КиноПоиска"], ["2", "Рейтинг IMDb"]];
var GENRES = [["", "Все жанры"], ["!34", "Фильмы"], ["34", "Сериалы"], ["4", "Комедии"], ["6", "Боевики"], ["2", "Драмы"],
    ["5", "Фантастика"], ["10", "Фэнтези"], ["7", "Ужасы"], ["3", "Триллеры"], ["33", "Детективы"], ["1", "Криминал"],
    ["12", "Приключения"], ["17", "Мелодрамы"], ["13", "Мультфильмы"], ["25", "Аниме"], ["15", "Семейные"],
    ["18", "Военные"], ["19", "Исторические"], ["20", "Биография"], ["23", "Документальные"]];
var YEARS = (function() {
    var now = new Date().getFullYear();
    var y = [["", "Любой год"]];
    for (var i = 0; i < 4; i++) y.push([String(now - i), String(now - i)]);
    return y.concat([["2020-e", "2020-е"], ["2010-e", "2010-е"], ["2000-e", "2000-е"], ["1990-e", "1990-е"], ["1980-e", "1980-е"], ["1970-e", "1970-е"], ["1900-1969", "до 1970"]]);
})();
var COUNTRIES = [["", "Любая страна"], ["7", "Россия"], ["4", "СССР"], ["3", "США"], ["2", "Великобритания"], ["1", "Франция"],
    ["16", "Германия"], ["14", "Италия"], ["15", "Испания"], ["18", "Канада"], ["8", "Австралия"], ["17", "Япония"],
    ["330", "Южная Корея"], ["11", "Китай"], ["106", "Индия"], ["39", "Турция"], ["32", "Украина"], ["61", "Беларусь"]];
var QUALITIES = [["", "Любое качество"], ["4", "4K"], ["3", "1080p"], ["2", "720p"], ["1", "SD"]];
var FILTERS = [
    { key: "order", title: "Сортировка", list: SORTS, icon: "tune" },
    { key: "genre", title: "Жанр", list: GENRES, icon: "movie" },
    { key: "year", title: "Год", list: YEARS, icon: "history" },
    { key: "country", title: "Страна", list: COUNTRIES, icon: "globe" },
    { key: "quality", title: "Качество", list: QUALITIES, icon: "hd" }
];
var PAGE = 48;

function labelOf(list, v) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1];
    return v;
}

// пункты меню «Фильмы», «Сериалы» и т.д. — это каталог с готовым жанром
Screens.films = function(p, ctx) { Screens.catalog({ title: "Фильмы", filters: { genre: "!34" } }, ctx); };
Screens.serials = function(p, ctx) { Screens.catalog({ title: "Сериалы", filters: { genre: "34" } }, ctx); };
Screens.cartoons = function(p, ctx) { Screens.catalog({ title: "Мультфильмы", filters: { genre: "13" } }, ctx); };
Screens.anime = function(p, ctx) { Screens.catalog({ title: "Аниме", filters: { genre: "25" } }, ctx); };
Screens.docs = function(p, ctx) { Screens.catalog({ title: "Документальные", filters: { genre: "23" } }, ctx); };

Screens.catalog = function(params, ctx) {
    var root = ctx.root;
    var f = {};
    var src = ctx.entry.params.filters || params.filters || {};
    for (var i = 0; i < FILTERS.length; i++) f[FILTERS[i].key] = src[FILTERS[i].key] || (FILTERS[i].key === "order" ? "0" : "");
    // фильтры, выбранные на этом экране, запоминаем в истории — чтобы «Назад» вернул их
    ctx.entry.params.filters = f;

    var bar = el("div", "filters");
    for (var j = 0; j < FILTERS.length; j++) {
        (function(flt) {
            var val = f[flt.key];
            bar.appendChild(pill(icon(flt.icon) + escHtml(labelOf(flt.list, val)), val && !(flt.key === "order" && val === "0") ? "sel" : "", "flt-" + flt.key, function() {
                Modal.choose(flt.title, flt.list, f[flt.key], function(v) {
                    f[flt.key] = v;
                    ctx.entry.focusKey = "flt-" + flt.key;
                    Router.show(ctx.entry, true);
                });
            }));
        })(FILTERS[j]);
    }
    bar.appendChild(pill(icon("close") + "Сбросить", null, "flt-reset", function() {
        ctx.entry.params.filters = {};
        ctx.entry.focusKey = "flt-reset";
        Router.show(ctx.entry, true);
    }));
    root.appendChild(bar);
    var info = el("div", "hint", "");
    root.appendChild(info);
    var g = el("div", "grid");
    root.appendChild(g);
    var status = el("div");
    root.appendChild(status);

    var state = { offset: 0, total: -1, loading: false, done: false, readyCalled: false };
    var loadMore = function() {
        if (state.loading || state.done || !ctx.alive()) return;
        state.loading = true;
        status.innerHTML = "";
        var spin = state.offset === 0 ? loading(status) : null;
        api("Video.getCatalog", {
            offset: state.offset, size: PAGE, order: f.order, genre: f.genre, year: f.year, country: f.country, quality: f.quality
        }, function(r) {
            if (!ctx.alive()) return;
            state.loading = false;
            status.innerHTML = "";
            var list = parseMovies(r.movies);
            state.total = parseInt(r.total, 10) || 0;
            for (var i = 0; i < list.length; i++) {
                var c = card(list[i], "cat/" + list[i].id);
                // когда фокус подходит к концу — подгружаем следующую порцию
                (function(c, idx) {
                    var prev = c._onfocus;
                    c._onfocus = function() {
                        prev();
                        if (idx > state.offset - 18) loadMore();
                    };
                })(c, state.offset + i);
                g.appendChild(c);
            }
            state.offset += list.length;
            Lazy.check();
            if (!list.length || state.offset >= state.total) state.done = true;
            info.innerHTML = state.total ? "Найдено: " + state.total : "";
            if (!state.total) status.appendChild(el("div", "message", "Ничего не найдено — попробуйте убрать часть фильтров"));
            if (!state.readyCalled) {
                state.readyCalled = true;
                ctx.ready(g.firstChild || bar.firstChild);
            }
        }, function(e) {
            if (!ctx.alive()) return;
            state.loading = false;
            status.innerHTML = "";
            var b = errorBox(status, e, loadMore);
            if (!state.readyCalled) {
                state.readyCalled = true;
                ctx.ready(b);
            }
        });
    };
    loadMore();
};

/* ---------- избранное и история ---------- */

function listScreen(ctx, movies, emptyText) {
    if (!movies.length) {
        ctx.root.appendChild(el("div", "message", escHtml(emptyText)));
        ctx.ready(null);
        return;
    }
    var g = grid(ctx.root, movies, "list");
    ctx.ready(g.firstChild);
}

Screens.fav = function(p, ctx) {
    checkNewEpisodes(function() {
        if (ctx.alive()) listScreen(ctx, Store.favorites(), "Здесь пока пусто.\nОткройте фильм и нажмите «В избранное».");
    });
};

Screens.history = function(p, ctx) {
    listScreen(ctx, Store.history(), "Вы ещё ничего не смотрели.");
};

/* ---------- экранная клавиатура ---------- */

var KB_RU = ["йцукенгшщзхъ", "фывапролджэё", "ячсмитьбю.,-"];
var KB_EN = ["qwertyuiop'-", "asdfghjkl:!?", "zxcvbnm.,()&"];

// value/onChange: текущий текст; onSubmit — кнопка «Найти»/«Отправить»
function keyboard(state, onChange, onSubmit, submitLabel) {
    var wrap = el("div", "kb");
    var draw = function() {
        wrap.innerHTML = "";
        var rows = state.lang === "en" ? KB_EN : KB_RU;
        for (var r = 0; r < rows.length; r++) {
            var line = el("div", "kb-row");
            for (var i = 0; i < rows[r].length; i++) {
                (function(ch, r, i) {
                    line.appendChild(focusable(el("div", "key", escHtml(ch.toUpperCase())), "k" + r + "-" + i, function() {
                        if (state.text.length < 60) state.text += ch;
                        onChange();
                    }));
                })(rows[r].charAt(i), r, i);
            }
            wrap.appendChild(line);
        }
        var digits = el("div", "kb-row");
        for (var d = 1; d <= 10; d++) {
            (function(ch, d) {
                digits.appendChild(focusable(el("div", "key", ch), "d" + d, function() {
                    if (state.text.length < 60) state.text += ch;
                    onChange();
                }));
            })(String(d % 10), d);
        }
        digits.appendChild(focusable(el("div", "key w2", "⌫"), "back", function() {
            state.text = state.text.substring(0, state.text.length - 1);
            onChange();
        }));
        wrap.appendChild(digits);
        var ctl = el("div", "kb-row");
        ctl.appendChild(focusable(el("div", "key w4", "Пробел"), "space", function() {
            if (state.text && state.text.charAt(state.text.length - 1) !== " ") state.text += " ";
            onChange();
        }));
        ctl.appendChild(focusable(el("div", "key w3", "Стереть всё"), "clear", function() {
            state.text = "";
            onChange();
        }));
        ctl.appendChild(focusable(el("div", "key w2", state.lang === "en" ? "RU" : "EN"), "lang", function() {
            state.lang = state.lang === "en" ? "ru" : "en";
            var k = Focus.cur ? Focus.cur.getAttribute("data-k") : null;
            draw();
            Focus.set(Focus.byKey(k) || wrap.firstChild.firstChild);
        }));
        ctl.appendChild(focusable(el("div", "key w3 accent", escHtml(submitLabel)), "submit", onSubmit));
        wrap.appendChild(ctl);
    };
    draw();
    return wrap;
}

function inputView(text, placeholder) {
    return text ? escHtml(text) + '<span class="caret"></span>' : '<span class="caret"></span><span class="ph">' + escHtml(placeholder) + "</span>";
}

/* ---------- поиск ---------- */

var searchState = { text: "", lang: "ru", results: null, query: "" };

Screens.search = function(p, ctx) {
    var root = ctx.root;
    var input = el("div", "input");
    root.appendChild(input);
    var results = el("div");
    var timer = null, seq = 0;

    var showResults = function() {
        results.innerHTML = "";
        if (searchState.busy) loading(results, "Ищем…");
        else if (searchState.results) {
            if (searchState.results.length) {
                results.appendChild(el("div", "hint", "Найдено: " + searchState.results.length + " — листайте вниз"));
                grid(results, searchState.results, "found");
            } else results.appendChild(el("div", "message", "Ничего не найдено"));
        }
        Lazy.check();
    };
    var run = function() {
        var q = searchState.text.replace(/^\s+|\s+$/g, "");
        if (q.length < 2 || q === searchState.query) return;
        searchState.query = q;
        searchState.busy = true;
        var my = ++seq;
        showResults();
        api("Video.search", { query: q }, function(r) {
            if (my !== seq || !ctx.alive()) return;
            searchState.busy = false;
            searchState.results = parseMovies(r.movies);
            showResults();
        }, function() {
            if (my !== seq || !ctx.alive()) return;
            searchState.busy = false;
            searchState.results = [];
            showResults();
        });
    };
    var changed = function() {
        input.innerHTML = inputView(searchState.text, "Название фильма или сериала");
        clearTimeout(timer);
        if (!searchState.text) {
            searchState.results = null;
            searchState.query = "";
            showResults();
        }
        // ищем, когда перестали нажимать на полсекунды
        timer = setTimeout(run, 700);
    };
    root.appendChild(keyboard(searchState, changed, function() {
        clearTimeout(timer);
        run();
        var first = results.querySelector("[data-f]");
        if (first) Focus.set(first);
    }, "Найти"));
    root.appendChild(results);
    input.innerHTML = inputView(searchState.text, "Название фильма или сериала");
    showResults();

    // печать с обычной клавиатуры (на компьютере и телефоне)
    var typing = function(ev, code) {
        if (!ctx.alive()) {
            Keys.handlers.splice(Keys.handlers.indexOf(typing), 1);
            return false;
        }
        if (Modal.active || Menu.open || Player.active) return false;
        if (code === 8 && searchState.text) {
            searchState.text = searchState.text.substring(0, searchState.text.length - 1);
            changed();
            return true;
        }
        var ch = ev.key && ev.key.length === 1 ? ev.key : null;
        if (ch && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
            if (searchState.text.length < 60) searchState.text += ch;
            changed();
            return true;
        }
        return false;
    };
    Keys.handlers.push(typing);
    ctx.ready();
};

/* ---------- страница фильма ---------- */

function minutes(sec) {
    return sec > 0 ? Math.round(sec / 60) + " мин" : "";
}

Screens.movie = function(params, ctx) {
    var root = ctx.root;
    var spin = loading(root);
    loadMovie(params.id, function(d) {
        if (!ctx.alive()) return;
        root.removeChild(spin);
        Store.set("eps:" + d.id, d.episodeCount);
        Store.set("seen:" + d.id, d.episodeCount);
        delete newEpisodes[d.id];
        renderMovie(d, params, ctx);
    }, function(e) {
        if (!ctx.alive()) return;
        root.removeChild(spin);
        ctx.ready(errorBox(root, e, function() { Router.show(ctx.entry, false); }));
    });
};

function renderMovie(d, params, ctx) {
    var root = ctx.root;
    var i;
    Backdrop.set(d.poster);
    var last = Store.last(d.id);

    var gi = 0;
    for (i = 0; i < d.groups.length; i++) {
        if (params.group ? d.groups[i].key === params.group : (last && last.group === d.groups[i].key)) gi = i;
    }
    var group = d.groups[gi];
    var files = group ? group.files : [];
    var seasons = [];
    for (i = 0; i < files.length; i++) if (seasons.indexOf(files[i].season) < 0) seasons.push(files[i].season);
    var resumeIdx = -1;
    for (i = 0; i < files.length; i++) if (last && files[i].name === last.file) resumeIdx = i;
    var season = params.season !== undefined ? params.season : (resumeIdx >= 0 ? files[resumeIdx].season : (seasons[0] || 0));

    var head = el("div", "details");
    var poster = el("div", "poster");
    if (d.poster) poster.style.backgroundImage = "url('" + d.poster + "')";
    head.appendChild(poster);
    var info = el("div", "info");
    info.appendChild(el("h1", null, escHtml(d.name)));
    var sub = [d.original, d.year].concat(d.countries).filter(function(x) { return x; }).join(" · ");
    if (sub) info.appendChild(el("div", "sub", escHtml(sub)));
    var chips = el("div", "ratings");
    if (d.kp > 0) chips.appendChild(el("div", "chip", "<b>" + d.kp.toFixed(1) + "</b>КиноПоиск"));
    if (d.imdb > 0) chips.appendChild(el("div", "chip", "<b>" + d.imdb.toFixed(1) + "</b>IMDb"));
    if (group) chips.appendChild(el("div", "chip", escHtml(group.label)));
    if (chips.firstChild) info.appendChild(chips);
    if (d.genres.length) info.appendChild(el("div", "line", escHtml(d.genres.join(" · "))));
    if (d.directors.length) info.appendChild(el("div", "line", "Режиссёр: " + escHtml(d.directors.join(", "))));
    if (d.cast.length) info.appendChild(el("div", "line", "В ролях: " + escHtml(d.cast.join(", "))));
    var voices = [];
    for (i = 0; i < files.length; i++) if (files[i].translation && files[i].translation !== "Оригинал" && voices.indexOf(files[i].translation) < 0) voices.push(files[i].translation);
    if (voices.length) info.appendChild(el("div", "line", "Озвучка: " + escHtml(voices.join(", "))));
    if (d.description) info.appendChild(el("div", "desc", escHtml(d.description)));

    var actions = el("div", "actions");
    var playBtn = null;
    if (files.length) {
        var start = resumeIdx;
        if (start < 0) {
            start = 0;
            for (i = 0; i < files.length; i++) if (files[i].season === season) { start = i; break; }
        }
        var label = resumeIdx >= 0 ? (files[resumeIdx].episode > 0 ? "Продолжить: " + files[resumeIdx].title : "Продолжить") : "Смотреть";
        playBtn = pill(icon("play") + escHtml(label), "primary", "play", function() {
            Player.open(d, group, start);
        });
        actions.appendChild(playBtn);
    }
    var fav = Store.isFav(d.id);
    actions.appendChild(pill(icon(fav ? "star" : "starBorder") + (fav ? "В избранном" : "В избранное"), fav ? "sel" : "", "fav", function() {
        var added = Store.toggleFav(toMovie(d));
        toast(added ? "Добавлено в избранное" : "Убрано из избранного");
        ctx.entry.focusKey = "fav";
        Router.show(ctx.entry, true);
    }));
    if (d.groups.length > 1) {
        actions.appendChild(pill(icon("hd") + "Качество: " + escHtml(group.label), null, "quality", function() {
            var opts = [];
            for (var q = 0; q < d.groups.length; q++) opts.push([d.groups[q].key, d.groups[q].label + " (" + d.groups[q].files.length + ")"]);
            Modal.choose("Качество", opts, group.key, function(k) {
                ctx.entry.params.group = k;
                delete ctx.entry.params.season;
                ctx.entry.focusKey = "quality";
                Router.show(ctx.entry, true);
            });
        }));
    }
    actions.appendChild(pill(icon("report") + "Проблема", null, "report", function() {
        reportDialog(d, resumeIdx >= 0 ? files[resumeIdx] : (files.length === 1 ? files[0] : null), group);
    }));
    info.appendChild(actions);
    head.appendChild(info);
    root.appendChild(head);

    // сезоны
    if (seasons.length > 1) {
        var ss = el("div", "section");
        ss.appendChild(el("h2", null, "Сезоны"));
        var tabs = el("div", "tabs");
        for (i = 0; i < seasons.length; i++) {
            (function(s) {
                tabs.appendChild(pill("Сезон " + s, s === season ? "sel" : "", "season-" + s, function() {
                    ctx.entry.params.season = s;
                    ctx.entry.params.group = group.key;
                    ctx.entry.focusKey = "season-" + s;
                    Router.show(ctx.entry, true);
                }));
            })(seasons[i]);
        }
        ss.appendChild(tabs);
        root.appendChild(ss);
    }

    // серии
    var eps = [];
    for (i = 0; i < files.length; i++) if (files[i].season === season || seasons.length <= 1) eps.push(i);
    if (eps.length > 1) {
        var es = el("div", "section");
        es.appendChild(el("h2", null, files[eps[0]].episode > 0 ? "Серии" : "Файлы"));
        root.appendChild(es);
        var wrap = el("div", "episodes");
        for (i = 0; i < eps.length; i++) {
            (function(idx) {
                var f = files[idx];
                var p = Store.progress(f.name);
                var watched = p >= WATCHED;
                var e = el("div", "ep" + (idx === resumeIdx ? " last" : "") + (watched ? " watched" : ""));
                e.appendChild(el("div", "t", (watched ? "✓ " : "") + escHtml(f.episode > 0 ? "Серия " + epLabel(f) : f.name)));
                e.appendChild(el("div", "m", escHtml([minutes(f.duration), f.size > 0 ? (f.size / 1e9).toFixed(1) + " ГБ" : ""].filter(function(v) { return v; }).join(" · "))));
                if (p > 0.01) {
                    var bar = el("div", "progress");
                    var fill = el("i", watched ? "done" : "");
                    fill.style.width = Math.round(p * 100) + "%";
                    bar.appendChild(fill);
                    e.appendChild(bar);
                }
                wrap.appendChild(focusable(e, "ep-" + f.name, function() {
                    Player.open(d, group, idx);
                }));
            })(eps[i]);
        }
        root.appendChild(wrap);
    }

    if (!d.groups.length) root.appendChild(el("div", "message", "Файлы для просмотра недоступны"));
    if (d.similar.length) root.appendChild(row("Похожие", d.similar, "sim"));
    ctx.ready(playBtn);
}

/* ---------- сообщение о проблеме ---------- */

var PROBLEMS = ["Видео не запускается", "Нет звука или нет русской озвучки", "Тормозит, зависает или обрывается",
    "Плохое качество картинки", "Не та серия или не тот фильм", "Ошибка в описании или постере"];

function reportDialog(d, file, group) {
    var dlg = el("div", "dialog");
    dlg.appendChild(el("h3", null, "Сообщить о проблеме"));
    dlg.appendChild(el("div", "sub", escHtml([d.name, file && file.episode > 0 ? file.title : null, group ? group.label : null].filter(function(x) { return x; }).join(" · "))));
    var list = el("div", "list");
    var send = function(text) {
        Modal.hide();
        toast("Отправка…");
        sendReport(d, file, group ? group.label : "", text, function(ok, e) {
            toast(ok ? "Спасибо! Сообщение отправлено в ЛДС" : "Не удалось отправить: " + e);
        });
    };
    for (var i = 0; i < PROBLEMS.length; i++) {
        (function(t) {
            list.appendChild(focusable(el("div", "opt", escHtml(t)), null, function() { send(t); }));
        })(PROBLEMS[i]);
    }
    list.appendChild(focusable(el("div", "opt", "Другое — написать самому"), null, function() {
        var st = { text: "", lang: "ru" };
        var box = el("div", "dialog");
        box.appendChild(el("h3", null, "Опишите проблему"));
        var inp = el("div", "input", inputView("", "Что случилось?"));
        box.appendChild(inp);
        box.appendChild(keyboard(st, function() {
            inp.innerHTML = inputView(st.text, "Что случилось?");
        }, function() {
            if (!st.text.replace(/\s/g, "")) {
                toast("Опишите проблему");
                return;
            }
            send("Другое: " + st.text);
        }, "Отправить"));
        Modal.show(box);
    }));
    dlg.appendChild(list);
    dlg.appendChild(el("p", null, "Совет: если видео не запускается или нет звука — попробуйте другое качество."));
    Modal.show(dlg);
}
