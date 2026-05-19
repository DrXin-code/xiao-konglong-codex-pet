(function () {
  "use strict";

  const CELL_WIDTH = 192;
  const CELL_HEIGHT = 208;
  const CORE_ATLAS = "../spritesheet.png";

  const coreStateIds = [
    "idle",
    "running-right",
    "running-left",
    "waving",
    "jumping",
    "failed",
    "waiting",
    "running",
    "review",
  ];

  const labels = {
    idle: "待机",
    "running-right": "向右移动",
    "running-left": "向左移动",
    waving: "挥手",
    jumping: "跳跃",
    failed: "失败",
    waiting: "等待用户",
    running: "工作中",
    review: "审阅中",
    "long-idle-sleep": "长时间休眠",
    sleepy: "犯困",
    "wake-up": "被叫醒",
    "play-bounce": "娱乐弹跳",
    dance: "左右摇摆",
    celebrate: "庆祝",
    bored: "无聊等待",
    curious: "好奇观察",
    "deep-focus": "专注工作",
    peek: "探头看看",
  };

  const states = Object.fromEntries(
    coreStateIds.map((id, row) => [
      id,
      {
        id,
        label: labels[id],
        kind: "atlas",
        src: CORE_ATLAS,
        row,
        frames: 8,
        frameMs: 140,
      },
    ]),
  );

  Object.assign(states, {
    "long-idle-sleep": stripState("long-idle-sleep", 6, 210),
    sleepy: stripState("sleepy", 5, 180),
    "wake-up": stripState("wake-up", 6, 130),
    "play-bounce": stripState("play-bounce", 8, 120),
    dance: stripState("dance", 4, 140),
    celebrate: stripState("celebrate", 7, 120),
    bored: stripState("bored", 6, 180),
    curious: stripState("curious", 6, 150),
    "deep-focus": stripState("deep-focus", 6, 135),
    peek: stripState("peek", 6, 150),
  });

  const extendedStateIds = [
    "sleepy",
    "long-idle-sleep",
    "wake-up",
    "play-bounce",
    "dance",
    "celebrate",
    "bored",
    "curious",
    "deep-focus",
    "peek",
  ];

  const timings = {
    normal: {
      sleepyMs: 3 * 60 * 1000,
      sleepMs: 10 * 60 * 1000,
      boredMs: 2 * 60 * 1000,
      focusMs: 90 * 1000,
      hoverReviewMs: 1800,
      hoverFocusMs: 6000,
      pressWaitingMs: 700,
      pressBoredMs: 2400,
    },
    demo: {
      sleepyMs: 8 * 1000,
      sleepMs: 18 * 1000,
      boredMs: 10 * 1000,
      focusMs: 12 * 1000,
      hoverReviewMs: 1200,
      hoverFocusMs: 3600,
      pressWaitingMs: 550,
      pressBoredMs: 1800,
    },
  };

  const sprite = document.getElementById("pet-sprite");
  const petWrap = document.getElementById("pet-wrap");
  const demoMode = document.getElementById("demo-mode");
  const currentStateLabel = document.getElementById("current-state");
  const currentReasonLabel = document.getElementById("current-reason");
  const idleAgeLabel = document.getElementById("idle-age");
  const contextStateLabel = document.getElementById("context-state");
  const eventLog = document.getElementById("event-log");
  const coreButtons = document.getElementById("core-buttons");
  const extendedButtons = document.getElementById("extended-buttons");

  const runtime = {
    currentState: "idle",
    reason: "启动待机",
    frame: 0,
    lastFrameAt: 0,
    lastActivityAt: Date.now(),
    lockUntil: 0,
    waitingSince: null,
    taskSince: null,
    hover: false,
    hoverStartedAt: 0,
    dragging: false,
    pointerDownAt: 0,
    pressTimer: null,
    boredTimer: null,
    longPressTriggered: false,
    dragLastX: 0,
    dragLastY: 0,
    dragStartX: 0,
    dragStartY: 0,
    dragMoved: false,
    dragTurns: 0,
    dragTurnWindowStart: 0,
    lastDragDirection: 0,
    suppressClickUntil: 0,
    cancelNextClick: false,
    nextPlayState: 0,
    lastPointerActivityAt: 0,
  };

  const playStates = ["play-bounce", "dance", "peek"];

  createButtons(coreStateIds, coreButtons);
  createButtons(extendedStateIds, extendedButtons);
  bindScenarioButtons();
  bindPetEvents();
  setState("idle", "启动待机");
  requestAnimationFrame(animate);
  window.setInterval(tick, 250);
  window.setInterval(updateStatusText, 1000);

  function stripState(id, frames, frameMs) {
    return {
      id,
      label: labels[id],
      kind: "strip",
      src: `../extras/strips/${id}.png`,
      frames,
      frameMs,
    };
  }

  function createButtons(ids, container) {
    ids.forEach((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.state = id;
      button.textContent = `${labels[id]} / ${id}`;
      button.addEventListener("click", () => {
        noteActivity("手动状态按钮");
        setState(id, "手动触发", { holdMs: 4500, resetFrame: true });
      });
      container.appendChild(button);
    });
  }

  function bindScenarioButtons() {
    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => runAction(button.dataset.action));
    });

    demoMode.addEventListener("change", () => {
      noteActivity("切换计时模式");
      logEvent(
        "计时模式",
        demoMode.checked ? "演示计时已开启" : "真实计时已开启",
      );
    });
  }

  function bindPetEvents() {
    petWrap.addEventListener("pointerenter", () => {
      runtime.hover = true;
      runtime.hoverStartedAt = Date.now();
      if (noteActivity("鼠标悬停")) {
        return;
      }
      setState("curious", "鼠标悬停观察");
    });

    petWrap.addEventListener("pointerleave", () => {
      runtime.hover = false;
      runtime.hoverStartedAt = 0;
      if (Date.now() >= runtime.lockUntil && !runtime.dragging) {
        setState("idle", "鼠标离开", { clearLock: true });
      }
    });

    petWrap.addEventListener("click", () => {
      if (runtime.cancelNextClick || Date.now() < runtime.suppressClickUntil) {
        runtime.cancelNextClick = false;
        return;
      }
      if (noteActivity("点击宠物")) {
        return;
      }
      clearTaskAndWait();
      const state = playStates[runtime.nextPlayState % playStates.length];
      runtime.nextPlayState += 1;
      setState(state, "点击宠物娱乐", { holdMs: 3600, resetFrame: true });
    });

    petWrap.addEventListener("dblclick", () => {
      if (noteActivity("双击宠物")) {
        return;
      }
      clearTaskAndWait();
      setState("celebrate", "双击庆祝", { holdMs: 4200, resetFrame: true });
    });

    petWrap.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      if (noteActivity("按下鼠标")) {
        return;
      }
      runtime.lockUntil = 0;
      clearPressTimers();
      runtime.dragging = true;
      runtime.pointerDownAt = Date.now();
      runtime.dragLastX = event.clientX;
      runtime.dragLastY = event.clientY;
      runtime.dragStartX = event.clientX;
      runtime.dragStartY = event.clientY;
      runtime.dragMoved = false;
      runtime.dragTurns = 0;
      runtime.dragTurnWindowStart = 0;
      runtime.lastDragDirection = 0;
      runtime.longPressTriggered = false;
      startPressTimers();
      petWrap.setPointerCapture(event.pointerId);
    });

    petWrap.addEventListener("pointermove", (event) => {
      if (!runtime.dragging) {
        throttlePointerActivity();
        return;
      }

      if (Date.now() < runtime.lockUntil) {
        return;
      }

      const deltaX = event.clientX - runtime.dragLastX;
      const deltaY = event.clientY - runtime.dragLastY;
      runtime.dragLastX = event.clientX;
      runtime.dragLastY = event.clientY;
      noteActivity("拖动宠物");

      const totalX = event.clientX - runtime.dragStartX;
      const totalY = event.clientY - runtime.dragStartY;
      if (Math.hypot(totalX, totalY) > 8) {
        runtime.dragMoved = true;
        clearPressTimers();
      }

      if (detectShake(deltaX)) {
        clearTaskAndWait();
        setState("failed", "快速左右摇动", { holdMs: 3200, resetFrame: true });
        return;
      }

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (Math.max(absX, absY) < 2) {
        return;
      }

      clearTaskAndWait();
      if (absY > absX * 1.4) {
        setState(
          deltaY < 0 ? "jumping" : "running",
          deltaY < 0 ? "向上拖动" : "向下拖动",
        );
      } else {
        setState(
          deltaX > 0 ? "running-right" : "running-left",
          deltaX > 0 ? "向右拖动" : "向左拖动",
        );
      }
    });

    petWrap.addEventListener("pointerup", (event) => {
      runtime.dragging = false;
      runtime.pointerDownAt = 0;
      clearPressTimers();
      if (runtime.dragMoved || runtime.longPressTriggered) {
        const releasedState = runtime.currentState;
        if (runtime.longPressTriggered) {
          runtime.waitingSince = null;
        }
        runtime.cancelNextClick = true;
        setState(releasedState, "鼠标松开", { holdMs: 1200 });
      }
      petWrap.releasePointerCapture(event.pointerId);
    });

    petWrap.addEventListener("pointercancel", () => {
      runtime.dragging = false;
      runtime.pointerDownAt = 0;
      runtime.waitingSince = null;
      clearPressTimers();
    });

    petWrap.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (noteActivity("右键宠物")) {
        return;
      }
      clearTaskAndWait();
      setState("waving", "右键打招呼", { holdMs: 3200, resetFrame: true });
    });

    petWrap.addEventListener("auxclick", (event) => {
      if (event.button !== 1) {
        return;
      }
      event.preventDefault();
      if (noteActivity("中键宠物")) {
        return;
      }
      clearTaskAndWait();
      setState("jumping", "中键跳跃", { holdMs: 2600, resetFrame: true });
    });

    petWrap.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        if (noteActivity("滚轮宠物")) {
          return;
        }
        clearTaskAndWait();
        if (event.deltaY < 0) {
          setState("review", "滚轮向上审阅", { holdMs: 3000, resetFrame: true });
        } else {
          setState("deep-focus", "滚轮向下专注", {
            holdMs: 3200,
            resetFrame: true,
          });
        }
      },
      { passive: false },
    );

    connectLocalEvents();
    window.addEventListener("keydown", () => noteActivity("键盘输入"));
    window.addEventListener("pointerdown", () => noteActivity("页面点击"));
    window.addEventListener("focus", () => noteActivity("窗口获得焦点"));
  }

  function startPressTimers() {
    const timing = getTiming();
    runtime.pressTimer = window.setTimeout(() => {
      if (!runtime.dragging || runtime.dragMoved) {
        return;
      }
      runtime.longPressTriggered = true;
      clearTaskAndWait();
      runtime.waitingSince = Date.now();
      setState("waiting", "鼠标长按等待", {
        clearLock: true,
        resetFrame: true,
      });
    }, timing.pressWaitingMs);

    runtime.boredTimer = window.setTimeout(() => {
      if (!runtime.dragging || runtime.dragMoved) {
        return;
      }
      runtime.longPressTriggered = true;
      clearTaskAndWait();
      runtime.waitingSince = Date.now() - getTiming().boredMs - 1;
      setState("bored", "鼠标继续长按", {
        clearLock: true,
        resetFrame: true,
      });
    }, timing.pressBoredMs);
  }

  function clearPressTimers() {
    if (runtime.pressTimer) {
      window.clearTimeout(runtime.pressTimer);
      runtime.pressTimer = null;
    }
    if (runtime.boredTimer) {
      window.clearTimeout(runtime.boredTimer);
      runtime.boredTimer = null;
    }
  }

  function detectShake(deltaX) {
    if (Math.abs(deltaX) < 5) {
      return false;
    }

    const now = Date.now();
    const direction = Math.sign(deltaX);
    if (!runtime.dragTurnWindowStart || now - runtime.dragTurnWindowStart > 900) {
      runtime.dragTurnWindowStart = now;
      runtime.dragTurns = 0;
      runtime.lastDragDirection = direction;
      return false;
    }

    if (runtime.lastDragDirection && runtime.lastDragDirection !== direction) {
      runtime.dragTurns += 1;
    }
    runtime.lastDragDirection = direction;

    return runtime.dragTurns >= 4;
  }

  function throttlePointerActivity() {
    const now = Date.now();
    if (now - runtime.lastPointerActivityAt < 700) {
      return;
    }
    runtime.lastPointerActivityAt = now;
    noteActivity("鼠标移动");
  }

  function runAction(action) {
    const now = Date.now();

    if (action !== "force-sleepy" && action !== "force-sleep") {
      noteActivity("场景按钮");
    }

    switch (action) {
      case "start-task":
        runtime.waitingSince = null;
        runtime.taskSince = now;
        setState("running", "任务开始", { clearLock: true });
        break;
      case "finish-task":
        runtime.taskSince = null;
        runtime.waitingSince = null;
        setState("celebrate", "任务成功完成", { holdMs: 4600, resetFrame: true });
        break;
      case "fail-task":
        runtime.taskSince = null;
        runtime.waitingSince = null;
        setState("failed", "任务失败", { holdMs: 4600, resetFrame: true });
        break;
      case "wait-user":
        runtime.taskSince = null;
        runtime.waitingSince = now;
        setState("waiting", "等待用户输入", { clearLock: true });
        break;
      case "stop-waiting":
        runtime.waitingSince = null;
        runtime.taskSince = null;
        setState("idle", "结束等待", { clearLock: true });
        break;
      case "force-sleepy":
        runtime.taskSince = null;
        runtime.waitingSince = null;
        runtime.lastActivityAt = now - getTiming().sleepyMs - 1000;
        setState("sleepy", "模拟空闲犯困", { clearLock: true });
        break;
      case "force-sleep":
        runtime.taskSince = null;
        runtime.waitingSince = null;
        runtime.lastActivityAt = now - getTiming().sleepMs - 1000;
        setState("long-idle-sleep", "模拟长时间休眠", { clearLock: true });
        break;
      case "reset":
        runtime.waitingSince = null;
        runtime.taskSince = null;
        runtime.lastActivityAt = now;
        setState("idle", "重置待机", { clearLock: true, resetFrame: true });
        break;
      default:
        break;
    }
  }

  function noteActivity(reason) {
    const wasSleeping =
      runtime.currentState === "sleepy" ||
      runtime.currentState === "long-idle-sleep";

    runtime.lastActivityAt = Date.now();

    if (wasSleeping) {
      runtime.suppressClickUntil = Date.now() + 700;
      setState("wake-up", `${reason}唤醒`, { holdMs: 2200, resetFrame: true });
    }

    return wasSleeping;
  }

  function tick() {
    updateStatusText();

    if (Date.now() < runtime.lockUntil || runtime.dragging) {
      return;
    }

    const now = Date.now();
    const timing = getTiming();

    if (runtime.hover) {
      const hoverAge = now - runtime.hoverStartedAt;
      if (hoverAge >= timing.hoverFocusMs) {
        setState("deep-focus", "鼠标长时间悬停");
      } else if (hoverAge >= timing.hoverReviewMs) {
        setState("review", "鼠标持续悬停");
      } else {
        setState("curious", "鼠标悬停观察");
      }
      return;
    }

    if (runtime.waitingSince) {
      const waitingAge = now - runtime.waitingSince;
      setState(
        waitingAge >= timing.boredMs ? "bored" : "waiting",
        waitingAge >= timing.boredMs ? "等待太久" : "等待用户输入",
      );
      return;
    }

    if (runtime.taskSince) {
      const taskAge = now - runtime.taskSince;
      setState(
        taskAge >= timing.focusMs ? "deep-focus" : "running",
        taskAge >= timing.focusMs ? "长任务专注" : "任务运行中",
      );
      return;
    }

    const idleAge = now - runtime.lastActivityAt;
    if (idleAge >= timing.sleepMs) {
      setState("long-idle-sleep", "长时间无操作");
    } else if (idleAge >= timing.sleepyMs) {
      setState("sleepy", "空闲一段时间");
    } else {
      setState("idle", "无活动待机");
    }
  }

  function setState(id, reason, options = {}) {
    if (!states[id]) {
      return;
    }

    const changed = runtime.currentState !== id;
    runtime.currentState = id;
    runtime.reason = reason;

    if (options.resetFrame || changed) {
      runtime.frame = 0;
      runtime.lastFrameAt = 0;
    }

    if (options.clearLock) {
      runtime.lockUntil = 0;
    }

    if (options.holdMs) {
      runtime.lockUntil = Date.now() + options.holdMs;
    }

    renderFrame();
    updateActiveButtons();
    updateStatusText();

    if (changed || options.forceLog) {
      logEvent(states[id].label, reason);
    }
  }

  function clearTaskAndWait() {
    runtime.waitingSince = null;
    runtime.taskSince = null;
  }

  function connectLocalEvents() {
    if (!window.EventSource || window.location.protocol !== "http:") {
      return;
    }

    const source = new EventSource("/api/events");
    source.addEventListener("trigger", (event) => {
      const payload = JSON.parse(event.data);
      if (!states[payload.state]) {
        return;
      }
      clearTaskAndWait();
      setState(payload.state, payload.reason || "本地服务触发", {
        holdMs: 3600,
        resetFrame: true,
      });
    });
  }

  function animate(timestamp) {
    const state = states[runtime.currentState];
    if (!runtime.lastFrameAt) {
      runtime.lastFrameAt = timestamp;
    }

    if (timestamp - runtime.lastFrameAt >= state.frameMs) {
      runtime.frame = (runtime.frame + 1) % state.frames;
      runtime.lastFrameAt = timestamp;
      renderFrame();
    }

    requestAnimationFrame(animate);
  }

  function renderFrame() {
    const state = states[runtime.currentState];
    const x = -runtime.frame * CELL_WIDTH;
    const y = state.kind === "atlas" ? -state.row * CELL_HEIGHT : 0;

    sprite.style.backgroundImage = `url("${state.src}")`;
    sprite.style.backgroundPosition = `${x}px ${y}px`;
  }

  function updateActiveButtons() {
    document.querySelectorAll("[data-state]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.state === runtime.currentState,
      );
    });
  }

  function updateStatusText() {
    const now = Date.now();
    currentStateLabel.textContent = `${states[runtime.currentState].label} / ${runtime.currentState}`;
    currentReasonLabel.textContent = runtime.reason;
    idleAgeLabel.textContent = formatDuration(now - runtime.lastActivityAt);

    if (runtime.waitingSince) {
      contextStateLabel.textContent = `等待 ${formatDuration(now - runtime.waitingSince)}`;
    } else if (runtime.taskSince) {
      contextStateLabel.textContent = `任务 ${formatDuration(now - runtime.taskSince)}`;
    } else if (runtime.lockUntil > now) {
      contextStateLabel.textContent = `临时动画 ${formatDuration(runtime.lockUntil - now)}`;
    } else {
      contextStateLabel.textContent = demoMode.checked ? "待机，演示计时" : "待机，真实计时";
    }
  }

  function logEvent(label, reason) {
    const item = document.createElement("li");
    const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    item.innerHTML = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(time)} - ${escapeHtml(reason)}</span>`;
    eventLog.prepend(item);

    while (eventLog.children.length > 18) {
      eventLog.removeChild(eventLog.lastElementChild);
    }
  }

  function getTiming() {
    return demoMode.checked ? timings.demo : timings.normal;
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes <= 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
})();
