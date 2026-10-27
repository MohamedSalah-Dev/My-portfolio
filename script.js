// ===== Theme =====
var html = document.documentElement;

function toggleTheme() {
  var isLight = html.classList.contains("light");
  html.className = isLight ? "dark" : "light";
  try {
    localStorage.setItem("theme", html.className);
  } catch (e) {}
}

function getGold() {
  return html.classList.contains("light") ? "#8f6a1f" : "#c9a45c";
}

// ===== Rope settings =====
var canvas = document.getElementById("ropeCanvas");
var ctx = canvas.getContext("2d");
var ropeArea = document.getElementById("ropeArea");

var WIDTH = 400;        // canvas size
var HEIGHT = 340;
var PARTS = 16;         // number of rope segments
var LENGTH = 135;       // rope length (px)
var PART_LEN = LENGTH / PARTS;
var PULL_DISTANCE = 26; // how far you pull to switch the theme
var BALL_SIZE = 8;      // radius of the ball at the end

var anchorX = WIDTH / 2; // the rope is tied to the top of the page
var anchorY = 0;

// create the rope points
var points = [];
for (var i = 0; i <= PARTS; i++) {
  points.push({ x: anchorX, y: i * PART_LEN, oldX: anchorX, oldY: i * PART_LEN });
}
var tip = points[PARTS];

// ===== Canvas position =====
function setupCanvas() {
  var ratio = window.devicePixelRatio || 1;
  canvas.width = WIDTH * ratio;
  canvas.height = HEIGHT * ratio;
  canvas.style.width = WIDTH + "px";
  canvas.style.height = HEIGHT + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  var box = ropeArea.getBoundingClientRect();
  canvas.style.left = (box.left + box.width / 2 - WIDTH / 2) + "px";
}
setupCanvas();
window.addEventListener("resize", setupCanvas);

// ===== Mouse =====
var dragging = false;
var hovering = false;
var target = { x: anchorX, y: LENGTH };
var offset = { x: 0, y: 0 };
var startPoint = { x: 0, y: 0 };
var moved = 0;

function getMouse(e) {
  var box = canvas.getBoundingClientRect();
  return { x: e.clientX - box.left, y: e.clientY - box.top };
}

function isOnBall(mouse) {
  var dx = mouse.x - tip.x;
  var dy = mouse.y - tip.y;
  return Math.sqrt(dx * dx + dy * dy) < BALL_SIZE + 10;
}

window.addEventListener("pointerdown", function (e) {
  var mouse = getMouse(e);
  if (!isOnBall(mouse)) return;

  dragging = true;
  moved = 0;
  startPoint = mouse;
  offset = { x: tip.x - mouse.x, y: tip.y - mouse.y };
  target = { x: tip.x, y: tip.y };
  document.body.style.cursor = "grabbing";
  e.preventDefault();
});

window.addEventListener("pointermove", function (e) {
  var mouse = getMouse(e);

  if (dragging) {
    var dx0 = mouse.x - startPoint.x;
    var dy0 = mouse.y - startPoint.y;
    moved = Math.max(moved, Math.sqrt(dx0 * dx0 + dy0 * dy0));

    target = { x: mouse.x + offset.x, y: mouse.y + offset.y };

    // the rope can only stretch a little
    var dx = target.x - anchorX;
    var dy = target.y - anchorY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var max = LENGTH * 1.3;
    if (dist > max) {
      target.x = anchorX + (dx / dist) * max;
      target.y = anchorY + (dy / dist) * max;
    }
  } else {
    var onBall = isOnBall(mouse);
    if (onBall !== hovering) {
      hovering = onBall;
      document.body.style.cursor = onBall ? "grab" : "";
    }
  }
});

function release() {
  if (!dragging) return;
  dragging = false;
  document.body.style.cursor = hovering ? "grab" : "";

  if (moved < 4) {
    tug();                                       // simple click
  } else if (target.y >= LENGTH + PULL_DISTANCE) {
    toggleTheme();                               // pulled far enough
  }
}
window.addEventListener("pointerup", release);
window.addEventListener("pointercancel", release);

// quick pull (used for a click or the keyboard)
function tug() {
  tip.oldY = tip.y - 16;
  setTimeout(toggleTheme, 150);
}
document.getElementById("ropeButton").addEventListener("click", tug);

// ===== Physics =====
function update() {
  // move the points
  for (var i = 1; i <= PARTS; i++) {
    if (dragging && i === PARTS) continue;
    var p = points[i];
    var vx = (p.x - p.oldX) * 0.985;
    var vy = (p.y - p.oldY) * 0.985;
    p.oldX = p.x;
    p.oldY = p.y;
    p.x += vx;
    p.y += vy + 0.5; // gravity
  }

  if (dragging) {
    tip.oldX = tip.x;
    tip.oldY = tip.y;
    tip.x = target.x;
    tip.y = target.y;
  }

  // keep every part at its length (a bit stretchy while pulling)
  var dxTip = tip.x - anchorX;
  var dyTip = tip.y - anchorY;
  var reach = Math.sqrt(dxTip * dxTip + dyTip * dyTip);
  var len = dragging ? Math.max(PART_LEN, reach / PARTS) : PART_LEN;

  for (var k = 0; k < 16; k++) {
    for (var j = 1; j <= PARTS; j++) {
      var a = points[j - 1];
      var b = points[j];
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      var diff = (d - len) / d;

      var aMoves = (j - 1 === 0) ? 0 : 1;
      var bMoves = (dragging && j === PARTS) ? 0 : 1;
      var total = aMoves + bMoves;
      if (total === 0) continue;

      a.x += dx * diff * aMoves / total;
      a.y += dy * diff * aMoves / total;
      b.x -= dx * diff * bMoves / total;
      b.y -= dy * diff * bMoves / total;
    }
  }
}

// ===== Drawing =====
function draw() {
  var gold = getGold();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // rope
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (var i = 1; i < PARTS; i++) {
    var midX = (points[i].x + points[i + 1].x) / 2;
    var midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  ctx.lineTo(tip.x, tip.y);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.stroke();

  // simple ball at the end
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, BALL_SIZE, 0, Math.PI * 2);
  ctx.fillStyle = gold;
  ctx.fill();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

// ===== Active link while scrolling =====
var links = document.querySelectorAll(".nav-links a");
var sections = document.querySelectorAll("section");

var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (!entry.isIntersecting) return;
    links.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
    });
  });
}, { rootMargin: "-40% 0px -55% 0px" });

sections.forEach(function (section) {
  observer.observe(section);
});
// ===== Appear on scroll =====
var revealItems = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");

var revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealItems.forEach(function (item) {
  revealObserver.observe(item);
});
// ===== Hide the scroll indicator after scrolling =====
var scrollDown = document.querySelector(".scroll-down");

window.addEventListener("scroll", function () {
  scrollDown.classList.toggle("hide", window.scrollY > 80);
});
// ===== Projects: the camera travels through Z =====
var projectsSection = document.querySelector(".projects");
var world = document.querySelector(".projects-world");
var projectCards = document.querySelectorAll(".project-card");
var floatFrames = document.querySelectorAll(".float-frame");
var bigWord = document.querySelector(".bigword-holder");
var hudCounter = document.querySelector(".hud-counter");
var hudBar = document.querySelector(".hud-bar");

var HEADER_HEIGHT = 84;  // height of the fixed header
var FIRST_CARD = 1500;   // how far the first card starts (px behind the screen)
var CARD_GAP = 1400;     // distance between cards
var FOCUS = 250;         // how far a card stops from the camera

// how far the camera travels in total (also controls the scroll length)
var totalDepth = FIRST_CARD - FOCUS + (projectCards.length - 1) * CARD_GAP + 150;

var fadingItems = [];  // title, cards and frames
var stars = [];

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

// ----- the big title (decoration only, it never takes clicks) -----
bigWord.style.transform = "translateZ(-350px)";
bigWord.style.pointerEvents = "none";
fadingItems.push({ el: bigWord, z: -350, isCard: false });

// ----- the cards -----
projectCards.forEach(function (card, i) {
  var z = -(FIRST_CARD + i * CARD_GAP);
  var x = (i % 2 === 0) ? -100 : 100;      // a little left, a little right
  var y = (i % 2 === 0) ? -20 : 30;
  var turn = x < 0 ? 10 : -10;             // turn a little toward the center

  card.style.transform = "translate3d(" + x + "px," + y + "px," + z + "px) rotateY(" + turn + "deg)";
  fadingItems.push({ el: card, z: z, isCard: true });
});

// ----- the floating frames (position comes from data-x, data-y, data-z) -----
floatFrames.forEach(function (frame) {
  var x = Number(frame.dataset.x);
  var y = Number(frame.dataset.y);
  var z = Number(frame.dataset.z);
  var turn = x < 0 ? 15 : -15;

  frame.style.transform =
    "translate3d(" + x + "px," + y + "px," + z + "px) rotateY(" + turn + "deg) translate(-50%, -50%)";
  frame.style.pointerEvents = "none";
  fadingItems.push({ el: frame, z: z, isCard: false });
});

// ----- stars -----
for (var s = 0; s < 80; s++) {
  var star = document.createElement("span");
  star.className = (s % 5 === 0) ? "star star-gold" : "star";

  var sx = (Math.random() - 0.5) * 2400;
  var sy = (Math.random() - 0.5) * 1300;
  var sz = 400 - Math.random() * (totalDepth + 2500);

  star.style.transform = "translate3d(" + sx + "px," + sy + "px," + sz + "px)";
  star.style.pointerEvents = "none";
  world.appendChild(star);
  stars.push({ el: star, z: sz });
}

// ----- the section is as tall as the journey -----
function setProjectsHeight() {
  projectsSection.style.height = (window.innerHeight - HEADER_HEIGHT + totalDepth) + "px";
}

// ----- every scroll: move the camera -----
function updateProjects() {
  var rect = projectsSection.getBoundingClientRect();

  // how far the camera has travelled (1px of scroll = 1px of travel)
  var travelled = HEADER_HEIGHT - rect.top;
  travelled = Math.max(0, Math.min(totalDepth, travelled));

  world.style.transform = "translateZ(" + travelled + "px)";

  // title, cards and frames fade in and out
  fadingItems.forEach(function (item) {
    var dist = item.z + travelled;   // negative = in front of us, far away
    var opacity = 1;

    if (dist > 150) opacity = 1 - (dist - 150) / 350;        // passing the camera
    if (dist < -1200) opacity = 1 - (-1200 - dist) / 1300;   // far away

    opacity = Math.max(0, Math.min(1, opacity));
    item.el.style.opacity = opacity;
    item.el.style.visibility = opacity === 0 ? "hidden" : "visible";

    // only the card that is close can be clicked
    if (item.isCard) {
      item.el.style.pointerEvents = (dist > -900 && dist < 200) ? "auto" : "none";
    }
  });

  // stars disappear before they reach the camera
  stars.forEach(function (item) {
    var dist = item.z + travelled;
    var opacity = dist > 600 ? 1 - (dist - 600) / 300 : 1;
    item.el.style.opacity = Math.max(0, Math.min(1, opacity));
  });

  // counter and progress line
  var number = Math.round((travelled - (FIRST_CARD - FOCUS)) / CARD_GAP) + 1;
  if (travelled < 500) number = 0;
  number = Math.max(0, Math.min(projectCards.length, number));

  hudCounter.textContent = pad(number) + " / " + pad(projectCards.length) + " \u00B7 Selected Work";
  hudBar.style.width = (travelled / totalDepth * 100) + "%";
}

var ticking = false;
window.addEventListener("scroll", function () {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(function () {
    updateProjects();
    ticking = false;
  });
});

window.addEventListener("resize", function () {
  setProjectsHeight();
  updateProjects();
});

setProjectsHeight();
updateProjects();

// ===== Make sure the card buttons always work =====
function findCardLink(x, y) {
  var found = null;

  projectCards.forEach(function (card) {
    if (card.style.pointerEvents !== "auto") return;   // only the card in front of us

    card.querySelectorAll(".card-link").forEach(function (link) {
      var box = link.getBoundingClientRect();
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
        found = link;
      }
    });
  });

  return found;
}

window.addEventListener("click", function (e) {

  if (e.target.closest("a")) return;      // a normal link click, the browser handles it

  var link = findCardLink(e.clientX, e.clientY);
  if (!link) return;

  if (link.target === "_blank") {
    window.open(link.href, "_blank", "noopener");
  } else {
    window.location.href = link.href;
  }
});
// ===== Hover on cards and buttons (done with JS, because the 3D scene blocks normal hover) =====
var lastX = 0;
var lastY = 0;
var hoveredLink = null;
var hoveredCard = null;

function findCardAt(x, y) {
  var found = null;

  projectCards.forEach(function (card) {
    if (card.style.pointerEvents !== "auto") return;   // only the card in front of us

    var box = card.getBoundingClientRect();
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
      found = card;
    }
  });

  return found;
}

function updateHover() {
  // the button under the mouse
  var link = findCardLink(lastX, lastY);
  if (link !== hoveredLink) {
    if (hoveredLink) hoveredLink.classList.remove("is-hover");
    if (link) link.classList.add("is-hover");
    hoveredLink = link;
    document.body.classList.toggle("link-hover", link !== null);
  }

  // the card under the mouse
  var card = findCardAt(lastX, lastY);
  if (card !== hoveredCard) {
    if (hoveredCard) hoveredCard.classList.remove("is-hover");
    if (card) card.classList.add("is-hover");
    hoveredCard = card;
  }
}

window.addEventListener("pointermove", function (e) {
  lastX = e.clientX;
  lastY = e.clientY;
  updateHover();
});

// when you scroll, the cards move under a still mouse
window.addEventListener("scroll", function () {
  requestAnimationFrame(updateHover);
});
// ===== Contact form: sends the message to my email =====
var contactForm = document.getElementById("contactForm");
var formStatus = document.getElementById("formStatus");
var sendButton = contactForm.querySelector("button[type='submit']");

var FORM_URL = "https://formspree.io/f/xaeeevpb";   // put your Formspree link here

contactForm.addEventListener("submit", function (e) {
  e.preventDefault();

  sendButton.disabled = true;               // stops double clicks
  formStatus.textContent = "Sending...";

  fetch(FORM_URL, {
    method: "POST",
    headers: { "Accept": "application/json" },
    body: new FormData(contactForm)
  })
    .then(function (response) {
      if (response.ok) {
        formStatus.textContent = "Thank you! Your message has been sent.";
        contactForm.reset();
      } else {
        formStatus.textContent = "Something went wrong. Please try again or email me directly.";
      }
    })
    .catch(function () {
      formStatus.textContent = "No connection. Please try again.";
    })
    .finally(function () {
      sendButton.disabled = false;
    });
});
// ===== Mobile menu =====
var header = document.querySelector(".header");
var menuToggle = document.getElementById("menuToggle");
var menuLinks = document.querySelectorAll(".nav-links a");

menuToggle.addEventListener("click", function () {
  var open = header.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", open);
});

// close the menu after choosing a section
menuLinks.forEach(function (link) {
  link.addEventListener("click", function () {
    header.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});