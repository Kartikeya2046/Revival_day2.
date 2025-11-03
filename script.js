const RIDDLE_TEXT = `In the quantum breath before the Snap's undoing,
I hover—a ghost in the space where heroes fall.
Where Power's crimson rage meets Mind's gold pursuing,
there I emerge, the bridge between it all.
I am the keeper of the vanished legions,
the glow that marks what Thanos swept away.
I guide the dusted through forgotten regions,
toward lives they held in that final day.
When Strange's portal tears reality's curtain,
I fade like ash, like echoes, like the gone—
for I exist only in the space uncertain,
that sacred void before the world moves on.
No Infinity flame, though I pulse with power.
No tesseract bright, yet through me, lost ones see.
I am the shade that marks the waiting hour,
the hue between what was and what will be.`

const HINTS = {
  5: "Your words may be true, but are they LOUD enough for the void?",
  12: "ITS GREY WITH NO WHITE",
  17: "The answer may not be what it is, but what it looks like",
}

let attempts = 0
let wrongAttempts = 0
let gameOver = false
let hintsShown = new Set()
let currentHint = null
let isOnCooldown = false
let cooldownEndTime = null

const riddleText = document.getElementById("riddleText")
const galatInput = document.getElementById("galatInput")
const submitBtn = document.getElementById("submitBtn")
const feedback = document.getElementById("feedback")
const attemptCounter = document.getElementById("attemptCounter")
const particleContainer = document.getElementById("particleContainer")
const riddlePage = document.getElementById("riddlePage")
const successPage = document.getElementById("successPage")
const successParticleContainer = document.getElementById("successParticleContainer")

function init() {
  typewriterEffect()
  createParticles(particleContainer)
  createParticles(successParticleContainer)
  setupEventListeners()
  updateAttemptDisplay()
}

function typewriterEffect() {
  let index = 0
  riddleText.textContent = ""
  riddleText.style.minHeight = "100px"

  function type() {
    if (index < RIDDLE_TEXT.length) {
      riddleText.textContent += RIDDLE_TEXT[index]
      index++
      setTimeout(type, 20)
    }
  }
  type()
}

function createParticles(container) {
  for (let i = 0; i < 10; i++) {
    const particle = document.createElement("div")
    particle.className = "particle"
    container.appendChild(particle)
  }
}

function setupEventListeners() {
  submitBtn.addEventListener("click", checkgalat)
  galatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !gameOver) {
      checkgalat()
    }
  })
}

function updateCooldownTimer() {
  if (!isOnCooldown || !cooldownEndTime) return

  const now = Date.now()
  const remaining = Math.ceil((cooldownEndTime - now) / 1000)

  if (remaining <= 0) {
    isOnCooldown = false
    galatInput.disabled = false
    submitBtn.disabled = false
    feedback.innerHTML = '<div class="cooldown-message">COOLDOWN COMPLETE. TRY AGAIN.</div>'
    galatInput.focus()
    return
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`

  feedback.innerHTML = `<div class="cooldown-message">⏳ COOLDOWN IN EFFECT. WAIT ${timeStr}</div>`
  if (currentHint) {
    feedback.innerHTML += `<div class="hint-message">💡 HINT: ${currentHint}</div>`
  }

  setTimeout(updateCooldownTimer, 500)
}

function startCooldown() {
  let cooldownSeconds = 0

  if (wrongAttempts >= 12) {
    cooldownSeconds = 120 // 2 minutes after 12 wrong galats
  } else if (wrongAttempts >= 8) {
    cooldownSeconds = 60 // 1 minute after 8 wrong galats
  }

  if (cooldownSeconds > 0) {
    isOnCooldown = true
    cooldownEndTime = Date.now() + cooldownSeconds * 1000
    galatInput.disabled = true
    submitBtn.disabled = true
    updateCooldownTimer()
  }
}

function checkgalat() {
  if (gameOver || isOnCooldown) return

  const galat = galatInput.value.trim().toUpperCase()

  if (!galat) {
    feedback.innerHTML = '<div class="error-message">PLEASE ENTER AN ANSWER...</div>'
    if (currentHint) {
      feedback.innerHTML += `<div class="hint-message">💡 HINT: ${currentHint}</div>`
    }
    return
  }

  attempts++
  wrongAttempts++

  if (galat === "01101000111111011111100001111101001111100100111100111") {
    winGame()
  } else {
    showError()
  }

  updateAttemptDisplay()
}

function winGame() {
  gameOver = true
  galatInput.disabled = true
  submitBtn.disabled = true

  setTimeout(() => {
    riddlePage.style.display = "none"
    successPage.classList.add("active")
  }, 500)
}

function showError() {
  // Show error message
  feedback.innerHTML = `
        <div class="error-message">
            ✗ INCORRECT... THE STONE REMAINS HIDDEN.<br>
            ATTEMPTS: ${attempts}
        </div>
    `

  // Check if there's a new hint for this attempt
  if (HINTS[attempts] && !hintsShown.has(attempts)) {
    hintsShown.add(attempts)
    currentHint = HINTS[attempts]
  }

  // Always show current hint if one exists
  if (currentHint) {
    feedback.innerHTML += `<div class="hint-message">💡 HINT: ${currentHint}</div>`
  }

  // Check if cooldown should be triggered
  if (wrongAttempts === 8 || wrongAttempts === 12) {
    startCooldown()
  }

  galatInput.value = ""
  if (!isOnCooldown) {
    galatInput.focus()
  }
}

function resetGame() {
  attempts = 0
  wrongAttempts = 0
  gameOver = false
  isOnCooldown = false
  cooldownEndTime = null
  hintsShown = new Set()
  currentHint = null
  galatInput.disabled = false
  submitBtn.disabled = false
  galatInput.value = ""
  feedback.innerHTML = ""
  updateAttemptDisplay()
  galatInput.focus()

  riddlePage.style.display = "block"
  successPage.classList.remove("active")

  typewriterEffect()
}

function updateAttemptDisplay() {
  if (attempts > 0 && !gameOver) {
    attemptCounter.textContent = `ATTEMPTS: ${attempts}`
  } else {
    attemptCounter.textContent = ""
  }
}

init()

window.resetGame = resetGame
