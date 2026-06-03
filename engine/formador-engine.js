(function (global) {
  "use strict";

  var Engine = {};
  var state = { completed: {}, scores: {}, checks: {}, text: "" };
  var content = null;
  var config = null;
  var storageKey = "";
  var currentBlockId = "";

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
    updateProgressUi();
    renderAutoevaluacion();
    renderInforme();
  }
  function blocks() { return content && content.blocks ? content.blocks : {}; }
  function blockIds() { return Object.keys(blocks()); }
  function routeIds() { return ["objetivo"].concat(blockIds()); }
  function doneCount() { return blockIds().filter(isDone).length; }
  function progressPercent() {
    var ids = blockIds();
    return ids.length ? Math.round((doneCount() / ids.length) * 100) : 0;
  }
  function isDone(id) { return !!state.completed[id]; }
  function blockLabel(id) {
    var labels = {
      objetivo: "Cómo usar esta app",
      mapa: "Mapa",
      diagnostico: "Diagnóstico",
      flashcards: "Flashcards",
      gramatica: "Gramática",
      lectura: "Lectura",
      audicion: "Audición",
      emparejar: "Emparejar",
      situaciones: "Situaciones",
      oral: "Oral",
      reto: "Reto",
      autoevaluacion: "Autoevaluación",
      informe: "Informe"
    };
    return labels[id] || (id.charAt(0).toUpperCase() + id.slice(1));
  }

  function blockHelp(id, data) {
    var help = {
      objetivo: "Elige un recorrido y avanza con los botones de la barra inferior.",
      diagnostico: "Detecta en pocos minutos qué conviene repasar.",
      flashcards: "Repasa frases funcionales y practica producción oral breve.",
      gramatica: "Consulta estructuras útiles antes de resolver tareas.",
      lectura: "Localiza información concreta en textos A1.",
      audicion: "Escucha mensajes breves con audios locales.",
      emparejar: "Relaciona expresiones con su intención comunicativa.",
      situaciones: "Elige la frase adecuada para situaciones cotidianas.",
      oral: "Practica respuestas breves sin grabación obligatoria.",
      reto: "Prepara una situación comunicativa final en local.",
      autoevaluacion: "Revisa una síntesis formativa de tu recorrido.",
      informe: "Genera una vista local para imprimir o guardar."
    };
    return (data && data.intro) || help[id] || "Abre este bloque para continuar la práctica.";
  }

  function safeThemeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function applyResourceTheme() {
    var meta = content && content.meta ? content.meta : {};
    var ui = meta.ui || {};
    var theme = safeThemeName(ui.theme || meta.theme || config.theme);
    document.body.className = document.body.className
      .split(/\s+/)
      .filter(function (name) { return name && name.indexOf("resource-theme-") !== 0 && name !== "resource-theme"; })
      .join(" ");
    if (theme) {
      document.body.classList.add("resource-theme", "resource-theme-" + theme);
    }
  }

  function scrollToBlock(id, behavior) {
    if (currentBlockId !== id) setCurrentBlock(id);
    var target = byId(id);
    if (target) target.scrollIntoView({ behavior: behavior || "smooth", block: "start" });
  }

  function alignRouteViewport(id) {
    var target = byId(id || currentBlockId) || document.querySelector(".guided-active") || document.querySelector(".section-stack");
    if (!target) return;
    var nav = document.querySelector(".app-nav");
    var navHeight = nav ? nav.getBoundingClientRect().height : 0;
    var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }

  function blockPosition(id) {
    if (id === "objetivo") {
      return { index: 0, number: 0, total: blockIds().length };
    }
    if (id === "mapa") {
      return { index: -1, number: 0, total: blockIds().length };
    }
    var index = blockIds().indexOf(id);
    return {
      index: index,
      number: index + 1,
      total: blockIds().length
    };
  }

  function setCurrentBlock(id) {
    if (routeIds().indexOf(id) === -1 && id !== "mapa") return;
    currentBlockId = id;
    if (guided.active) {
      var guidedIndex = guided.ids.indexOf(id);
      if (guidedIndex >= 0) guided.index = guidedIndex;
    }
    updateNavigationUi();
  }

  function updateRouteClasses(direction) {
    routeIds().concat(["mapa"]).forEach(function (id) {
      var target = byId(id);
      if (!target) return;
      target.classList.toggle("route-current", id === currentBlockId);
      target.classList.remove("route-enter-left", "route-enter-right");
      if (id === currentBlockId && direction) {
        void target.offsetWidth;
        target.classList.add(direction > 0 ? "route-enter-right" : "route-enter-left");
      }
    });
  }

  function updateProgressUi() {
    if (!content) return;
    var total = blockIds().length;
    var done = doneCount();
    var percent = progressPercent();
    var bar = byId("global-progress-bar");
    var heroBar = byId("global-progress-bar-hero");
    var wrap = byId("global-progress-wrap");
    var text = byId("global-progress-text");
    var count = byId("global-progress-count");
    if (bar) bar.style.width = percent + "%";
    if (heroBar) heroBar.style.width = percent + "%";
    if (wrap) wrap.setAttribute("aria-valuenow", String(percent));
    if (text) text.textContent = percent + "%";
    if (count) count.textContent = done + " / " + total + " bloques";
    blockIds().forEach(function (id) {
      var label = isDone(id) ? "Realizado" : "Pendiente";
      document.querySelectorAll("[data-status-for='" + id + "']").forEach(function (node) {
        node.textContent = label;
        node.classList.toggle("status-pill--done", isDone(id));
      });
      document.querySelectorAll("[data-map-card='" + id + "']").forEach(function (node) {
        node.classList.toggle("block-map-card--done", isDone(id));
      });
    });
    updateNavigationUi();
  }

  function updateNavigationUi(skipRouteUpdate) {
    if (!content) return;
    var ids = guided.active ? guided.ids : routeIds();
    var id = guided.active ? guided.ids[guided.index] : currentBlockId;
    if (id === "mapa") ids = ["mapa"];
    if (!id || ids.indexOf(id) === -1) id = ids[0] || routeIds()[0];
    var index = Math.max(0, ids.indexOf(id));
    var absolute = blockPosition(id);
    var label = byId("dock-block-label");
    var title = byId("dock-block-title");
    var prev = byId("dock-prev");
    var next = byId("dock-next");
    if (label) {
      label.textContent = id === "mapa" ? "Mapa de bloques" : guided.active
        ? "Paso " + (index + 1) + " de " + ids.length
        : absolute.number === 0 ? "Bloque 0" : "Bloque " + absolute.number + " de " + absolute.total;
    }
    if (title) title.textContent = blockLabel(id);
    if (prev) prev.disabled = id === "mapa" || index <= 0;
    if (next) next.textContent = id === "mapa" ? "Volver al inicio" : index >= ids.length - 1 ? "Ver mapa" : "Siguiente";
    if (!skipRouteUpdate) updateRouteClasses(0);
  }

  function goToRelativeBlock(delta) {
    if (currentBlockId === "mapa") {
      scrollToBlock("objetivo");
      return;
    }
    var ids = guided.active ? guided.ids : routeIds();
    if (!ids.length) return;
    var current = guided.active ? guided.ids[guided.index] : currentBlockId;
    var index = ids.indexOf(current);
    if (index < 0) index = 0;
    var nextIndex = index + delta;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= ids.length) {
      guided.active = false;
      document.body.classList.remove("guided-mode");
      updateGuidedView(false);
      scrollToBlock("mapa");
      return;
    }
    if (guided.active) {
      guided.index = nextIndex;
      currentBlockId = guided.ids[guided.index];
      updateGuidedView(false);
      updateNavigationUi(true);
      alignRouteViewport(currentBlockId);
      updateRouteClasses(delta);
      return;
    }
    currentBlockId = ids[nextIndex];
    updateNavigationUi(true);
    updateRouteClasses(delta);
    scrollToBlock(ids[nextIndex], "auto");
  }

  function resetProgress() {
    if (!window.confirm("¿Borrar el progreso local de este recurso en este navegador?")) return;
    state = { completed: {}, scores: {}, checks: {}, text: "", prompt: "", retoFeedback: "" };
    save();
    updateProgressUi();
    renderAutoevaluacion();
    renderInforme();
  }

  function section(id, title, intro) {
    var sec = el("section", "panel block-section");
    sec.id = id;
    var head = el("div", "block-header");
    var wrap = el("div");
    var position = blockPosition(id);
    wrap.appendChild(el("p", "eyebrow block-number", "Bloque " + position.number + " de " + position.total));
    wrap.appendChild(el("h2", null, title));
    if (intro) wrap.appendChild(el("p", "muted", intro));
    var status = el("span", "status-pill", isDone(id) ? "Realizado" : "Pendiente");
    status.setAttribute("data-status-for", id);
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
    var options = item.options || item.opciones || [];
    var optionsNode = optionList(name, options);
    card.appendChild(optionsNode);
    var feedback = el("div", "feedback");
    feedback.hidden = true;
    var actions = el("div", "actions");
    var check = el("button", "primary", "Comprobar respuesta");
    var clearBtn = el("button", "secondary", "Desmarcar");
    actions.appendChild(check);
    actions.appendChild(clearBtn);
    card.appendChild(actions);
    card.appendChild(feedback);
    function clearOptionState() {
      card.querySelectorAll(".option").forEach(function (node) {
        node.classList.remove("selected", "correct", "wrong");
        var note = node.querySelector(".option-result");
        if (note) note.remove();
      });
    }
    optionsNode.addEventListener("change", function () {
      clearOptionState();
      var checked = card.querySelector("input[name='" + name + "']:checked");
      if (checked) checked.closest(".option").classList.add("selected");
    });
    clearBtn.addEventListener("click", function () {
      var checked = card.querySelector("input[name='" + name + "']:checked");
      if (checked) checked.checked = false;
      clearOptionState();
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
      clearOptionState();
      card.querySelectorAll(".option").forEach(function (node, index) {
        if (index === correctIndex(item)) node.classList.add("correct");
        if (index === value && !ok) node.classList.add("wrong");
        if (index === correctIndex(item) || index === value) {
          var result = el("span", "option-result", index === correctIndex(item) ? "Respuesta esperada" : "Tu respuesta");
          node.appendChild(result);
        }
      });
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
    var audio = new Audio();
    var card = el("div", "flashcard");
    card.tabIndex = 0;
    var actions = el("div", "actions");
    function playCurrentAudio(event) {
      if (event) event.stopPropagation();
      var item = items[pos] || {};
      if (!item.audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio.src = item.audio;
      audio.play().catch(function () {});
      mark("flashcards", true);
    }
    function draw() {
      var item = items[pos] || {};
      clear(card);
      card.dataset.side = flipped ? "back" : "front";
      card.appendChild(el("p", "counter", (pos + 1) + " / " + items.length));
      card.appendChild(el("div", "flash-main", flipped ? item.back : item.front));
      var footer = el("div", "flash-footer");
      footer.appendChild(el("div", "flash-sub", flipped ? item.hint || "Pulsa para volver" : "Pulsa para ver el reverso"));
      if (item.audio) {
        var play = el("button", "secondary compact-button flash-audio-button", "Escuchar pronunciación");
        play.type = "button";
        play.setAttribute("aria-label", "Escuchar pronunciación de " + (item.front || "la tarjeta"));
        play.addEventListener("click", playCurrentAudio);
        footer.appendChild(play);
      }
      card.appendChild(footer);
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
    prev.addEventListener("click", function () { audio.pause(); pos = Math.max(0, pos - 1); flipped = false; draw(); });
    next.addEventListener("click", function () { audio.pause(); pos = Math.min(items.length - 1, pos + 1); flipped = false; draw(); });
    mix.addEventListener("click", function () { audio.pause(); shuffle(); });
    actions.appendChild(prev); actions.appendChild(next); actions.appendChild(mix);
    draw();
    sec.appendChild(card);
    sec.appendChild(actions);
    parent.appendChild(sec);
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

  function renderPagedActivityList(parent, id, data) {
    var sec = section(id, data.title || blockLabel(id), data.intro || "Actividad de práctica.");
    var items = data.items || [];
    var index = 0;
    var area = el("div", "activity-pager");
    var nav = el("div", "actions pager-actions no-print");
    var prev = el("button", "secondary", "Anterior");
    var next = el("button", "primary", "Siguiente");
    function nextLabel() {
      if (id === "lectura") return index + 1 >= items.length ? "Finalizar lectura" : "Siguiente texto";
      if (id === "audicion") return index + 1 >= items.length ? "Finalizar audición" : "Siguiente audio";
      if (id === "situaciones") return index + 1 >= items.length ? "Finalizar situaciones" : "Siguiente situación";
      return index + 1 >= items.length ? "Finalizar" : "Siguiente";
    }
    function draw() {
      clear(area);
      var item = items[index];
      area.appendChild(el("p", "counter", blockLabel(id) + " " + (index + 1) + " / " + items.length));
      renderMultipleChoice(area, id, item, id + index);
      prev.disabled = index === 0;
      next.textContent = nextLabel();
    }
    prev.addEventListener("click", function () {
      index = Math.max(0, index - 1);
      draw();
    });
    next.addEventListener("click", function () {
      if (index + 1 < items.length) {
        index += 1;
        draw();
      } else {
        mark(id, true);
        goToRelativeBlock(1);
      }
    });
    nav.appendChild(prev);
    nav.appendChild(next);
    if (items.length) draw();
    sec.appendChild(area);
    sec.appendChild(nav);
    parent.appendChild(sec);
  }

  function renderActivityList(parent, id, data) {
    var sec = section(id, data.title || blockLabel(id), data.intro || "Actividad de práctica.");
    var list = el("div", "cards-grid");
    (data.items || []).forEach(function (item, index) { renderMultipleChoice(list, id, item, id + index); });
    sec.appendChild(list); parent.appendChild(sec);
  }

  function renderEmparejar(parent, data) {
    var sec = section("emparejar", data.title || "Emparejar", data.intro || "Relaciona expresiones con intenciones comunicativas.");
    var items = data.items || [];
    var matched = {};
    var selectedLeft = null;
    var selectedRight = null;
    var status = el("p", "feedback", "Selecciona una expresión y después su intención.");
    var grid = el("div", "match-grid");
    var left = el("div", "match-column");
    var right = el("div", "match-column");
    function shuffleCopy(list) {
      var copy = list.slice();
      for (var i = copy.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
      }
      return copy;
    }
    function countMatched() {
      return Object.keys(matched).length;
    }
    function resetSelection() {
      selectedLeft = null;
      selectedRight = null;
      grid.querySelectorAll(".match-option").forEach(function (node) { node.classList.remove("selected"); });
    }
    function tryMatch() {
      if (!selectedLeft || !selectedRight) return;
      if (selectedLeft.dataset.id === selectedRight.dataset.id) {
        matched[selectedLeft.dataset.id] = true;
        selectedLeft.classList.add("matched");
        selectedRight.classList.add("matched");
        selectedLeft.disabled = true;
        selectedRight.disabled = true;
        status.className = "feedback ok";
        status.textContent = "Pareja correcta. " + countMatched() + " / " + items.length + " completadas.";
        if (countMatched() >= items.length) mark("emparejar", true);
      } else {
        status.className = "feedback ko";
        status.textContent = "No encaja todavía. Prueba otra intención comunicativa.";
      }
      resetSelection();
    }
    items.forEach(function (item) {
      var btn = el("button", "secondary match-option", item.front);
      btn.type = "button";
      btn.dataset.id = item.id || item.front;
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        if (selectedLeft) selectedLeft.classList.remove("selected");
        selectedLeft = btn;
        btn.classList.add("selected");
        tryMatch();
      });
      left.appendChild(btn);
    });
    shuffleCopy(items).forEach(function (item) {
      var btn = el("button", "secondary match-option", item.back);
      btn.type = "button";
      btn.dataset.id = item.id || item.front;
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        if (selectedRight) selectedRight.classList.remove("selected");
        selectedRight = btn;
        btn.classList.add("selected");
        tryMatch();
      });
      right.appendChild(btn);
    });
    var reset = el("button", "secondary", "Reiniciar emparejado");
    reset.addEventListener("click", function () {
      matched = {};
      status.className = "feedback";
      status.textContent = "Selecciona una expresión y después su intención.";
      clear(grid);
      renderEmparejar(parent, data);
      sec.remove();
      updateRouteClasses(0);
    });
    grid.appendChild(left);
    grid.appendChild(right);
    sec.appendChild(status);
    sec.appendChild(grid);
    sec.appendChild(reset);
    parent.appendChild(sec);
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
    var prompt = el("div", "text-box", state.prompt || prompts[Math.floor(Math.random() * prompts.length)] || "Escribe una producción breve.");
    var refresh = el("button", "secondary", "Otro prompt");
    refresh.addEventListener("click", function () {
      state.prompt = prompts[Math.floor(Math.random() * prompts.length)] || prompt.textContent;
      prompt.textContent = state.prompt;
      save();
    });
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
    var copy = el("button", "secondary", "Copiar texto");
    var result = el("div", "feedback"); result.hidden = true;
    function normalize(value) {
      return String(value || "").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, "'");
    }
    review.addEventListener("click", function () {
      var checked = Object.keys(state.checks.reto || {}).filter(function (key) { return state.checks.reto[key]; }).length;
      var text = normalize(textarea.value);
      var checks = [
        { label: "un saludo", ok: /\b(bonjour|bonsoir|salut)\b/.test(text) },
        { label: "tu nombre", ok: /je m[' ]?appelle/.test(text) },
        { label: "una frase personal", ok: /\b(je suis|j[' ]?habite|j[' ]?etudie|je travaille|je cherche)\b/.test(text) },
        { label: "una petición educada", ok: /(pouvez[- ]vous|s[' ]?il vous plait|combien ca coute|ou est|excusez[- ]moi|je voudrais)/.test(text) }
      ];
      var found = checks.filter(function (item) { return item.ok; }).map(function (item) { return item.label; });
      var missing = checks.filter(function (item) { return !item.ok; }).map(function (item) { return item.label; });
      var enoughText = textarea.value.trim().length >= 20;
      result.hidden = false;
      result.className = "feedback " + (enoughText && checked > 0 && missing.length <= 1 ? "ok" : "ko");
      result.textContent = enoughText && checked > 0
        ? (missing.length ? "Has incluido " + (found.join(", ") || "algunos elementos") + ". Podrías añadir: " + missing.join(", ") + "." : "Orientación local: tu respuesta incluye los elementos básicos esperados. Practícala ahora en voz alta.")
        : "Añade algo más de texto y revisa la lista antes de terminar.";
      state.retoFeedback = result.textContent;
      save();
      if (enoughText && checked > 0) mark("reto", true);
    });
    copy.addEventListener("click", function () {
      if (!navigator.clipboard) {
        result.hidden = false;
        result.className = "feedback";
        result.textContent = "Selecciona el texto manualmente para copiarlo.";
        return;
      }
      navigator.clipboard.writeText(textarea.value || "").then(function () {
        result.hidden = false;
        result.className = "feedback ok";
        result.textContent = "Texto copiado al portapapeles.";
      }).catch(function () {
        result.hidden = false;
        result.className = "feedback";
        result.textContent = "No se pudo copiar automáticamente. Puedes seleccionar el texto manualmente.";
      });
    });
    if (state.retoFeedback) {
      result.hidden = false;
      result.textContent = state.retoFeedback;
    }
    var actions = el("div", "actions");
    actions.appendChild(refresh);
    actions.appendChild(review);
    actions.appendChild(copy);
    sec.appendChild(prompt); sec.appendChild(textarea); sec.appendChild(checklist); sec.appendChild(actions); sec.appendChild(result); parent.appendChild(sec);
  }

  function assessmentData() {
    var ids = blockIds().filter(function (id) { return id !== "autoevaluacion" && id !== "informe"; });
    var practiced = ids.filter(isDone).length;
    var practiceScore = ids.length ? Math.round((practiced / ids.length) * 55) : 0;
    var diag = state.scores.diagnostico;
    var quizScore = diag && diag.total ? Math.round((diag.correctas / diag.total) * 25) : 0;
    var retoChecks = Object.keys(state.checks.reto || {}).filter(function (key) { return state.checks.reto[key]; }).length;
    var oralChecks = Object.keys(state.checks.oral || {}).reduce(function (total, itemKey) {
      return total + Object.keys(state.checks.oral[itemKey] || {}).filter(function (key) { return state.checks.oral[itemKey][key]; }).length;
    }, 0);
    var confidenceScore = Math.min(20, retoChecks * 4 + Math.min(oralChecks, 8));
    var total = Math.min(100, practiceScore + quizScore + confidenceScore);
    var level = total >= 80 ? "Preparado/a para repasar con autonomía" : total >= 55 ? "Buen avance, conviene afianzar" : "Necesita repaso guiado";
    var advice = total >= 80 ? "Cierra con el informe local o repite los bloques que quieras reforzar." : total >= 55 ? "Repite lectura, audición o situaciones antes de guardar el informe." : "Empieza por diagnóstico, flashcards y situaciones en recorrido guiado.";
    return { practiced: practiced, practiceTotal: ids.length, total: total, level: level, advice: advice, quiz: diag, retoChecks: retoChecks, oralChecks: oralChecks };
  }

  function renderAutoevaluacion() {
    var target = byId("autoevaluacion-content");
    if (!target || !content) return;
    clear(target);
    var data = assessmentData();
    var level = el("article", "summary-card");
    level.appendChild(el("h3", null, data.level));
    level.appendChild(el("p", null, data.total + " / 100"));
    var blocks = el("article", "summary-card");
    blocks.appendChild(el("h3", null, "Bloques practicados"));
    blocks.appendChild(el("p", null, data.practiced + " / " + data.practiceTotal));
    var diag = el("article", "summary-card");
    diag.appendChild(el("h3", null, "Diagnóstico"));
    diag.appendChild(el("p", null, data.quiz ? data.quiz.correctas + " / " + data.quiz.total : "Pendiente"));
    var advice = el("article", "summary-card summary-card-wide");
    advice.appendChild(el("h3", null, "Orientación"));
    advice.appendChild(el("p", null, data.advice));
    target.appendChild(level);
    target.appendChild(blocks);
    target.appendChild(diag);
    target.appendChild(advice);
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
    var data = assessmentData();
    target.appendChild(el("h3", null, "Informe orientativo local"));
    target.appendChild(el("p", "muted", "No se envía información a ningún servidor. Puedes imprimir esta vista o guardarla como PDF desde el navegador."));
    target.appendChild(el("p", null, "Resultado orientativo: " + data.level + " (" + data.total + " / 100)."));
    target.appendChild(el("p", null, "Bloques practicados: " + data.practiced + " / " + data.practiceTotal + "."));
    if (data.quiz) target.appendChild(el("p", null, "Diagnóstico: " + data.quiz.correctas + " / " + data.quiz.total + "."));
    var list = el("div", "report-list");
    blockIds().forEach(function (id) {
      var row = el("p", null, blockLabel(id) + ": " + (isDone(id) ? "realizado" : "pendiente"));
      list.appendChild(row);
    });
    target.appendChild(list);
    if (state.prompt) target.appendChild(el("div", "text-box", "Situación:\n" + state.prompt));
    if (state.text) target.appendChild(el("div", "text-box", "Producción escrita local:\n" + state.text));
    if (state.retoFeedback) target.appendChild(el("p", "muted", "Revisión local: " + state.retoFeedback));
  }

  function renderInformeBlock(parent, data) {
    var sec = section("informe", data.title || "Informe", data.intro || "Vista local imprimible. No envía datos.");
    var box = el("div", "card"); box.id = "informe-content";
    var print = el("button", "primary no-print", "Imprimir o guardar PDF");
    print.addEventListener("click", function () { window.print(); });
    sec.appendChild(box); sec.appendChild(print); parent.appendChild(sec); renderInforme();
  }

  function renderProgressDock(root) {
    var dock = el("aside", "global-progress-dock no-print");
    dock.setAttribute("aria-label", "Progreso global local");
    var inner = el("div", "container global-progress-inner");

    var prev = el("button", "secondary compact-button", "Anterior");
    prev.id = "dock-prev";
    prev.addEventListener("click", function () { goToRelativeBlock(-1); });
    inner.appendChild(prev);

    var current = el("div", "dock-current");
    var label = el("strong", "dock-block-label", "Bloque 1 de " + blockIds().length);
    label.id = "dock-block-label";
    var title = el("span", "small muted dock-block-title", blockLabel(routeIds()[0] || ""));
    title.id = "dock-block-title";
    current.appendChild(label);
    current.appendChild(title);
    inner.appendChild(current);

    var wrap = el("div", "progress-wrap");
    wrap.id = "global-progress-wrap";
    wrap.setAttribute("role", "progressbar");
    wrap.setAttribute("aria-label", "Progreso general del recurso");
    wrap.setAttribute("aria-valuemin", "0");
    wrap.setAttribute("aria-valuemax", "100");
    var bar = el("div", "progress-bar");
    bar.id = "global-progress-bar";
    wrap.appendChild(bar);
    inner.appendChild(wrap);
    var text = el("p", "small muted progress-copy");
    text.appendChild(el("span", null, "Completado: "));
    var pct = el("strong", null, "0%");
    pct.id = "global-progress-text";
    text.appendChild(pct);
    text.appendChild(document.createTextNode(" · "));
    var count = el("span", null, "0 / 0 bloques");
    count.id = "global-progress-count";
    text.appendChild(count);
    inner.appendChild(text);

    var next = el("button", "primary compact-button", "Siguiente");
    next.id = "dock-next";
    next.addEventListener("click", function () { goToRelativeBlock(1); });
    inner.appendChild(next);

    var reset = el("button", "secondary compact-button", "Borrar progreso");
    reset.addEventListener("click", resetProgress);
    inner.appendChild(reset);
    dock.appendChild(inner);
    root.appendChild(dock);
  }

  function renderHero(root) {
    var meta = content.meta || {};
    var ui = meta.ui || {};
    var header = el("header", "site-header kit-header");
    var headerInner = el("div", "container kit-hero");
    var main = el("div", "kit-hero-main");
    var eyebrow = ui.badge || "El Formador Junior";
    if (!ui.badge && meta.level) eyebrow += " · Nivel " + meta.level;
    if (!ui.badge && meta.audience) eyebrow += " · " + meta.audience;
    main.appendChild(el("p", "eyebrow", eyebrow));
    main.appendChild(el("h1", null, config.title || meta.title || "Recurso A1"));
    var description = ui.description || meta.description || "Kit interactivo para repasar vocabulario funcional, gramática útil y situaciones comunicativas de nivel A1. El progreso queda solo en este navegador.";
    main.appendChild(el("p", "lead", description));
    var actions = el("div", "actions hero-actions no-print");
    var quick = el("button", "primary", "Repaso rápido");
    quick.appendChild(el("span", null, "20-30 min · 6 pasos"));
    quick.addEventListener("click", function () { setGuidedMode(true, "quick"); });
    var full = el("button", "secondary", "Recorrido completo");
    full.appendChild(el("span", null, "60 min · 12 pasos"));
    full.addEventListener("click", function () { setGuidedMode(true, "full"); });
    var map = el("button", "secondary", "Ver mapa de bloques");
    map.addEventListener("click", function () { scrollToBlock("mapa"); });
    actions.appendChild(quick);
    actions.appendChild(full);
    actions.appendChild(map);
    if (blocks().informe) {
      var report = el("button", "secondary", "Informe local");
      report.addEventListener("click", function () { scrollToBlock("informe"); });
      actions.appendChild(report);
    }
    main.appendChild(actions);

    var card = el("aside", "kit-card");
    card.appendChild(el("h2", null, "Ficha breve"));
    card.appendChild(el("p", null, "Recurso complementario de práctica y autoevaluación formativa."));
    card.appendChild(el("p", null, "Privacidad: no hay login, analítica ni envío de respuestas."));
    var progress = el("div", "inline-progress");
    progress.appendChild(el("strong", null, "Progreso local"));
    var wrap = el("div", "progress-wrap mini-progress");
    var bar = el("div", "progress-bar");
    bar.id = "global-progress-bar-hero";
    wrap.appendChild(bar);
    progress.appendChild(wrap);
    card.appendChild(progress);

    headerInner.appendChild(main);
    headerInner.appendChild(card);
    header.appendChild(headerInner);
    root.appendChild(header);
  }

  function renderNav(root) {
    var nav = el("nav", "app-nav no-print");
    var navInner = el("div", "container nav-inner");
    var links = el("div", "nav-links");
    var map = el("a", null, "Mapa");
    map.href = "#mapa";
    map.addEventListener("click", function (event) {
      event.preventDefault();
      scrollToBlock("mapa");
    });
    var intro = el("a", null, "Cómo usar");
    intro.href = "#objetivo";
    intro.addEventListener("click", function (event) {
      event.preventDefault();
      scrollToBlock("objetivo");
    });
    links.appendChild(intro);
    links.appendChild(map);
    blockIds().forEach(function (id) {
      var a = el("a", null, blockLabel(id));
      a.href = "#" + id;
      a.addEventListener("click", function (event) {
        event.preventDefault();
        scrollToBlock(id);
      });
      links.appendChild(a);
    });
    var jump = document.createElement("select");
    jump.className = "block-jump";
    jump.setAttribute("aria-label", "Ir a un bloque");
    var first = document.createElement("option");
    first.value = "";
    first.textContent = "Ir a...";
    jump.appendChild(first);
    [{ id: "objetivo", label: "Cómo usar esta app" }, { id: "mapa", label: "Mapa de bloques" }].concat(blockIds().map(function (id) {
      return { id: id, label: blockLabel(id) };
    })).forEach(function (item) {
      var option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      jump.appendChild(option);
    });
    jump.addEventListener("change", function () {
      if (jump.value) scrollToBlock(jump.value);
      jump.value = "";
    });
    navInner.appendChild(links);
    navInner.appendChild(jump);
    nav.appendChild(navInner);
    root.appendChild(nav);
  }

  function renderUseGuide(parent) {
    var sec = el("section", "panel block-section intro-section");
    sec.id = "objetivo";
    var head = el("div", "block-header");
    var wrap = el("div");
    wrap.appendChild(el("p", "eyebrow block-number", "Bloque 0"));
    wrap.appendChild(el("h2", null, "Cómo usar esta app"));
    wrap.appendChild(el("p", "muted", "Este recurso sirve para repasar de forma rápida y práctica. Elige un recorrido y avanza siempre con los botones de la barra inferior."));
    head.appendChild(wrap);
    sec.appendChild(head);

    var choices = el("div", "guided-choice-grid");
    var quick = el("button", "primary guided-choice", "Repaso rápido");
    quick.appendChild(el("span", null, "20-30 min · 6 pasos"));
    quick.addEventListener("click", function () { setGuidedMode(true, "quick"); });
    var full = el("button", "secondary guided-choice", "Recorrido completo");
    full.appendChild(el("span", null, "60 min · 12 pasos"));
    full.addEventListener("click", function () { setGuidedMode(true, "full"); });
    choices.appendChild(quick);
    choices.appendChild(full);
    sec.appendChild(choices);

    var steps = el("ol", "reading-steps");
    [
      ["Empieza con el diagnóstico", "Detecta qué conviene repasar antes de practicar."],
      ["Repasa frases y estructuras", "Usa flashcards y gramática para preparar las tareas."],
      ["Practica situaciones", "Lee, escucha, elige respuestas y prepara producción oral o escrita."],
      ["Cierra con tu informe local", "Consulta o imprime una síntesis orientativa sin enviar datos."]
    ].forEach(function (item) {
      var row = el("li", "reading-step");
      var body = el("div");
      body.appendChild(el("h3", null, item[0]));
      body.appendChild(el("p", "muted", item[1]));
      row.appendChild(body);
      steps.appendChild(row);
    });
    sec.appendChild(steps);
    parent.appendChild(sec);
  }

  function renderMap(parent) {
    var sec = el("section", "panel block-map-section no-print");
    sec.id = "mapa";
    var head = el("div", "block-header");
    var wrap = el("div");
    wrap.appendChild(el("p", "eyebrow", "Mapa de bloques"));
    wrap.appendChild(el("h2", null, "Elige cómo continuar"));
    wrap.appendChild(el("p", "muted", "Abre un bloque concreto o usa el recorrido guiado. Puedes volver al mapa cuando lo necesites."));
    head.appendChild(wrap);
    sec.appendChild(head);
    var grid = el("div", "block-map-grid");
    blockIds().forEach(function (id, index) {
      var data = blocks()[id] || {};
      var card = el("article", "block-map-card");
      card.setAttribute("data-map-card", id);
      var body = el("div", "block-map-card-body");
      body.appendChild(el("span", "step-number", String(index + 1)));
      body.appendChild(el("h3", null, data.title || blockLabel(id)));
      body.appendChild(el("p", "muted", blockHelp(id, data)));
      card.appendChild(body);
      var status = el("span", "status-pill", isDone(id) ? "Realizado" : "Pendiente");
      status.setAttribute("data-status-for", id);
      card.appendChild(status);
      var btn = el("button", "secondary map-button", "Abrir bloque");
      btn.addEventListener("click", function () { scrollToBlock(id); });
      card.appendChild(btn);
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    parent.appendChild(sec);
  }

  var guided = { active: false, ids: [], index: 0 };
  function guidedIds(mode) {
    var ids = routeIds();
    if (mode === "quick") {
      var quick = ["objetivo", "diagnostico", "flashcards", "situaciones", "reto", "informe"];
      var filtered = quick.filter(function (id) { return ids.indexOf(id) !== -1; });
      return filtered.length ? filtered : ids.slice(0, Math.min(5, ids.length));
    }
    return ids;
  }
  function setGuidedMode(active, mode) {
    guided.active = active;
    guided.ids = guidedIds(mode || "full");
    guided.index = 0;
    currentBlockId = guided.ids[0] || currentBlockId;
    document.body.classList.toggle("guided-mode", active);
    updateGuidedView(true);
  }
  function updateGuidedView(scroll) {
    var activeId = guided.ids[guided.index];
    if (activeId) currentBlockId = activeId;
    routeIds().concat(["mapa"]).forEach(function (id) {
      var target = byId(id);
      if (target) target.classList.toggle("guided-active", guided.active && id === activeId);
    });
    var status = byId("guided-status");
    if (status) status.textContent = guided.active ? "Paso " + (guided.index + 1) + " de " + guided.ids.length + ": " + blockLabel(activeId) : "Recorrido guiado";
    var prev = byId("guided-prev");
    var next = byId("guided-next");
    if (prev) prev.disabled = guided.index === 0;
    if (next) next.textContent = guided.index >= guided.ids.length - 1 ? "Ver todos" : "Siguiente";
    updateNavigationUi();
    if (guided.active && scroll) alignRouteViewport(activeId);
  }
  function renderGuidedToolbar(root) {
    var bar = el("div", "guided-toolbar no-print");
    var inner = el("div", "container guided-toolbar-inner");
    var prev = el("button", "secondary", "Anterior");
    prev.id = "guided-prev";
    var status = el("strong", "guided-status", "Recorrido guiado");
    status.id = "guided-status";
    var next = el("button", "primary", "Siguiente");
    next.id = "guided-next";
    var exit = el("button", "secondary", "Ver todos");
    prev.addEventListener("click", function () {
      goToRelativeBlock(-1);
    });
    next.addEventListener("click", function () {
      if (guided.index >= guided.ids.length - 1) {
        guided.active = false;
        document.body.classList.remove("guided-mode");
        updateGuidedView(false);
        scrollToBlock("mapa");
        return;
      }
      goToRelativeBlock(1);
    });
    exit.addEventListener("click", function () {
      guided.active = false;
      document.body.classList.remove("guided-mode");
      updateGuidedView(false);
      scrollToBlock("mapa");
    });
    inner.appendChild(prev);
    inner.appendChild(status);
    inner.appendChild(next);
    inner.appendChild(exit);
    bar.appendChild(inner);
    root.appendChild(bar);
  }

  function renderShell(root) {
    clear(root);
    currentBlockId = routeIds()[0] || "";
    document.body.classList.add("route-stepper");
    var main = el("main", "container section-stack");
    renderHero(root);
    renderNav(root);
    root.appendChild(main);
    renderUseGuide(main);
    renderMap(main);
    var blocks = content.blocks || {};
    if (blocks.diagnostico) renderDiagnostico(main, blocks.diagnostico);
    if (blocks.flashcards) renderFlashcards(main, blocks.flashcards);
    if (blocks.gramatica) renderGramatica(main, blocks.gramatica);
    if (blocks.lectura) renderPagedActivityList(main, "lectura", blocks.lectura);
    if (blocks.audicion) renderPagedActivityList(main, "audicion", blocks.audicion);
    if (blocks.emparejar) renderEmparejar(main, blocks.emparejar);
    if (blocks.situaciones) renderPagedActivityList(main, "situaciones", blocks.situaciones);
    if (blocks.oral) renderOral(main, blocks.oral);
    if (blocks.reto) renderReto(main, blocks.reto);
    if (blocks.autoevaluacion) renderAuto(main, blocks.autoevaluacion);
    if (blocks.informe) renderInformeBlock(main, blocks.informe);
    renderProgressDock(root);
    updateProgressUi();
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
      .then(function (json) { content = json; document.documentElement.lang = config.lang || json.meta.lang || "es"; applyResourceTheme(); renderShell(root); })
      .catch(function () {
        var fallback = config.contentGlobal && global[config.contentGlobal];
        if (fallback) {
          content = fallback;
          document.documentElement.lang = config.lang || fallback.meta.lang || "es";
          applyResourceTheme();
          renderShell(root);
          return;
        }
        clear(root);
        root.appendChild(el("div", "container panel", "No se pudo cargar el contenido del recurso."));
      });
  };

  global.FormadorEngine = Engine;
})(window);

