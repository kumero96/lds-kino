/* Кинотеатр ЛДС — данные: запросы к cinema.ntop.tv и хранилище на устройстве.
   Только ES5: браузеры телевизоров Samsung/LG до ~2020 года не понимают новый JavaScript. */

var API_URL = "https://cinema.ntop.tv/api.php?format=ajax&JsHttpRequest=1-xml";
var SITE = "https://cinema.ntop.tv";
var WATCHED = 0.9;

/* ---------- запросы ---------- */

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
    var finished = false;
    var finish = function(ok, value) {
        if (finished) return;
        finished = true;
        if (ok) done(value);
        else if (fail) fail(value);
    };
    x.open("POST", API_URL, true);
    x.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    x.onreadystatechange = function() {
        if (x.readyState !== 4) return;
        var r;
        try {
            r = JSON.parse(x.responseText).js[0];
        } catch (e) {
            finish(false, x.status ? "Сервер ответил с ошибкой (" + x.status + ")" : "Нет связи с сервером кинотеатра");
            return;
        }
        if (String(r.status) !== "200") finish(false, r.message || "Ошибка сервера");
        else finish(true, r.response || {});
    };
    setTimeout(function() {
        if (!finished) {
            try { x.abort(); } catch (e) {}
            finish(false, "Сервер долго не отвечает");
        }
    }, 30000);
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

// ссылки для скачивания → ссылки для просмотра (так делает сам сайт)
function streamUrl(u) {
    return u.replace(/^https?:\/\/(web|download|fastonline)\.cinema\.ntop\.tv\//, "https://online.cinema.ntop.tv/");
}

function epLabel(f) {
    return f.episode2 > 0 ? f.episode + "–" + f.episode2 : String(f.episode);
}

function fileTitle(f) {
    if (f.season > 0 && f.episode > 0) return "Сезон " + f.season + ", серия " + epLabel(f);
    if (f.episode > 0) return "Серия " + epLabel(f);
    return f.name;
}

function parseDetails(m) {
    var files = [];
    var fa = m.files || [];
    var i;
    for (i = 0; i < fa.length; i++) {
        var f = fa[i];
        if (!f || f.is_dir === true || !f.links || !f.links.download) continue;
        var raw = f.links.download;
        var ext = raw.substring(raw.lastIndexOf(".") + 1).toLowerCase();
        if (!PLAYABLE[ext]) continue;
        var url = streamUrl(raw);
        var group = ((url.split("://")[1] || "").split("/")[1] || "").toLowerCase();
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
        var file = {
            name: name, url: url, ext: ext, group: group, resolution: str(f.resolution_name),
            season: season, episode: episode, episode2: episode2,
            duration: parseInt(meta.playtime_seconds, 10) || 0,
            size: num(f.size),
            translation: f.translation && f.translation.length ? str(f.translation[0]) : "",
            audio: meta.audio ? meta.audio.length : 0,
            subtitles: String(f.subtitles) === "1"
        };
        file.title = fileTitle(file);
        files.push(file);
    }
    var order = { hd: 0, sd: 1, "4k": 2 };
    var byGroup = {};
    var keys = [];
    for (i = 0; i < files.length; i++) {
        var g = files[i].group;
        if (!byGroup[g]) {
            byGroup[g] = [];
            keys.push(g);
        }
        byGroup[g].push(files[i]);
    }
    keys.sort(function(a, b) {
        return (order[a] !== undefined ? order[a] : 9) - (order[b] !== undefined ? order[b] : 9);
    });
    var groups = [];
    for (i = 0; i < keys.length; i++) {
        var list = byGroup[keys[i]];
        list.sort(function(a, b) {
            return a.season - b.season || a.episode - b.episode || (a.name < b.name ? -1 : 1);
        });
        var label = keys[i] === "4k" ? "4K" : keys[i] === "sd" ? "SD" : keys[i] === "hd" ? "HD " + (list[0].resolution || "") : keys[i].toUpperCase();
        groups.push({ key: keys[i], label: label.replace(/\s+$/, ""), files: list });
    }
    var cover = m.covers && m.covers.length ? m.covers[0] : null;
    var cast = [];
    var ps = m.persones || [];
    for (i = 0; i < ps.length && cast.length < 8; i++) if (ps[i] && ps[i].name) cast.push(ps[i].name);
    // сериал — только если файлы размечены как серии (у фильма бывает несколько файлов: 4K, HDR и т.п.)
    var maxEp = 0;
    for (i = 0; i < groups.length; i++) {
        var eps = 0;
        for (var j = 0; j < groups[i].files.length; j++) if (groups[i].files[j].episode > 0) eps++;
        maxEp = Math.max(maxEp, eps);
    }
    return {
        id: String(m.movie_id),
        name: cleanName(m.name),
        original: str(m.international_name),
        year: str(m.year),
        description: str(m.description).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, ""),
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

function loadMovie(id, done, fail, fresh) {
    if (detailsCache[id] && !fresh) {
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

function toMovie(d) {
    return { id: d.id, name: d.name, year: d.year, cover: d.poster };
}

/* ---------- хранилище на устройстве ---------- */

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
    // позиция по имени файла (одна и та же серия в HD и SD считается одной)
    position: function(file) {
        return Store.get("p:" + file, null); // { t: секунды, d: длительность }
    },
    progress: function(file) {
        var p = Store.position(file);
        return p && p.d > 0 ? Math.min(1, p.t / p.d) : -1;
    },
    savePosition: function(id, file, t, d) {
        if (!d || d <= 0) return;
        Store.set("p:" + file, { t: Math.floor(t), d: Math.floor(d) });
        if (t / d >= WATCHED) {
            var w = Store.get("w:" + id, []);
            if (w.indexOf(file) < 0) {
                w.push(file);
                Store.set("w:" + id, w);
            }
        }
    },
    // с какого места продолжить (0 — с начала)
    resumeAt: function(file) {
        var p = Store.position(file);
        if (!p) return 0;
        return p.t > 15 && p.t < p.d - 90 ? p.t : 0;
    },
    watched: function(id) {
        return Store.get("w:" + id, []).length;
    }
};

/* ---------- новые серии в избранном ---------- */

var newEpisodes = {};
var checkedFav = {};

function checkNewEpisodes(done) {
    var favs = Store.favorites();
    var pending = 0;
    var finished = false;
    var finish = function() {
        if (!finished && pending === 0) {
            finished = true;
            if (done) done();
        }
    };
    for (var i = 0; i < favs.length; i++) {
        (function(id) {
            if (checkedFav[id]) return;
            checkedFav[id] = true;
            pending++;
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
            }, true);
        })(favs[i].id);
    }
    finish();
    setTimeout(function() {
        if (!finished) {
            finished = true;
            if (done) done();
        }
    }, 6000);
}

/* ---------- сообщение о проблеме ---------- */

function sendReport(d, file, groupLabel, text, done) {
    var msg = "[ТВ-сайт] " + text + "\nФильм: " + d.name + " (id " + d.id + ")\n";
    if (file) msg += "Файл: " + file.name + " — " + file.title + "\n";
    if (groupLabel) msg += "Качество: " + groupLabel;
    api("Video.report", { page: SITE + "/#/movie/id/" + d.id, desc: msg }, function() {
        done(true);
    }, function(e) {
        done(false, e);
    });
}
