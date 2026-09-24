/******************************************************************************/
// Кинотеатр ЛДС — плагин для Media Station X
// Данные берутся напрямую с cinema.ntop.tv (API открыт для любых сайтов),
// видео играет встроенный плеер MSX. Код намеренно на ES5: старые браузеры
// телевизоров Samsung/LG не понимают современный JavaScript.
/******************************************************************************/

var API = "https://cinema.ntop.tv/api.php?format=ajax&JsHttpRequest=1-xml";
var SITE = "https://cinema.ntop.tv";
var ORANGE = "#F04E23";
var BLUE = "#1880D0";
var GREEN = "#3FB950";
var WATCHED = 0.9;

// адрес этого плагина (для ссылок вида request:interaction:...@PLUGIN)
var PLUGIN = window.location.href.split("?")[0].split("#")[0];
var BASE = PLUGIN.substring(0, PLUGIN.lastIndexOf("/") + 1);

function req(id) {
    return "request:interaction:" + id + "@" + PLUGIN;
}

/******************************************************************************/
// Запросы к сайту кинотеатра
/******************************************************************************/

// сайт понимает только кодировку как у JS escape(): кириллица → %uXXXX
function esc(v) {
    return escape(String(v)).replace(/\+/g, "%2B");
}

function api(action, params, done, fail) {
    var body = "action[0]=" + esc(action);
    for (var k in params) {
        if (params.hasOwnProperty(k) && params[k] !== null && params[k] !== undefined && params[k] !== "") {
            body += "&" + k + "[0]=" + esc(params[k]);
        }
    }
    var x = new XMLHttpRequest();
    x.open("POST", API, true);
    x.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    x.timeout = 30000;
    x.onreadystatechange = function() {
        if (x.readyState !== 4) return;
        var r = null;
        try {
            r = JSON.parse(x.responseText).js[0];
        } catch (e) {
            fail && fail("Сервер не ответил (" + x.status + ")");
            return;
        }
        if (String(r.status) !== "200") {
            fail && fail(r.message || "Ошибка сервера");
        } else {
            done(r.response || {});
        }
    };
    x.ontimeout = function() {
        fail && fail("Сервер долго не отвечает");
    };
    x.send(body);
}

function abs(p) {
    if (!p) return null;
    if (p.indexOf("http") === 0) return p;
    return SITE + (p.charAt(0) === "/" ? p : "/" + p);
}

function str(v) {
    return v === null || v === undefined || v === "null" ? "" : String(v);
}

function num(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}

// «Сериал (сезон 8, серия 56)» → «Сериал»
function cleanName(n) {
    var c = str(n).replace(/\s*\((сезон|серия|серии)[^)]*\)\s*$/i, "");
    return c || str(n);
}

function parseMovies(arr) {
    var out = [];
    var seen = {};
    if (!arr) return out;
    for (var i = 0; i < arr.length; i++) {
        var o = arr[i];
        if (!o || !o.movie_id || seen[o.movie_id]) continue;
        seen[o.movie_id] = true;
        var kp = num(o.rating_kinopoisk_value);
        var imdb = num(o.rating_imdb_value);
        out.push({
            id: String(o.movie_id),
            name: str(o.name),
            year: str(o.year),
            cover: abs(o.cover_original || o.cover),
            rating: kp > 0 ? "КП " + kp.toFixed(1) : (imdb > 0 ? "IMDb " + imdb.toFixed(1) : "")
        });
    }
    return out;
}

function flatten(cats) {
    var all = [];
    if (!cats) return all;
    for (var i = 0; i < cats.length; i++) all = all.concat(cats[i].movies || []);
    return parseMovies(all);
}

var SEASON_RE = /[_.]season(\d+)\.CD(\d+)(?:-(\d+))?\./i;
var CD_RE = /[_.]CD(\d+)(?:-(\d+))?\./i;
var PLAYABLE = { mp4: 1, mkv: 1, webm: 1, avi: 1, m4v: 1, mov: 1, ts: 1, flv: 1 };

// ссылки для скачивания → ссылки для просмотра (как делает сам сайт)
function streamUrl(u) {
    return u.replace(/^https?:\/\/(web|download|fastonline)\.cinema\.ntop\.tv\//, "https://online.cinema.ntop.tv/");
}

function fileTitle(f) {
    var ep = f.episode2 > 0 ? f.episode + "–" + f.episode2 : String(f.episode);
    if (f.season > 0 && f.episode > 0) return "Сезон " + f.season + ", серия " + ep;
    if (f.episode > 0) return "Серия " + ep;
    return f.name;
}

function parseDetails(m) {
    var files = [];
    var fa = m.files || [];
    for (var i = 0; i < fa.length; i++) {
        var f = fa[i];
        if (!f || f.is_dir === true || !f.links || !f.links.download) continue;
        var raw = f.links.download;
        var ext = raw.substring(raw.lastIndexOf(".") + 1).toLowerCase();
        if (!PLAYABLE[ext]) continue;
        var url = streamUrl(raw);
        var group = (url.split("://")[1] || "").split("/")[1] || "";
        var name = str(f.name) || url.substring(url.lastIndexOf("/") + 1);
        var season = 0, episode = 0, episode2 = 0;
        var sm = SEASON_RE.exec(name);
        if (sm) {
            season = Math.max(1, parseInt(sm[1], 10) || 1);
            episode = Math.max(1, parseInt(sm[2], 10) || 1);
            episode2 = parseInt(sm[3], 10) || 0;
        } else {
            var cm = CD_RE.exec(name);
            if (cm) {
                episode = Math.max(1, parseInt(cm[1], 10) || 1);
                episode2 = parseInt(cm[2], 10) || 0;
            }
        }
        var meta = f.metainfo || {};
        var tr = f.translation && f.translation.length ? str(f.translation[0]) : "";
        var file = {
            name: name, url: url, group: group.toLowerCase(), resolution: str(f.resolution_name),
            season: season, episode: episode, episode2: episode2,
            duration: parseInt(meta.playtime_seconds, 10) || 0,
            size: num(f.size), translation: tr,
            audio: meta.audio ? meta.audio.length : 0,
            subtitles: String(f.subtitles) === "1"
        };
        file.title = fileTitle(file);
        files.push(file);
    }
    var order = { hd: 0, sd: 1, "4k": 2 };
    var byGroup = {};
    var keys = [];
    for (var j = 0; j < files.length; j++) {
        var g = files[j].group;
        if (!byGroup[g]) {
            byGroup[g] = [];
            keys.push(g);
        }
        byGroup[g].push(files[j]);
    }
    keys.sort(function(a, b) {
        return (order[a] !== undefined ? order[a] : 9) - (order[b] !== undefined ? order[b] : 9);
    });
    var groups = [];
    for (var k = 0; k < keys.length; k++) {
        var list = byGroup[keys[k]];
        list.sort(function(a, b) {
            return a.season - b.season || a.episode - b.episode || (a.name < b.name ? -1 : 1);
        });
        var label = keys[k] === "4k" ? "4K" : keys[k] === "sd" ? "SD" : keys[k] === "hd" ? "HD " + (list[0].resolution || "") : keys[k].toUpperCase();
        groups.push({ key: keys[k], label: label.replace(/\s+$/, ""), files: list });
    }
    var cover = m.covers && m.covers.length ? m.covers[0] : null;
    var cast = [];
    var ps = m.persones || [];
    for (var p = 0; p < ps.length && cast.length < 8; p++) if (ps[p] && ps[p].name) cast.push(ps[p].name);
    var maxEp = 0;
    for (var q = 0; q < groups.length; q++) maxEp = Math.max(maxEp, groups[q].files.length);
    return {
        id: String(m.movie_id),
        name: cleanName(m.name),
        original: str(m.international_name),
        year: str(m.year),
        description: str(m.description).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
        genres: m.genres || [],
        countries: m.countries || [],
        directors: m.directors || [],
        cast: cast,
        kp: num(m.rating_kinopoisk_value),
        imdb: num(m.rating_imdb_value),
        poster: abs(cover ? (cover.original || cover.thumbnail) : null),
        groups: groups,
        episodeCount: maxEp,
        similar: parseMovies(m.other_movies)
    };
}

var detailsCache = {};

function loadMovie(id, done, fail) {
    if (detailsCache[id]) {
        done(detailsCache[id]);
        return;
    }
    api("Video.getMovie", { movie_id: id }, function(r) {
        if (!r.movie) {
            fail("Фильм не найден");
            return;
        }
        var d = parseDetails(r.movie);
        detailsCache[id] = d;
        done(d);
    }, fail);
}

/******************************************************************************/
// Хранилище на телевизоре (localStorage)
/******************************************************************************/

var Store = {
    get: function(k, def) {
        try {
            var v = window.localStorage.getItem("ldskino:" + k);
            return v === null ? def : JSON.parse(v);
        } catch (e) {
            return def;
        }
    },
    set: function(k, v) {
        try {
            window.localStorage.setItem("ldskino:" + k, JSON.stringify(v));
        } catch (e) {}
    },
    favorites: function() {
        return Store.get("fav", []);
    },
    isFav: function(id) {
        var f = Store.favorites();
        for (var i = 0; i < f.length; i++) if (f[i].id === id) return true;
        return false;
    },
    toggleFav: function(m) {
        var f = Store.favorites();
        var out = [];
        var had = false;
        for (var i = 0; i < f.length; i++) {
            if (f[i].id === m.id) had = true;
            else out.push(f[i]);
        }
        if (!had) {
            out.unshift({ id: m.id, name: m.name, year: m.year, cover: m.cover });
            if (detailsCache[m.id]) Store.set("seen:" + m.id, detailsCache[m.id].episodeCount);
        }
        Store.set("fav", out);
        return !had;
    },
    history: function() {
        return Store.get("hist", []);
    },
    addHistory: function(m, group, file, title) {
        var h = Store.history();
        var out = [{ id: m.id, name: m.name, year: m.year, cover: m.cover, group: group, file: file, title: title }];
        for (var i = 0; i < h.length && out.length < 40; i++) if (h[i].id !== m.id) out.push(h[i]);
        Store.set("hist", out);
    },
    last: function(id) {
        var h = Store.history();
        for (var i = 0; i < h.length; i++) if (h[i].id === id) return h[i];
        return null;
    },
    // прогресс файла: доля 0..1 (ключ — имя файла, чтобы HD и SD считались одной серией)
    progress: function(file) {
        return Store.get("p:" + file, -1);
    },
    setProgress: function(id, file, frac) {
        if (frac > Store.progress(file)) Store.set("p:" + file, frac);
        if (frac >= WATCHED) {
            var w = Store.get("w:" + id, []);
            if (w.indexOf(file) < 0) {
                w.push(file);
                Store.set("w:" + id, w);
            }
        }
    },
    watched: function(id) {
        return Store.get("w:" + id, []).length;
    }
};

var newEpisodes = {}; // id → сколько новых серий
var checkedFav = {};

// проверка новых серий у избранных сериалов (по одному запросу на сериал за сессию)
function checkNewEpisodes(done) {
    var favs = Store.favorites();
    var pending = 0;
    var finished = false;
    var finish = function() {
        if (!finished && pending === 0) {
            finished = true;
            done && done();
        }
    };
    for (var i = 0; i < favs.length; i++) {
        (function(id) {
            if (checkedFav[id]) return;
            checkedFav[id] = true;
            pending++;
            delete detailsCache[id];
            loadMovie(id, function(d) {
                var seen = Store.get("seen:" + id, -1);
                Store.set("eps:" + id, d.episodeCount);
                if (seen < 0) Store.set("seen:" + id, d.episodeCount);
                else if (d.episodeCount > seen) newEpisodes[id] = d.episodeCount - seen;
                pending--;
                finish();
            }, function() {
                checkedFav[id] = false;
                pending--;
                finish();
            });
        })(favs[i].id);
    }
    finish();
    // не ждём вечно — главная откроется максимум через 6 секунд
    setTimeout(function() {
        if (!finished) {
            finished = true;
            done && done();
        }
    }, 6000);
}

/******************************************************************************/
// Построение экранов MSX
/******************************************************************************/

function posterItem(m, layout) {
    var item = {
        type: "separate",
        layout: layout,
        color: "msx-glass",
        image: m.cover,
        imageFiller: "cover",
        title: m.name,
        titleFooter: m.year,
        action: "content:" + req("movie~" + m.id)
    };
    if (m.rating) {
        item.tag = m.rating;
        item.tagColor = BLUE;
    }
    if (newEpisodes[m.id] > 0) {
        item.badge = newEpisodes[m.id] === 1 ? "Новая серия" : "+" + newEpisodes[m.id] + " серий";
        item.badgeColor = ORANGE;
    }
    var total = Store.get("eps:" + m.id, 0);
    var last = Store.last(m.id);
    if (total > 1) {
        var w = Math.min(Store.watched(m.id), total);
        if (w > 0) {
            item.progress = w / total;
            item.progressColor = w >= total ? GREEN : ORANGE;
            item.stamp = w >= total ? "✓ Просмотрено" : w + " из " + total;
            item.stampColor = w >= total ? GREEN : "msx-black-soft";
        }
    } else if (last) {
        var p = Store.progress(last.file);
        if (p > 0.01) {
            item.progress = p;
            item.progressColor = p >= WATCHED ? GREEN : ORANGE;
            if (p >= WATCHED) {
                item.stamp = "✓ Просмотрено";
                item.stampColor = GREEN;
            }
        }
    }
    return item;
}

// шапка как в ТВ-приложении: логотип и кнопки разделов (занимает верхний ряд сетки 12×6)
var NAV = [["home", "home", "Главная"], ["search", "search", "Поиск"], ["fav", "star", "Избранное"], ["cat~0~~~~~0", "tune", "Каталог"], ["history", "history", "История"]];

function navItems(active) {
    var items = [{
        type: "space", layout: "0,0,2,1", image: BASE + "img/logo.png", imageFiller: "fit", round: 0
    }];
    for (var i = 0; i < NAV.length; i++) {
        items.push({
            type: "button", enumerate: false, layout: (2 + i * 2) + ",0,2,1",
            label: "{ico:" + NAV[i][1] + "} " + NAV[i][2],
            color: NAV[i][0] === active ? BLUE : null,
            action: NAV[i][0] === active ? "reload:content" : "content:" + req(NAV[i][0])
        });
    }
    return items;
}

function allTile(layout, action) {
    return { type: "separate", enumerate: false, layout: layout, color: "msx-glass", icon: "arrow-forward", iconSize: "large", title: "Все", action: action };
}

// ряд постеров: 6 штук (или 5 + «Все»), высота 4 клетки — пропорции настоящего постера
function posterPages(movies, headline, moreAction, withNav) {
    var pages = [];
    var page = null;
    var y = withNav ? 1 : 0;
    var perPage = 6;
    var list = moreAction && movies.length >= perPage ? movies.slice(0, perPage - 1) : movies;
    for (var i = 0; i < list.length; i++) {
        var slot = i % perPage;
        if (slot === 0) {
            page = { headline: pages.length === 0 ? headline : null, items: pages.length === 0 && withNav ? navItems(withNav) : [] };
            pages.push(page);
        }
        page.items.push(posterItem(list[i], slot * 2 + "," + (pages.length === 1 ? y : 0) + ",2,4"));
    }
    if (moreAction && page) {
        var n = list.length % perPage;
        if (n === 0) {
            page = { items: [] };
            pages.push(page);
        }
        page.items.push(allTile(n * 2 + "," + (pages.length === 1 ? y : 0) + ",2,4", moreAction));
    }
    return pages;
}

function content(headline, pages, extra) {
    var c = {
        type: "list",
        headline: headline,
        background: BASE + "img/background.jpg",
        transparent: 1,
        cache: false,
        pages: pages
    };
    for (var k in extra) if (extra.hasOwnProperty(k)) c[k] = extra[k];
    return c;
}

function errorContent(text, retryId) {
    return content("Ошибка", [{
        items: [{
            type: "space", layout: "0,0,12,2", color: "msx-glass",
            headline: "Не удалось загрузить данные",
            text: text + "{br}{br}Кинотеатр работает только при подключении к интернету ЛДС."
        }, {
            type: "button", layout: "0,2,3,1", icon: "refresh", label: "Повторить",
            action: retryId ? "replace:content:err:" + req(retryId) : "reload:content"
        }]
    }], { flag: "err" });
}

/* ---------- меню ---------- */

var MENU_CATS = [
    { icon: "movie", label: "Фильмы", id: "cat~0~!34~~~~0" },
    { icon: "live-tv", label: "Сериалы", id: "cat~0~34~~~~0" },
    { icon: "child-care", label: "Мультфильмы", id: "cat~0~13~~~~0" },
    { icon: "auto-awesome", label: "Аниме", id: "cat~0~25~~~~0" },
    { icon: "public", label: "Документальные", id: "cat~0~23~~~~0" },
    { icon: "tune", label: "Каталог с фильтрами", id: "cat~0~~~~~0" }
];

function menu() {
    var items = [
        { icon: "home", label: "Главная", data: req("home") },
        { icon: "search", label: "Поиск", data: req("search") },
        { icon: "star", label: "Избранное", data: req("fav") },
        { icon: "history", label: "История", data: req("history") },
        { type: "separator", label: "Разделы" }
    ];
    for (var i = 0; i < MENU_CATS.length; i++) {
        items.push({ icon: MENU_CATS[i].icon, label: MENU_CATS[i].label, data: req(MENU_CATS[i].id) });
    }
    return {
        name: "Кинотеатр ЛДС",
        version: "1.0.0",
        logo: BASE + "img/logo.png",
        logoSize: "small",
        headline: "Кинотеатр ЛДС",
        background: BASE + "img/background.jpg",
        style: "overlay",
        transparent: 1,
        extension: "{ico:menu-open} меню — кнопка ◀",
        // скруглённые углы постеров, как в ТВ-приложении
        ready: { action: "settings:rounded_style:1" },
        menu: items
    };
}

/* ---------- главная ---------- */

var HOME_ROWS = [
    { title: "Последние добавления", params: { order: 0 }, id: "cat~0~~~~~0" },
    { title: "ТОП недели", best: true },
    { title: "Фильмы", params: { order: 0, genre: "!34" }, id: "cat~0~!34~~~~0" },
    { title: "Сериалы", params: { order: 0, genre: "34" }, id: "cat~0~34~~~~0" },
    { title: "Популярное сейчас", params: { order: 8 }, id: "cat~8~~~~~0" },
    { title: "Лучшее по КиноПоиску", params: { order: 9 }, id: "cat~9~~~~~0" }
];

function home(callback) {
    var results = [];
    var left = HOME_ROWS.length + 1;
    var failed = null;
    var finish = function() {
        if (--left > 0) return;
        var pages = [];
        var add = function(list, title, more) {
            pages = pages.concat(posterPages(list, title, more, pages.length === 0 ? "home" : null));
        };
        var hist = Store.history();
        if (hist.length) add(hist, "Продолжить просмотр", hist.length > 6 ? "content:" + req("history") : null);
        var favs = Store.favorites();
        var withNew = [];
        for (var f = 0; f < favs.length; f++) if (newEpisodes[favs[f].id] > 0) withNew.push(favs[f]);
        if (withNew.length) add(withNew.slice(0, 6), "Новые серии в избранном");
        for (var i = 0; i < HOME_ROWS.length; i++) {
            if (results[i] && results[i].length) {
                var row = HOME_ROWS[i];
                add(results[i], row.title, row.id ? "content:" + req(row.id) : null);
            }
        }
        if (!pages.length) callback(errorContent(failed || "Пустой ответ", "home"));
        else callback(content("Кинотеатр ЛДС", pages, { flag: "err" }));
    };
    checkNewEpisodes(finish);
    for (var i = 0; i < HOME_ROWS.length; i++) {
        (function(i) {
            var row = HOME_ROWS[i];
            var ok = function(list) {
                results[i] = list;
                finish();
            };
            var bad = function(e) {
                failed = e;
                finish();
            };
            if (row.best) {
                api("Video.getBestsellers", {}, function(r) { ok(flatten(r.bestsellers)); }, bad);
            } else {
                var p = { offset: 0, size: 11 };
                for (var k in row.params) p[k] = row.params[k];
                api("Video.getCatalog", p, function(r) { ok(parseMovies(r.movies)); }, bad);
            }
        })(i);
    }
}

/* ---------- каталог с фильтрами ---------- */

var SORTS = [["0", "Новые"], ["1", "По году"], ["8", "Популярное"], ["6", "Хиты"], ["9", "КиноПоиск"], ["2", "IMDb"]];
var GENRES = [["", "Все"], ["!34", "Фильмы"], ["34", "Сериалы"], ["4", "Комедии"], ["6", "Боевики"], ["2", "Драмы"],
    ["5", "Фантастика"], ["10", "Фэнтези"], ["7", "Ужасы"], ["3", "Триллеры"], ["33", "Детективы"], ["1", "Криминал"],
    ["12", "Приключения"], ["17", "Мелодрамы"], ["13", "Мультфильмы"], ["25", "Аниме"], ["15", "Семейные"],
    ["18", "Военные"], ["19", "Исторические"], ["20", "Биография"], ["23", "Документальные"]];
var YEARS = (function() {
    var now = new Date().getFullYear();
    var y = [["", "Любой"]];
    for (var i = 0; i < 4; i++) y.push([String(now - i), String(now - i)]);
    return y.concat([["2020-e", "2020-е"], ["2010-e", "2010-е"], ["2000-e", "2000-е"], ["1990-e", "1990-е"], ["1980-e", "1980-е"], ["1970-e", "1970-е"], ["1900-1969", "до 1970"]]);
})();
var COUNTRIES = [["", "Любая"], ["7", "Россия"], ["4", "СССР"], ["3", "США"], ["2", "Великобритания"], ["1", "Франция"],
    ["16", "Германия"], ["14", "Италия"], ["15", "Испания"], ["18", "Канада"], ["8", "Австралия"], ["17", "Япония"],
    ["330", "Южная Корея"], ["11", "Китай"], ["106", "Индия"], ["39", "Турция"], ["32", "Украина"], ["61", "Беларусь"]];
var QUALITIES = [["", "Любое"], ["4", "4K"], ["3", "1080p"], ["2", "720p"], ["1", "SD"]];
var FILTERS = [
    { key: "order", title: "Сортировка", icon: "sort", list: SORTS },
    { key: "genre", title: "Жанр", icon: "theater-comedy", list: GENRES },
    { key: "year", title: "Год", icon: "event", list: YEARS },
    { key: "country", title: "Страна", icon: "public", list: COUNTRIES },
    { key: "quality", title: "Качество", icon: "hd", list: QUALITIES }
];
var PAGE_SIZE = 60; // 10 рядов по 6 постеров

function parseCat(id) {
    var t = id.split("~");
    return { order: t[1] || "0", genre: t[2] || "", year: t[3] || "", country: t[4] || "", quality: t[5] || "", offset: parseInt(t[6], 10) || 0 };
}

function catId(s) {
    return "cat~" + s.order + "~" + s.genre + "~" + s.year + "~" + s.country + "~" + s.quality + "~" + s.offset;
}

function labelOf(list, v) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1];
    return v;
}

function catalog(id, callback) {
    var s = parseCat(id);
    api("Video.getCatalog", {
        offset: s.offset, size: PAGE_SIZE, order: s.order, genre: s.genre, year: s.year, country: s.country, quality: s.quality
    }, function(r) {
        var total = parseInt(r.total, 10) || 0;
        var movies = parseMovies(r.movies);
        // кнопки фильтров — открывают панель выбора
        var header = { items: navItems(id === "cat~0~~~~~0" ? "cat~0~~~~~0" : null) };
        for (var i = 0; i < FILTERS.length; i++) {
            var f = FILTERS[i];
            var val = labelOf(f.list, s[f.key]);
            header.items.push({
                type: "button", layout: (i * 2) + ",1,2,1",
                label: "{ico:" + f.icon + "} " + val,
                action: "panel:" + req("pick~" + f.key + "~" + catId(s))
            });
        }
        header.items.push({
            type: "button", layout: "10,1,2,1", label: "{ico:filter-alt-off} Сброс",
            action: "replace:content:catalog:" + req("cat~0~~~~~0")
        });
        var items = [];
        // переход между страницами — в «подвале» под списком, чтобы счётчик MSX считал только фильмы
        var footer = { items: [] };
        if (s.offset > 0) {
            footer.items.push({ type: "button", layout: "0,0,4,1", label: "{ico:arrow-back} Предыдущие " + PAGE_SIZE, action: "back" });
        }
        for (var j = 0; j < movies.length; j++) {
            var pi = posterItem(movies[j]);
            // на новой странице фокус сразу на первом фильме, а не в конце списка
            if (j === 0) {
                pi.focus = true;
                pi.id = "first";
            }
            items.push(pi);
        }
        if (s.offset + PAGE_SIZE < total) {
            var next = JSON.parse(JSON.stringify(s));
            next.offset = s.offset + PAGE_SIZE;
            footer.items.push({ type: "button", layout: "8,0,4,1", label: "Следующие " + PAGE_SIZE + " {ico:arrow-forward}", action: "content:" + req(catId(next)) });
        }
        if (!movies.length) {
            items.push({ type: "space", color: "msx-glass", label: "Ничего не найдено — уберите часть фильтров" });
        }
        var from = total ? s.offset + 1 : 0;
        callback({
            type: "list",
            flag: "catalog",
            cache: false,
            headline: s.genre ? labelOf(GENRES, s.genre) : "Каталог",
            extension: total ? "Показаны " + from + "–" + Math.min(s.offset + PAGE_SIZE, total) + " из " + total : "Ничего не найдено",
            background: BASE + "img/background.jpg",
            transparent: 1,
            header: header,
            footer: footer.items.length ? footer : null,
            // MSX переносит позицию фокуса со старой страницы — явно ставим его на первый фильм
            // по умолчанию MSX ставит фокус на кнопку шапки — переводим на первый фильм
            ready: movies.length ? { action: "focus:first" } : null,
            template: { type: "separate", layout: "0,0,2,4", color: "msx-glass", imageFiller: "cover" },
            items: items
        });
    }, function(e) {
        callback(errorContent(e, id));
    });
}

function picker(id, callback) {
    // pick~field~cat~... — список вариантов одного фильтра
    var t = id.split("~");
    var key = t[1];
    var s = parseCat(t.slice(2).join("~"));
    var f = null;
    for (var i = 0; i < FILTERS.length; i++) if (FILTERS[i].key === key) f = FILTERS[i];
    var items = [];
    for (var j = 0; j < f.list.length; j++) {
        var ns = JSON.parse(JSON.stringify(s));
        ns[key] = f.list[j][0];
        ns.offset = 0;
        items.push({
            type: "control",
            label: f.list[j][1],
            icon: f.list[j][0] === s[key] ? "radio-button-checked" : "radio-button-unchecked",
            focus: f.list[j][0] === s[key],
            action: "[back|replace:content:catalog:" + req(catId(ns)) + "]"
        });
    }
    callback({
        headline: f.title,
        type: "list",
        template: { type: "control", layout: "0,0,8,1" },
        items: items
    });
}

/* ---------- избранное и история ---------- */

function listScreen(active, headline, movies, emptyText) {
    if (!movies.length) {
        var items0 = navItems(active);
        items0.push({ type: "space", layout: "0,1,12,2", color: "msx-glass", headline: headline, text: emptyText });
        return content(headline, [{ items: items0 }]);
    }
    var items = [];
    for (var i = 0; i < movies.length; i++) items.push(posterItem(movies[i]));
    return {
        type: "list", cache: false, headline: headline,
        background: BASE + "img/background.jpg",
        transparent: 1,
        header: { items: navItems(active) },
        template: { type: "separate", layout: "0,0,2,4", color: "msx-glass", imageFiller: "cover" },
        items: items
    };
}

/* ---------- страница фильма ---------- */

function minutes(sec) {
    return sec > 0 ? Math.round(sec / 60) + " мин" : "";
}

function movieScreen(id, callback) {
    // movie~ID или movie~ID~группа~сезон
    var t = id.split("~");
    var movieId = t[1];
    loadMovie(movieId, function(d) {
        Store.set("eps:" + movieId, d.episodeCount);
        Store.set("seen:" + movieId, d.episodeCount);
        delete newEpisodes[movieId];
        var m = { id: d.id, name: d.name, year: d.year, cover: d.poster };
        var last = Store.last(movieId);
        var gi = 0;
        var i, j;
        for (i = 0; i < d.groups.length; i++) {
            if (t[2] ? d.groups[i].key === t[2] : (last && last.group === d.groups[i].key)) gi = i;
        }
        var group = d.groups[gi];
        var files = group ? group.files : [];
        var seasons = [];
        for (i = 0; i < files.length; i++) if (seasons.indexOf(files[i].season) < 0) seasons.push(files[i].season);
        var resumeIdx = -1;
        for (i = 0; i < files.length; i++) if (last && files[i].name === last.file) resumeIdx = i;
        var season = t[3] !== undefined && t[3] !== "" ? parseInt(t[3], 10) : (resumeIdx >= 0 ? files[resumeIdx].season : (seasons[0] || 0));

        var meta = [d.original, d.year].filter(function(x) { return x; }).join(" · ");
        var meta2 = d.genres.concat(d.countries).join(" · ");
        var rating = [];
        if (d.kp > 0) rating.push("КиноПоиск " + d.kp.toFixed(1));
        if (d.imdb > 0) rating.push("IMDb " + d.imdb.toFixed(1));
        var voices = [];
        for (i = 0; i < files.length; i++) if (files[i].translation && files[i].translation !== "Оригинал" && voices.indexOf(files[i].translation) < 0) voices.push(files[i].translation);
        var lines = [];
        if (meta) lines.push("{col:msx-white-soft}" + meta);
        if (meta2) lines.push("{col:msx-white-soft}" + meta2);
        if (rating.length) lines.push("{col:" + BLUE + "}" + rating.join("   "));
        if (d.directors.length) lines.push("{col:msx-white-soft}Режиссёр: " + d.directors.join(", "));
        if (d.cast.length) lines.push("{col:msx-white-soft}В ролях: " + d.cast.join(", "));
        if (voices.length) lines.push("{col:msx-white-soft}Озвучка: " + voices.join(", "));
        var desc = d.description.length > 300 ? d.description.substring(0, 280).replace(/\s+\S*$/, "") + "…" : d.description;
        var text = lines.join("{br}") + "{br}{br}{col:msx-white}" + desc;

        var head = navItems(null).concat([{
            type: "space", layout: "0,1,3,5", color: "msx-glass", image: d.poster, imageFiller: "cover"
        }, {
            type: "space", layout: "3,1,9,4", text: text
        }]);
        var bi = 0;
        var button = function(icon, label, action, color) {
            var b = { type: "button", layout: (3 + bi * 3) + ",5,3,1", label: label, action: action };
            if (color) b.color = color;
            bi++;
            head.push(b);
        };
        if (files.length) {
            var start = resumeIdx >= 0 ? resumeIdx : 0;
            if (resumeIdx < 0) {
                for (i = 0; i < files.length; i++) if (files[i].season === season) { start = i; break; }
            }
            var label = resumeIdx >= 0 ? (files[resumeIdx].episode > 0 ? "Продолжить: " + files[resumeIdx].title.replace("Сезон ", "С").replace(", серия ", " · ") : "Продолжить") : "Смотреть";
            button("play-arrow", label, "playlist:" + req("pl~" + movieId + "~" + group.key + "~" + start), ORANGE);
            head[head.length - 1].focus = true;
        }
        button(Store.isFav(movieId) ? "star" : "star-border", Store.isFav(movieId) ? "В избранном" : "В избранное",
            "interaction:commit:message:fav~" + movieId);
        button("report-problem", "Проблема", "panel:" + req("rep~" + movieId + "~" + (group ? group.key : "") + "~" + (resumeIdx >= 0 ? resumeIdx : "")));

        var pages = [{ items: head }];

        // выбор качества и сезона
        var sel = [];
        var selRows = 0;
        if (d.groups.length > 1) {
            for (i = 0; i < d.groups.length; i++) {
                sel.push({
                    type: "button", layout: (i * 3) + ",0,3,1",
                    label: (i === gi ? "✓ " : "") + "Качество " + d.groups[i].label,
                    action: "replace:content:movie:" + req("movie~" + movieId + "~" + d.groups[i].key)
                });
            }
            selRows = 1;
        }
        if (seasons.length > 1) {
            for (i = 0; i < seasons.length; i++) {
                sel.push({
                    type: "button", layout: ((i % 6) * 2) + "," + (selRows + Math.floor(i / 6)) + ",2,1",
                    label: (seasons[i] === season ? "✓ " : "") + "Сезон " + seasons[i],
                    action: "replace:content:movie:" + req("movie~" + movieId + "~" + group.key + "~" + seasons[i])
                });
            }
            selRows += Math.ceil(seasons.length / 6);
        }

        // серии текущего сезона: 4 в ряд
        var eps = [];
        for (i = 0; i < files.length; i++) if (files[i].season === season || seasons.length <= 1) eps.push(i);
        if (eps.length > 1 || sel.length) {
            var epPage = null;
            var row = selRows;
            if (sel.length) {
                epPage = { headline: eps.length > 1 ? (files[eps[0]].episode > 0 ? "Серии" : "Файлы") : "Качество", items: sel };
                pages.push(epPage);
            }
            for (j = 0; j < eps.length && eps.length > 1; j++) {
                if (!epPage || row >= 6) {
                    epPage = { headline: pages.length === 1 ? "Серии" : null, items: [] };
                    pages.push(epPage);
                    row = 0;
                }
                var f = files[eps[j]];
                var col = j % 4;
                var p = Store.progress(f.name);
                var watched = p >= WATCHED;
                var it = {
                    type: "default", layout: (col * 3) + "," + row + ",3,1", color: "msx-glass",
                    title: (watched ? "{col:" + GREEN + "}✓ " : "") + (f.episode > 0 ? (f.episode2 > 0 ? "Серия " + f.episode + "–" + f.episode2 : "Серия " + f.episode) : f.name),
                    titleFooter: [minutes(f.duration), f.size > 0 ? (f.size / 1e9).toFixed(1) + " ГБ" : ""].filter(function(v) { return v; }).join(" · "),
                    action: "playlist:" + req("pl~" + movieId + "~" + group.key + "~" + eps[j])
                };
                if (p > 0.01) {
                    it.progress = p;
                    it.progressColor = watched ? GREEN : ORANGE;
                }
                if (eps[j] === resumeIdx) it.focus = true;
                epPage.items.push(it);
                if (col === 3) row++;
            }
        }

        if (d.similar.length) pages = pages.concat(posterPages(d.similar.slice(0, 6), "Похожие"));

        callback({
            type: "list", flag: "movie", cache: false,
            headline: d.name,
            background: BASE + "img/background.jpg",
            transparent: 1,
            pages: pages
        });
    }, function(e) {
        callback(errorContent(e, id));
    });
}

/* ---------- плейлист серий ---------- */

// pl~ID~группа~индекс: серии с выбранной до конца — плеер MSX сам переключает на следующую
function playlist(id, callback) {
    var t = id.split("~");
    var movieId = t[1];
    loadMovie(movieId, function(d) {
        var g = null;
        for (var i = 0; i < d.groups.length; i++) if (d.groups[i].key === t[2]) g = d.groups[i];
        if (!g) g = d.groups[0];
        var start = parseInt(t[3], 10) || 0;
        var items = [];
        for (var j = start; j < g.files.length; j++) {
            var f = g.files[j];
            var label = f.episode > 0 ? d.name + " · " + f.title : d.name;
            var msg = "interaction:commit:message:";
            var ctx = movieId + "~" + g.key + "~" + f.name;
            var props = {
                "resume:key": "url",
                "trigger:start": msg + "start~" + ctx,
                // «end», а не «complete»: complete у MSX включает следующую серию, его не трогаем
                "trigger:end": msg + "prog~" + ctx + "~100",
                // «Назад» из плеера — закрыть видео (иначе оно играет под страницей) и обновить страницу фильма
                "trigger:back": "[player:eject|" + msg + "back~" + movieId + "]"
            };
            for (var pct = 10; pct <= 90; pct += 10) props["trigger:" + pct + "%"] = msg + "prog~" + ctx + "~" + pct;
            items.push({
                title: label,
                playerLabel: label,
                image: d.poster,
                action: "video:" + f.url,
                properties: props
            });
        }
        callback({ type: "list", headline: d.name, template: { type: "separate", layout: "0,0,2,3", imageFiller: "cover" }, items: items });
    }, function(e) {
        callback({ error: e });
    });
}

/* ---------- сообщение о проблеме ---------- */

var PROBLEMS = ["Видео не запускается", "Нет звука или нет русской озвучки", "Тормозит, зависает или обрывается",
    "Плохое качество картинки", "Не та серия или не тот фильм", "Ошибка в описании или постере"];

function reportPanel(id, callback) {
    // rep~ID~группа~индекс файла
    var t = id.split("~");
    var items = [];
    for (var i = 0; i < PROBLEMS.length; i++) {
        items.push({ type: "control", icon: "report", label: PROBLEMS[i], action: "interaction:commit:message:send~" + t[1] + "~" + t[2] + "~" + t[3] + "~" + i });
    }
    items.push({ type: "control", icon: "keyboard", label: "Другое — написать самому", action: "[back|content:" + req("kb~report~" + t[1] + "~" + t[2] + "~" + t[3]) + "]" });
    callback({
        headline: "Сообщить о проблеме",
        type: "list",
        template: { type: "control", layout: "0,0,8,1" },
        items: items
    });
}

function sendReport(movieId, groupKey, fileIdx, text, done) {
    loadMovie(movieId, function(d) {
        var file = null, gl = "";
        for (var i = 0; i < d.groups.length; i++) {
            if (d.groups[i].key === groupKey) {
                gl = d.groups[i].label;
                if (fileIdx !== "") file = d.groups[i].files[parseInt(fileIdx, 10)];
            }
        }
        var msg = "[MSX] " + text + "\nФильм: " + d.name + " (id " + movieId + ")\n";
        if (file) msg += "Файл: " + file.name + " — " + file.title + "\n";
        if (gl) msg += "Качество: " + gl;
        api("Video.report", { page: SITE + "/#/movie/id/" + movieId, desc: msg }, function() {
            done(true);
        }, function(e) {
            done(false, e);
        });
    }, function(e) {
        done(false, e);
    });
}

/* ---------- экранная клавиатура (поиск и текст жалобы) ---------- */

var KEYS = {
    ru: ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ",
        "ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э", "ё",
        "я", "ч", "с", "м", "и", "т", "ь", "б", "ю", ".", ",", "-"],
    en: ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "'", ":",
        "a", "s", "d", "f", "g", "h", "j", "k", "l", ".", ",", "-",
        "z", "x", "c", "v", "b", "n", "m", "!", "?", "(", ")", "&"]
};
var DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

var kb = { mode: "search", text: "", lang: "ru", ctx: "", results: null, busy: false, status: "" };
var searchTimer = null;
var searchSeq = 0;

function keyButton(label, x, y, w, message) {
    return {
        type: "button", layout: x + "," + y + "," + w + ",1", label: label,
        action: "interaction:commit:message:" + message
    };
}

function keyboardPage() {
    var items = [];
    var keys = KEYS[kb.lang];
    for (var i = 0; i < keys.length; i++) {
        items.push(keyButton(keys[i].toUpperCase(), i % 12, 1 + Math.floor(i / 12), 1, "key~" + keys[i]));
    }
    for (var d = 0; d < DIGITS.length; d++) items.push(keyButton(DIGITS[d], d, 4, 1, "key~" + DIGITS[d]));
    items.push(keyButton("{ico:backspace}", 10, 4, 2, "ctl~back"));
    items.push(keyButton("{ico:space-bar} Пробел", 0, 5, 4, "ctl~space"));
    items.push(keyButton("{ico:clear} Стереть всё", 4, 5, 3, "ctl~clear"));
    items.push(keyButton("{ico:language} " + (kb.lang === "ru" ? "EN" : "RU"), 7, 5, 2, "ctl~lang"));
    if (kb.mode === "report") items.push(keyButton("{ico:send} Отправить", 9, 5, 3, "ctl~submit"));
    else items.push(keyButton("{ico:search} Найти", 9, 5, 3, "ctl~submit"));
    items[0].focus = kb.focusFirst !== false;
    items = navItems(kb.mode === "search" ? "search" : null).concat(items);
    var shown = kb.text ? kb.text : "{col:msx-white-soft}" + (kb.mode === "report" ? "опишите проблему…" : "название фильма или сериала…");
    return {
        headline: (kb.mode === "report" ? "{ico:edit} " : "{ico:search} ") + shown + "{col:" + ORANGE + "}▏",
        items: items
    };
}

function keyboardScreen() {
    var pages = [keyboardPage()];
    var ext = "";
    if (kb.mode === "search") {
        if (kb.busy) ext = "Ищем…";
        else if (kb.results) {
            if (kb.results.length) {
                ext = "Найдено: " + kb.results.length + " — листайте вниз";
                for (var i = 0; i < kb.results.length; i += 6) {
                    pages = pages.concat(posterPages(kb.results.slice(i, i + 6), i === 0 ? "Результаты" : null));
                }
            } else ext = "Ничего не найдено";
        }
    } else if (kb.status) {
        ext = kb.status;
    }
    return {
        type: "list", flag: "kb", cache: false, important: true,
        headline: kb.mode === "report" ? "Сообщить о проблеме" : "Поиск",
        extension: ext,
        background: BASE + "img/background.jpg",
        transparent: 1,
        pages: pages
    };
}

function runSearch() {
    var q = kb.text.replace(/^\s+|\s+$/g, "");
    if (q.length < 2) {
        kb.results = null;
        kb.busy = false;
        return;
    }
    var seq = ++searchSeq;
    kb.busy = true;
    api("Video.search", { query: q }, function(r) {
        if (seq !== searchSeq) return;
        kb.busy = false;
        kb.results = parseMovies(r.movies);
        refreshKeyboard();
    }, function() {
        if (seq !== searchSeq) return;
        kb.busy = false;
        kb.results = [];
        refreshKeyboard();
    });
}

function refreshKeyboard() {
    TVXInteractionPlugin.executeAction("reload:content");
}

function handleKey(message) {
    var t = message.split("~");
    if (t[0] === "key") {
        if (kb.text.length < 60) kb.text += t.slice(1).join("~");
    } else if (t[1] === "back") {
        kb.text = kb.text.substring(0, kb.text.length - 1);
    } else if (t[1] === "space") {
        if (kb.text && kb.text.charAt(kb.text.length - 1) !== " ") kb.text += " ";
    } else if (t[1] === "clear") {
        kb.text = "";
        kb.results = null;
    } else if (t[1] === "lang") {
        kb.lang = kb.lang === "ru" ? "en" : "ru";
    } else if (t[1] === "submit") {
        if (kb.mode === "report") {
            if (!kb.text.replace(/\s/g, "")) {
                TVXInteractionPlugin.executeAction("warn:Опишите проблему");
                return;
            }
            var c = kb.ctx.split("~");
            kb.status = "{col:msx-white-soft}Отправка…";
            refreshKeyboard();
            sendReport(c[0], c[1], c[2], "Другое: " + kb.text, function(ok, e) {
                if (ok) {
                    kb.text = "";
                    kb.status = "";
                    TVXInteractionPlugin.executeAction("[back|success:Спасибо! Сообщение отправлено в ЛДС]");
                } else {
                    kb.status = "{col:" + ORANGE + "}Не удалось отправить: " + e;
                    refreshKeyboard();
                }
            });
            return;
        }
        clearTimeout(searchTimer);
        runSearch();
        refreshKeyboard();
        return;
    }
    kb.focusFirst = false;
    if (kb.mode === "search") {
        // ищем, когда пользователь перестал нажимать на полсекунды
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            runSearch();
            refreshKeyboard();
        }, 700);
    }
    refreshKeyboard();
}

/******************************************************************************/
// Обработчик MSX
/******************************************************************************/

function handleMessage(message) {
    var t = message.split("~");
    if (t[0] === "fav") {
        var d = detailsCache[t[1]];
        var m = d ? { id: d.id, name: d.name, year: d.year, cover: d.poster } : { id: t[1], name: "", year: "", cover: null };
        var added = Store.toggleFav(m);
        TVXInteractionPlugin.executeAction("[replace:content:movie:" + req("movie~" + t[1]) + "|info:" + (added ? "Добавлено в избранное" : "Убрано из избранного") + "]");
    } else if (t[0] === "start" || t[0] === "prog") {
        // события плеера: начало просмотра и каждые 10%
        var id = t[1], group = t[2], file = t[3];
        var dd = detailsCache[id];
        if (t[0] === "start" && dd) {
            var title = "";
            for (var i = 0; i < dd.groups.length; i++) for (var j = 0; j < dd.groups[i].files.length; j++) {
                if (dd.groups[i].files[j].name === file) title = dd.groups[i].files[j].title;
            }
            Store.addHistory({ id: dd.id, name: dd.name, year: dd.year, cover: dd.poster }, group, file, title);
        }
        if (t[0] === "prog") Store.setProgress(id, file, parseInt(t[4], 10) / 100);
    } else if (t[0] === "back") {
        // вернулись из плеера — перерисовать страницу, чтобы появилось «Продолжить» и отметки серий
        setTimeout(function() {
            TVXInteractionPlugin.executeAction("replace:content:movie:" + req("movie~" + t[1]));
        }, 300);
    } else if (t[0] === "send") {
        sendReport(t[1], t[2], t[3], PROBLEMS[parseInt(t[4], 10)], function(ok, e) {
            TVXInteractionPlugin.executeAction(ok ? "[back|success:Спасибо! Сообщение отправлено в ЛДС]" : "error:Не удалось отправить: " + e);
        });
    } else if (t[0] === "key" || t[0] === "ctl") {
        handleKey(message);
    }
}

function KinoHandler() {
    this.init = function() {};
    this.ready = function() {};
    this.handleEvent = function(data) {};
    this.handleData = function(data) {
        if (data && data.message) handleMessage(String(data.message));
    };
    this.handleRequest = function(dataId, data, callback) {
        var id = String(dataId || "");
        try {
            if (id === "menu") callback(menu());
            else if (id === "home") home(callback);
            else if (id === "fav") callback(listScreen("fav", "Избранное", Store.favorites(), "Здесь пока пусто. Откройте фильм и нажмите «В избранное»."));
            else if (id === "history") callback(listScreen("history", "История просмотра", Store.history(), "Вы ещё ничего не смотрели."));
            else if (id === "search") {
                if (kb.mode !== "search") {
                    kb.mode = "search";
                    kb.focusFirst = true;
                }
                callback(keyboardScreen());
            } else if (id.indexOf("kb~report~") === 0) {
                if (kb.mode !== "report" || kb.ctx !== id.substring(10)) {
                    kb.text = "";
                    kb.status = "";
                    kb.focusFirst = true;
                }
                kb.mode = "report";
                kb.ctx = id.substring(10);
                callback(keyboardScreen());
            } else if (id === "kb") callback(keyboardScreen());
            else if (id.indexOf("cat~") === 0) catalog(id, callback);
            else if (id.indexOf("pick~") === 0) picker(id, callback);
            else if (id.indexOf("movie~") === 0) movieScreen(id, callback);
            else if (id.indexOf("pl~") === 0) playlist(id, callback);
            else if (id.indexOf("rep~") === 0) reportPanel(id, callback);
            else callback({ error: "Неизвестный запрос: " + id });
        } catch (e) {
            callback(errorContent(String(e && e.message || e)));
        }
    };
}

TVXPluginTools.onReady(function() {
    TVXInteractionPlugin.setupHandler(new KinoHandler());
    TVXInteractionPlugin.init();
});
