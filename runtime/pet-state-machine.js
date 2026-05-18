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
    },
    demo: {
      sleepyMs: 8 * 1000,
      sleepMs: 18 * 1000,
      boredMs: 10 * 1000,
      focusMs: 12 * 1000,
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
    dragging: false,
    dragLastX: 0,
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
      noteActivity("鼠标悬停");
      setState("curious", "鼠标悬停观察");
    });

    petWrap.addEventListener("pointerleave", () => {
      runtime.hover = false;
    });

    petWrap.addEventListener("click", () => {
      noteActivity("点击宠物");
      const state = playStates[runtime.nextPlayState % playStates.length];
      runtime.nextPlayState += 1;
      setState(state, "点击宠物娱乐", { holdMs: 3600, resetFrame: true });
    });

    petWrap.addEventListener("dblclick", () => {
      noteActivity("双击宠物");
      setState("celebrate", "双击庆祝", { holdMs: 4200, resetFrame: true });
    });

    petWrap.addEventListener("pointerdown", (event) => {
      runtime.dragging = true;
      runtime.dragLastX = event.clientX;
      noteActivity("开始拖动");
      petWrap.setPointerCapture(event.pointerId);
    });

    petWrap.addEventListener("pointermove", (event) => {
      if (!runtime.dragging) {
        throttlePointerActivity();
        return;
      }

      const deltaX = event.clientX - runtime.dragLastX;
      runtime.dragLastX = event.clientX;
      noteActivity("拖动宠物");

      if (Math.abs(deltaX) < 2) {
        return;
      }

      setState(
        deltaX > 0 ? "running-right" : "running-left",
        deltaX > 0 ? "向右拖动" : "向左拖动",
      );
    });

    petWrap.addEventListener("pointerup", (event) => {
      runtime.dragging = false;
      noteActivity("结束拖动");
      petWrap.releasePointerCapture(event.pointerId);
    });

    window.addEventListener("keydown", () => noteActivity("键盘输入"));
    window.addEventListener("pointerdown", () => noteActivity("页面点击"));
    window.addEventListener("focus", () => noteActivity("窗口获得焦点"));
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
      setState("wake-up", `${reason}唤醒`, { holdMs: 2200, resetFrame: true });
    }
  }

  function tick() {
    updateStatusText();

    if (Date.now() < runtime.lockUntil || runtime.dragging) {
      return;
    }

    const now = Date.now();
    const timing = getTiming();

    if (runtime.hover) {
      setState("curious", "鼠标悬停观察");
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
