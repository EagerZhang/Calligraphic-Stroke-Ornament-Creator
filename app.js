(function () {
  "use strict";

  const VIEW_W = 800;
  const VIEW_H = 560;
  const LEFT_W = VIEW_W / 2;

  const canvas = document.getElementById("canvas");
  const layerShapes = document.getElementById("layer-shapes");
  const layerMirrors = document.getElementById("layer-mirrors");

  let nextId = 1;
  /** @type {{ id: number, kind: string, x: number, y: number, rotation: number, scale: number }[]} */
  const items = [];

  /** @type {number | null} */
  let selectedId = null;

  /** @type {number | null} */
  let hoveredId = null;

  const inspectorHint = document.getElementById("inspector-hint");
  const inspectorControls = document.getElementById("inspector-controls");
  const propScale = document.getElementById("prop-scale");
  const propRotation = document.getElementById("prop-rotation");
  const propScaleVal = document.getElementById("prop-scale-val");
  const propRotationVal = document.getElementById("prop-rotation-val");
  const removeShapeWrap = document.getElementById("remove-shape-wrap");

  const SVG_NS = "http://www.w3.org/2000/svg";

  function mirrorX(x) {
    return VIEW_W - x;
  }

  function getShapeDef(kind) {
    return window.ORNAMENT_SHAPES && window.ORNAMENT_SHAPES[kind];
  }

  function shapeDefinition(kind) {
    const g = document.createElementNS(SVG_NS, "g");
    const def = getShapeDef(kind);
    const fallback = `<circle cx="0" cy="0" r="20" fill="currentColor" />`;
    if (!def || !def.canvas) {
      g.innerHTML = fallback;
      return g;
    }
    const c = def.canvas;
    if (c.kind === "sourcePath") {
      const inner = document.createElementNS(SVG_NS, "g");
      const cx = c.sourceWidth / 2;
      const cy = c.sourceHeight / 2;
      const scale = c.targetSize / c.sourceHeight;
      inner.setAttribute("transform", `translate(${-cx} ${-cy}) scale(${scale})`);
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", c.pathD);
      path.setAttribute("fill", c.fill != null ? c.fill : "currentColor");
      inner.appendChild(path);
      g.appendChild(inner);
      return g;
    }
    if (c.kind === "fragment") {
      g.innerHTML = c.html;
      return g;
    }
    g.innerHTML = fallback;
    return g;
  }

  function buildPalette() {
    const grid = document.getElementById("palette-grid");
    const order = window.ORNAMENT_SHAPE_ORDER;
    const shapes = window.ORNAMENT_SHAPES;
    if (!grid || !order || !shapes) return;
    grid.replaceChildren();
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      const entry = shapes[id];
      if (!entry) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-item";
      btn.dataset.shape = id;
      btn.draggable = true;
      btn.title = entry.title || entry.label;
      btn.setAttribute("aria-label", entry.label);
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", entry.palette.viewBox);
      svg.setAttribute("width", "48");
      svg.setAttribute("height", "48");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = entry.palette.innerHTML;
      btn.appendChild(svg);
      grid.appendChild(btn);
    }
  }

  function setGroupTransform(el, x, y, rotationDeg, flipX, scale) {
    const s = scale > 0 ? scale : 1;
    if (flipX) {
      el.setAttribute(
        "transform",
        `translate(${x} ${y}) scale(-1 1) rotate(${rotationDeg}) scale(${s})`
      );
    } else {
      el.setAttribute(
        "transform",
        `translate(${x} ${y}) rotate(${rotationDeg}) scale(${s})`
      );
    }
  }

  function syncInspector() {
    if (!inspectorControls || !inspectorHint) return;
    const item = selectedId != null ? findItem(selectedId) : null;
    if (!item) {
      inspectorHint.hidden = false;
      inspectorControls.classList.add("inspector-controls--passive");
      inspectorControls.setAttribute("aria-hidden", "true");
      inspectorControls.setAttribute("inert", "");
      if (removeShapeWrap) removeShapeWrap.hidden = true;
      return;
    }
    inspectorHint.hidden = true;
    inspectorControls.classList.remove("inspector-controls--passive");
    inspectorControls.removeAttribute("aria-hidden");
    inspectorControls.removeAttribute("inert");
    if (removeShapeWrap) removeShapeWrap.hidden = false;
    if (propScale && propScaleVal) {
      const pct = Math.round(item.scale * 100);
      propScale.value = String(clamp(pct, 25, 300));
      propScaleVal.textContent = `${pct}%`;
    }
    if (propRotation && propRotationVal) {
      const r = Math.round(item.rotation);
      propRotation.value = String(clamp(r, -180, 180));
      propRotationVal.textContent = `${r}°`;
    }
  }

  function setSelectedId(id) {
    selectedId = id;
    render();
  }

  function clearSelection() {
    selectedId = null;
    hoveredId = null;
    render();
  }

  function removeSelectedShape() {
    if (selectedId == null) return;
    const idx = items.findIndex((it) => it.id === selectedId);
    if (idx === -1) return;
    const removedId = selectedId;
    items.splice(idx, 1);
    selectedId = null;
    if (hoveredId === removedId) hoveredId = null;
    render();
  }

  function render() {
    if (selectedId != null && !findItem(selectedId)) {
      selectedId = null;
    }

    layerShapes.replaceChildren();
    layerMirrors.replaceChildren();

    for (const item of items) {
      const mx = mirrorX(item.x);
      const dimOthers = hoveredId !== null && item.id !== hoveredId;

      const gPrimary = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gPrimary.setAttribute(
        "class",
        "shape" + (item.id === selectedId ? " shape--selected" : "") + (dimOthers ? " shape--dimmed" : "")
      );
      gPrimary.dataset.id = String(item.id);
      const innerP = shapeDefinition(item.kind);
      innerP.setAttribute("class", "shape-graphic");
      gPrimary.appendChild(innerP);
      setGroupTransform(gPrimary, item.x, item.y, item.rotation, false, item.scale);
      layerShapes.appendChild(gPrimary);

      // Create dotted outline around the selected shape's actual ink bounds.
      if (item.id === selectedId) {
        try {
          const bb = innerP.getBBox();
          if (bb.width > 0 && bb.height > 0) {
            const pad = 1;
            const rect = document.createElementNS(SVG_NS, "rect");
            rect.setAttribute("class", "selection-outline");
            rect.setAttribute("x", String(bb.x - pad));
            rect.setAttribute("y", String(bb.y - pad));
            rect.setAttribute("width", String(bb.width + pad * 2));
            rect.setAttribute("height", String(bb.height + pad * 2));
            rect.setAttribute("fill", "none");
            gPrimary.appendChild(rect);
          }
        } catch (e) {
          /* ignore getBBox errors */
        }
      }

      if (Math.abs(item.x - mx) > 0.5) {
        const gMirror = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gMirror.setAttribute(
          "class",
          "shape-mirror" + (dimOthers ? " shape-mirror--dimmed" : "")
        );
        const innerM = shapeDefinition(item.kind);
        innerM.setAttribute("class", "shape-graphic");
        gMirror.appendChild(innerM);
        setGroupTransform(gMirror, mx, item.y, item.rotation, true, item.scale);
        layerMirrors.appendChild(gMirror);
      }

      // Hover tracking for pale non-hovered shapes.
      gPrimary.addEventListener("pointerenter", () => {
        if (hoveredId !== item.id) {
          hoveredId = item.id;
          render();
        }
      });
      gPrimary.addEventListener("pointerleave", (e) => {
        if (dragCanvas && dragCanvas.id === item.id) return;
        const to = /** @type {Node | null} */ (e.relatedTarget);
        if (to && layerShapes.contains(to)) {
          const other = to.closest && to.closest("g.shape");
          if (other && other !== gPrimary) return;
        }
        if (hoveredId === item.id) {
          hoveredId = null;
          render();
        }
      });
    }

    syncInspector();
  }

  function addShape(kind, x, y) {
    const id = nextId++;
    // Only allow placing/dragging the primary shape on the left half.
    // The right side is generated by mirroring.
    if (x > LEFT_W + 0.0001) return;
    items.push({
      id,
      kind,
      x: clamp(x, 0, LEFT_W),
      y: clamp(y, 0, VIEW_H),
      rotation: 0,
      scale: 1,
    });
    setSelectedId(id);
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function svgPointFromClient(clientX, clientY) {
    const pt = canvas.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = canvas.getScreenCTM();
    if (!ctm) return { x: VIEW_W / 2, y: VIEW_H / 2 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  /** @type {{ id: number, offsetX: number, offsetY: number, el: Element } | null} */
  let dragCanvas = null;

  function findItem(id) {
    return items.find((i) => i.id === id) || null;
  }

  function onPointerDownShape(e) {
    const g = e.target.closest("g.shape");
    if (!g || !layerShapes.contains(g)) return;
    const id = Number(g.dataset.id);
    const item = findItem(id);
    if (!item) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    const { x, y } = svgPointFromClient(e.clientX, e.clientY);
    dragCanvas = { id, offsetX: x - item.x, offsetY: y - item.y, el: g };
    g.setPointerCapture(e.pointerId);
  }

  function onPointerMoveShape(e) {
    if (!dragCanvas) return;
    const item = findItem(dragCanvas.id);
    if (!item) return;
    const { x, y } = svgPointFromClient(e.clientX, e.clientY);
    item.x = clamp(x - dragCanvas.offsetX, 0, LEFT_W);
    item.y = clamp(y - dragCanvas.offsetY, 0, VIEW_H);
    render();
  }

  function onPointerUpShape(e) {
    if (!dragCanvas) return;
    const { el } = dragCanvas;
    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragCanvas = null;
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (e.target.closest && e.target.closest("g.shape")) return;
    clearSelection();
  });

  layerShapes.addEventListener("pointerdown", onPointerDownShape);
  window.addEventListener("pointermove", onPointerMoveShape);
  window.addEventListener("pointerup", onPointerUpShape);
  window.addEventListener("pointercancel", onPointerUpShape);

  function onInspectorInput() {
    const item = selectedId != null ? findItem(selectedId) : null;
    if (!item || !propScale || !propRotation) return;
    item.scale = clamp(Number(propScale.value) / 100, 0.25, 3);
    item.rotation = clamp(Number(propRotation.value), -180, 180);
    if (propScaleVal) propScaleVal.textContent = `${Math.round(item.scale * 100)}%`;
    if (propRotationVal) propRotationVal.textContent = `${Math.round(item.rotation)}°`;
    render();
  }

  if (propScale) propScale.addEventListener("input", onInspectorInput);
  if (propRotation) propRotation.addEventListener("input", onInspectorInput);

  /** @type {{ kind: string } | null} */
  let dragFromPalette = null;

  /** @type {{ kind: string, startX: number, startY: number, dragging?: boolean } | null} */
  let palettePointer = null;

  const paletteGrid = document.getElementById("palette-grid");
  buildPalette();

  if (paletteGrid) {
    paletteGrid.addEventListener("dragstart", (e) => {
      const btn = e.target.closest(".palette-item");
      if (!btn || !paletteGrid.contains(btn)) return;
      const kind = btn.dataset.shape;
      if (!kind) return;
      dragFromPalette = { kind };
      palettePointer = null;
      e.dataTransfer?.setData("text/plain", kind);
      e.dataTransfer.effectAllowed = "copy";
    });
    paletteGrid.addEventListener("dragend", () => {
      dragFromPalette = null;
    });
    paletteGrid.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".palette-item");
      if (!btn || !paletteGrid.contains(btn)) return;
      if (e.button !== 0) return;
      const kind = btn.dataset.shape;
      if (!kind) return;
      palettePointer = { kind, startX: e.clientX, startY: e.clientY };
    });
  }

  canvas.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  canvas.addEventListener("drop", (e) => {
    e.preventDefault();
    palettePointer = null;
    const kind =
      e.dataTransfer?.getData("text/plain") || dragFromPalette?.kind;
    if (!kind) return;
    const { x, y } = svgPointFromClient(e.clientX, e.clientY);
    addShape(kind, x, y);
  });

  window.addEventListener("pointermove", (e) => {
    if (!palettePointer) return;
    const dx = e.clientX - palettePointer.startX;
    const dy = e.clientY - palettePointer.startY;
    if (Math.hypot(dx, dy) > 6) {
      palettePointer.dragging = true;
    }
  });

  window.addEventListener("pointerup", (e) => {
    if (!palettePointer) return;
    const { kind, dragging } = palettePointer;
    palettePointer = null;
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      const { x, y } = svgPointFromClient(e.clientX, e.clientY);
      addShape(kind, x, y);
    }
  });

  function exportTimestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function downloadPng() {
    const scale = 2;
    const outW = VIEW_W * scale;
    const outH = VIEW_H * scale;
    const rs = getComputedStyle(document.documentElement);
    const surface = rs.getPropertyValue("--surface").trim() || "#ffffff";
    const gridStroke = rs.getPropertyValue("--grid-stroke").trim() || "#d1d1d6";
    const axisColor = rs.getPropertyValue("--axis").trim() || "rgba(0, 122, 255, 0.45)";
    const shapeColor =
      rs.getPropertyValue("--ornament-shape-color").trim() || "#000000";
    // Export should ignore both hover dimming and mirror fading.
    const mirrorOp = "1";

    const svgEl = /** @type {SVGSVGElement} */ (canvas.cloneNode(true));
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgEl.setAttribute("width", String(outW));
    svgEl.setAttribute("height", String(outH));
    svgEl
      .querySelectorAll(".selection-outline, .selection-ring")
      .forEach((el) => el.remove());

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", surface);
    svgEl.insertBefore(bg, svgEl.firstChild);

    const gridPath = svgEl.querySelector("#grid path");
    if (gridPath) {
      gridPath.setAttribute("stroke", gridStroke);
    }

    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = `
      .axis-y { stroke: ${axisColor}; }
      .layer.shapes .shape { color: ${shapeColor}; }
      .layer.mirrors .shape-mirror { opacity: ${mirrorOp}; color: ${shapeColor}; }
      .layer.shapes g.shape.shape--dimmed > .shape-graphic { opacity: 1; filter: none; }
      .layer.mirrors .shape-mirror.shape-mirror--dimmed .shape-graphic { opacity: 1; filter: none; }
    `;
    svgEl.insertBefore(styleEl, svgEl.firstChild);

    const svgString = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = document.createElement("canvas");
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = surface;
      ctx.fillRect(0, 0, outW, outH);
      ctx.drawImage(img, 0, 0, outW, outH);
      c.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const a = document.createElement("a");
        const href = URL.createObjectURL(pngBlob);
        a.href = href;
        a.download = `ornament-${exportTimestamp()}.png`;
        a.click();
        URL.revokeObjectURL(href);
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  function clearCanvas() {
    items.length = 0;
    selectedId = null;
    hoveredId = null;
    nextId = 1;
    render();
  }

  function syncShapeColorFromCss() {
    const input = document.getElementById("shape-color");
    if (!input) return;
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--ornament-shape-color")
      .trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      input.value = v;
    }
  }

  function setGlobalShapeColor(hex) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    document.documentElement.style.setProperty("--ornament-shape-color", hex);
  }

  const shapeColorInput = document.getElementById("shape-color");
  if (shapeColorInput) {
    syncShapeColorFromCss();
    shapeColorInput.addEventListener("input", () => {
      setGlobalShapeColor(shapeColorInput.value);
    });
  }

  const clearBtn = document.getElementById("clear-canvas");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => clearCanvas());
  }

  const downloadBtn = document.getElementById("download-png");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => downloadPng());
  }

  const removeShapeBtn = document.getElementById("remove-shape");
  if (removeShapeBtn) {
    removeShapeBtn.addEventListener("click", () => removeSelectedShape());
  }

  render();
})();
