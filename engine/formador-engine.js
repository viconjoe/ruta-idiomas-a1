(function (global) {
  "use strict";

  var Engine = {};
  var state = { completed: {}, scores: {}, checks: {}, text: "" };
  var content = null;
  var config = null;
  var storageKey = "";

  function byId(id) { return document.getElementById(id); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) {} }
  function load() {
    try {
      var raw = localStorage.getItem(storageKey);
      if (raw) state = Object.assign(state, JSON.parse(raw));
    } catch (e) {}
  }
  function mark(blockId, value) {
    state.completed[blockId] = value !== false;
    save();
    renderAutoevaluacion();
    renderInforme();
  }
  function isDone(id) { return !!state.completed[id]; }
  function titleCase(id) { return id.charAt(0).toUpperCase() + id.slice(1); }

  function section(id, title, intro) {
    var sec = el("section", "panel block-section");
    sec.id = id;
    var head = el("div", "block-header");
    var wrap = el("div");
    wrap.appendChild(el("p", "eyebrow", "Bloque"));
    wrap.appendChild(el("h2", null, title));
    if (intro) wrap.appendChild(el("p", "muted", intro));
    var status = el("span", "status-pill", isDone(id) ? "Realizado" : "Pendiente");
    head.appendChild(wrap);
    head.appendChild(status);
    sec.appendChild(head);
    return sec;
  }

  function optionList(name, options) {
    var list = el("div", "option-list");
    options.forEach(function (option, index) {
      var label = el("label", "option");
      var input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = String(index);
      var span = el("span", null, option);
      label.appendChild(input);
      label.appendChild(span);
      list.appendChild(label);
    });
    return list;
  }

  function selectedValue(container, name) {
    var checked = container.querySelector("input[name='" + name + "']:checked");
    return checked ? Number(checked.value) : null;
  }

  function correctIndex(item) {
    if (typeof item.correct === "number") return item.correct;
    if (typeof item.respuestaCorrecta === "number") return item.respuestaCorrecta;
    if (typeof item.answer === "number") return item.answer;
    return -1;
  }

  function renderMultipleChoice(container, blockId, item, name, afterCheck) {
    var card = el("article", "card");
    if (item.title) card.appendChild(el("h3", null, item.title));
    if (item.text) {
      var text = Array.isArray(item.text) ? item.text.join("\n") : item.text;
      card.appendChild(el("div", "text-box", text));
    }
    if (item.audio) {
      var audio = document.createElement("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.src = item.audio;
      card.appendChild(audio);
    }
    if (item.transcription) card.appendChild(el("p", "muted", "Transcripción: " + item.transcription));
    card.appendChild(el("h3", null, item.question || item.pregunta || item.situacion));
    card.appendChild(optionList(name, item.options || item.opciones || []));
    var feedback = el("div", "feedback");
    feedback.hidden = true;
    var actions = el("div", "actions");
    var check = el("button", "primary", "Comprobar respuesta");
    var clearBtn = el("button", "secondary", "Desmarcar");
    actions.appendChild(check);
    actions.appendChild(clearBtn);
    card.appendChild(actions);
    card.appendChild(feedback);
    clearBtn.addEventListener("click", function () {
      var checked = card.querySelector("input[name='" + name + "']:checked");
      if (checked) checked.checked = false;
      feedback.hidden = true;
      feedback.className = "feedback";
      feedback.textContent = "";
    });
    check.addEventListener("click", function () {
      var value = selectedValue(card, name);
      if (value === null) {
        feedback.hidden = false;
        feedback.className = "feedback ko";
        feedback.textContent = "Elige una opción antes de comprobar.";
        return;
      }
      var ok = value === correctIndex(item);
      feedback.hidden = false;
      feedback.className = "feedback " + (ok ? "ok" : "ko");
      feedback.textContent = (ok ? "Correcto. " : "Revisa la respuesta. ") + (item.feedback || "");
      if (afterCheck) afterCheck(ok, card);
      mark(blockId, true);
    });
    container.appendChild(card);
    return card;
  }

  function renderDiagnostico(parent, data) {
    var items = data.items || data.preguntas || [];
    var sec = section("diagnostico", data.title || "Diagnóstico", data.intro || "Autoevaluación rápida de nivel A1.");
    var area = el("div");
    var index = 0;
    var score = 0;
    function draw() {
      clear(area);
      var item = items[index];
      area.appendChild(el("p", "counter", "Pregunta " + (index + 1) + " / " + items.length));
      renderMultipleChoice(area, "diagnostico", item, "diag" + index, function (ok, card) {
        if (!card.dataset.counted) {
          score += ok ? 1 : 0;
          card.dataset.counted = "1";
          state.scores.diagnostico = { correctas: score, total: items.length };
          save();
        }
        if (!card.querySelector(".next-question")) {
          var next = el("button", "primary next-question", index + 1 < items.length ? "Siguiente" : "Finalizar");
          next.addEventListener("click", function () {
            if (index + 1 < items.length) { index += 1; draw(); }
            else { mark("diagnostico", true); renderAutoevaluacion(); renderInforme(); }
          });
          card.querySelector(".actions").appendChild(next);
        }
      });
    }
    draw();
    sec.appendChild(area);
    parent.appendChild(sec);
  }

  function renderFlashcards(parent, data) {
    var items = (data.items || []).slice();
    var sec = section("flashcards", data.title || "Flashcards", data.intro || "Repaso de expresiones esenciales.");
    var pos = 0;
    var flipped = false;
    var card = el("div", "flashcard");
    card.tabIndex = 0;
    var actions = el("div", "actions");
    function draw() {
      var item = items[pos] || {};
      clear(card);
      card.appendChild(el("p", "counter", (pos + 1) + " / " + items.length));
      card.appendChild(el("div", "flash-main", flipped ? item.back : item.front));
      card.appendChild(el("div", "flash-sub", flipped ? item.hint || "Pulsa para volver" : "Pulsa para ver el reverso"));
      mark("flashcards", pos > 0 || flipped || isDone("flashcards"));
    }
    function shuffle() {
      for (var i = items.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = items[i]; items[i] = items[j]; items[j] = tmp;
      }
      pos = 0; flipped = false; draw();
    }
    card.addEventListener("click", function () { flipped = !flipped; draw(); });
    card.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); flipped = !flipped; draw(); } });
    var prev = el("button", "secondary", "Anterior");
    var next = el("button", "primary", "Siguiente");
    var mix = el("button", "secondary", "Mezclar");
    prev.addEventListener("click", function () { pos = Math.max(0, pos - 1); flipped = false; draw(); });
    next.addEventListener("click", function () { pos = Math.min(items.length - 1, pos + 1); flipped = false; draw(); });
    mix.addEventListener("click", shuffle);
    actions.appendChild(prev); actions.appendChild(next); actions.appendChild(mix);
    draw();
    sec.appendChild(card); sec.appendChild(actions); parent.appendChild(sec);
  }

  function renderGramatica(parent, data) {
    var sec = section("gramatica", data.title || "Gramática", data.intro || "Píldoras de consulta rápida.");
    var grid = el("div", "cards-grid grammar-list");
    (data.items || []).forEach(function (item) {
      var card = el("article", "card");
      card.appendChild(el("h3", null, item.title));
      card.appendChild(el("p", null, item.explanation));
      var list = el("ul", "example-list");
      (item.examples || []).forEach(function (example) { list.appendChild(el("li", null, example)); });
      card.appendChild(list);
      grid.appendChild(card);
    });
    sec.appendChild(grid); parent.appendChild(sec);
  }

  function renderActivityList(parent, id, data) {
    var sec = section(id, data.title || titleCase(id), data.intro || "Actividad de práctica.");
    var list = el("div", "cards-grid");
    (data.items || []).forEach(function (item, index) { renderMultipleChoice(list, id, item, id + index); });
    sec.appendChild(list); parent.appendChild(sec);
  }

  function renderEmparejar(parent, data) {
    var sec = section("emparejar", data.title || "Emparejar", data.intro || "Relaciona expresiones con intenciones comunicativas.");
    var grid = el("div", "cards-grid");
    (data.items || []).forEach(function (item) {
      var card = el("article", "card");
      card.appendChild(el("h3", null, item.front));
      card.appendChild(el("p", "muted", item.back));
      grid.appendChild(card);
    });
    var done = el("button", "primary", "Marcar como repasado");
    done.addEventListener("click", function () { mark("emparejar", true); });
    sec.appendChild(grid); sec.appendChild(done); parent.appendChild(sec);
  }

  function renderOral(parent, data) {
    var sec = section("oral", data.title || "Práctica oral", data.intro || "Práctica guiada sin grabación.");
    (data.items || []).forEach(function (item, index) {
      var card = el("article", "card");
      card.appendChild(el("h3", null, item.title));
      card.appendChild(el("p", null, item.task));
      card.appendChild(el("div", "text-box", item.model));
      var list = el("div", "support-list");
      (item.support || []).forEach(function (support) { list.appendChild(el("p", null, support.phrase + " — " + support.note)); });
      card.appendChild(list);
      var checklist = el("div", "checklist");
      ["He practicado en voz alta", "He usado el modelo", "He revisado la cortesía"].forEach(function (label, cIndex) {
        var row = el("label", "option");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!(state.checks.oral && state.checks.oral[index] && state.checks.oral[index][cIndex]);
        input.addEventListener("change", function () {
          state.checks.oral = state.checks.oral || {};
          state.checks.oral[index] = state.checks.oral[index] || {};
          state.checks.oral[index][cIndex] = input.checked;
          mark("oral", true);
        });
        row.appendChild(input); row.appendChild(el("span", null, label)); checklist.appendChild(row);
      });
      card.appendChild(checklist); sec.appendChild(card);
    });
    parent.appendChild(sec);
  }

  function renderReto(parent, data) {
    var sec = section("reto", data.title || "Reto", data.intro || "Producción libre local.");
    var prompts = data.prompts || [];
    var prompt = el("div", "text-box", prompts[Math.floor(Math.random() * prompts.length)] || "Escribe una producción breve.");
    var refresh = el("button", "secondary", "Otro prompt");
    refresh.addEventListener("click", function () { prompt.textContent = prompts[Math.floor(Math.random() * prompts.length)] || prompt.textContent; });
    var textarea = document.createElement("textarea");
    textarea.value = state.text || "";
    textarea.placeholder = data.placeholder || "Escribe aquí tu producción breve.";
    textarea.addEventListener("input", function () { state.text = textarea.value; save(); });
    var checklist = el("div", "checklist");
    (data.checklist || []).forEach(function (label, index) {
      var row = el("label", "option");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!(state.checks.reto && state.checks.reto[index]);
      input.addEventListener("change", function () {
        state.checks.reto = state.checks.reto || {};
        state.checks.reto[index] = input.checked;
        save();
      });
      row.appendChild(input); row.appendChild(el("span", null, label)); checklist.appendChild(row);
    });
    var review = el("button", "primary", "Revisar texto");
    var result = el("div", "feedback"); result.hidden = true;
    review.addEventListener("click", function () {
      var checked = Object.keys(state.checks.reto || {}).filter(function (key) { return state.checks.reto[key]; }).length;
      var enoughText = textarea.value.trim().length >= 20;
      result.hidden = false;
      result.className = "feedback " + (enoughText && checked > 0 ? "ok" : "ko");
      result.textContent = enoughText && checked > 0 ? "Texto preparado para revisión docente o práctica oral." : "Añade algo más de texto y revisa la lista antes de terminar.";
      if (enoughText && checked > 0) mark("reto", true);
    });
    sec.appendChild(prompt); sec.appendChild(refresh); sec.appendChild(textarea); sec.appendChild(checklist); sec.appendChild(review); sec.appendChild(result); parent.appendChild(sec);
  }

  function renderAutoevaluacion() {
    var target = byId("autoevaluacion-content");
    if (!target || !content) return;
    clear(target);
    var blocks = Object.keys(content.blocks || {});
    var done = blocks.filter(isDone).length;
    target.appendChild(el("p", null, "Bloques realizados: " + done + " / " + blocks.length + "."));
    if (state.scores.diagnostico) target.appendChild(el("p", null, "Diagnóstico: " + state.scores.diagnostico.correctas + " / " + state.scores.diagnostico.total + "."));
  }

  function renderAuto(parent, data) {
    var sec = section("autoevaluacion", data.title || "Autoevaluación", data.intro || "Síntesis local del progreso.");
    var box = el("div", "progress-summary");
    box.id = "autoevaluacion-content";
    sec.appendChild(box); parent.appendChild(sec); renderAutoevaluacion();
  }

  function renderInforme() {
    var target = byId("informe-content");
    if (!target || !content) return;
    clear(target);
    var blocks = Object.keys(content.blocks || {});
    blocks.forEach(function (id) { target.appendChild(el("p", null, titleCase(id) + ": " + (isDone(id) ? "realizado" : "pendiente"))); });
    if (state.text) target.appendChild(el("div", "text-box", "Producción escrita local:\n" + state.text));
  }

  function renderInformeBlock(parent, data) {
    var sec = section("informe", data.title || "Informe", data.intro || "Vista local imprimible. No envía datos.");
    var box = el("div", "card"); box.id = "informe-content";
    var print = el("button", "primary no-print", "Imprimir o guardar PDF");
    print.addEventListener("click", function () { window.print(); });
    sec.appendChild(box); sec.appendChild(print); parent.appendChild(sec); renderInforme();
  }

  function renderShell(root) {
    clear(root);
    var header = el("header", "site-header");
    var headerInner = el("div", "container header-inner");
    headerInner.appendChild(el("p", "eyebrow", "El Formador Junior"));
    headerInner.appendChild(el("h1", null, config.title || content.meta.title));
    headerInner.appendChild(el("p", "lead", "Recurso A1 reutilizable, local y privado. El progreso queda solo en este navegador."));
    header.appendChild(headerInner);
    var nav = el("nav", "app-nav no-print");
    var navInner = el("div", "container nav-inner");
    var links = el("div", "nav-links");
    Object.keys(content.blocks || {}).forEach(function (id) {
      var a = el("a", null, titleCase(id));
      a.href = "#" + id;
      links.appendChild(a);
    });
    navInner.appendChild(links); nav.appendChild(navInner);
    var main = el("main", "container section-stack");
    root.appendChild(nav); root.appendChild(header); root.appendChild(main);
    var blocks = content.blocks || {};
    if (blocks.diagnostico) renderDiagnostico(main, blocks.diagnostico);
    if (blocks.flashcards) renderFlashcards(main, blocks.flashcards);
    if (blocks.gramatica) renderGramatica(main, blocks.gramatica);
    if (blocks.lectura) renderActivityList(main, "lectura", blocks.lectura);
    if (blocks.audicion) renderActivityList(main, "audicion", blocks.audicion);
    if (blocks.emparejar) renderEmparejar(main, blocks.emparejar);
    if (blocks.situaciones) renderActivityList(main, "situaciones", blocks.situaciones);
    if (blocks.oral) renderOral(main, blocks.oral);
    if (blocks.reto) renderReto(main, blocks.reto);
    if (blocks.autoevaluacion) renderAuto(main, blocks.autoevaluacion);
    if (blocks.informe) renderInformeBlock(main, blocks.informe);
  }

  Engine.init = function (userConfig) {
    config = userConfig || {};
    storageKey = "efj_" + (config.resourceId || "resource") + "_progress";
    load();
    var root = byId("app") || document.body;
    fetch(config.contentPath, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("No se pudo cargar el contenido");
        return response.json();
      })
      .then(function (json) { content = json; document.documentElement.lang = config.lang || json.meta.lang || "es"; renderShell(root); })
      .catch(function () {
        clear(root);
        root.appendChild(el("div", "container panel", "No se pudo cargar el contenido del recurso."));
      });
  };

  global.FormadorEngine = Engine;
})(window);

