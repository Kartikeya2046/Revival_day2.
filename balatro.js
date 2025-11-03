class BalatroBG {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId)

    if (!this.container) {
      console.error("[v0] Balatro container not found:", containerId)
      return
    }

    if (this.container.offsetWidth === 0 || this.container.offsetHeight === 0) {
      console.error(
        "[v0] Container has no dimensions. Width:",
        this.container.offsetWidth,
        "Height:",
        this.container.offsetHeight,
      )
      setTimeout(() => new BalatroBG(containerId, options), 100)
      return
    }

    this.canvas = document.createElement("canvas")
    this.gl = this.canvas.getContext("webgl2") || this.canvas.getContext("webgl")

    if (!this.gl) {
      console.error("[v0] WebGL not supported")
      return
    }

    console.log("[v0] WebGL initialized successfully")
    console.log("[v0] Canvas size will be:", this.container.offsetWidth, "x", this.container.offsetHeight)
    this.container.appendChild(this.canvas)

    this.spinRotation = options.spinRotation || -2.0
    this.spinSpeed = options.spinSpeed || 7.0
    this.offset = options.offset || [0.0, 0.0]
    this.color1 = this.hexToVec4(options.color1 || "#8B0000")
    this.color2 = this.hexToVec4(options.color2 || "#1a0000")
    this.color3 = this.hexToVec4(options.color3 || "#0a0e27")
    this.contrast = options.contrast || 3.5
    this.lighting = options.lighting || 0.4
    this.spinAmount = options.spinAmount || 0.25
    this.pixelFilter = options.pixelFilter || 700.0
    this.spinEase = options.spinEase || 1.0
    this.isRotate = options.isRotate || false
    this.mouseInteraction = options.mouseInteraction !== false

    this.init()
  }

  hexToVec4(hex) {
    const hexStr = hex.replace("#", "")
    let r = 0,
      g = 0,
      b = 0,
      a = 1

    if (hexStr.length === 6) {
      r = Number.parseInt(hexStr.slice(0, 2), 16) / 255
      g = Number.parseInt(hexStr.slice(2, 4), 16) / 255
      b = Number.parseInt(hexStr.slice(4, 6), 16) / 255
    } else if (hexStr.length === 8) {
      r = Number.parseInt(hexStr.slice(0, 2), 16) / 255
      g = Number.parseInt(hexStr.slice(2, 4), 16) / 255
      b = Number.parseInt(hexStr.slice(4, 6), 16) / 255
      a = Number.parseInt(hexStr.slice(6, 8), 16) / 255
    }

    return [r, g, b, a]
  }

  get vertexShader() {
    return `
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 vUv;
            
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `
  }

  get fragmentShader() {
    return `
            precision highp float;

            #define PI 3.14159265359

            uniform float iTime;
            uniform vec3 iResolution;
            uniform float uSpinRotation;
            uniform float uSpinSpeed;
            uniform vec2 uOffset;
            uniform vec4 uColor1;
            uniform vec4 uColor2;
            uniform vec4 uColor3;
            uniform float uContrast;
            uniform float uLighting;
            uniform float uSpinAmount;
            uniform float uPixelFilter;
            uniform float uSpinEase;
            uniform bool uIsRotate;
            uniform vec2 uMouse;

            varying vec2 vUv;

            vec4 effect(vec2 screenSize, vec2 screen_coords) {
                float pixel_size = length(screenSize.xy) / uPixelFilter;
                vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy) - uOffset;
                float uv_len = length(uv);
                
                float speed = (uSpinRotation * uSpinEase * 0.2);
                if(uIsRotate) {
                   speed = iTime * speed;
                }
                speed += 302.2;
                
                float mouseInfluence = (uMouse.x * 2.0 - 1.0);
                speed += mouseInfluence * 0.1;
                
                float new_pixel_angle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uv_len + (1.0 - uSpinAmount));
                vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
                uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);
                
                uv *= 30.0;
                float baseSpeed = iTime * uSpinSpeed;
                speed = baseSpeed + mouseInfluence * 2.0;
                
                vec2 uv2 = vec2(uv.x + uv.y);
                
                for(int i = 0; i < 5; i++) {
                    uv2 += sin(max(uv.x, uv.y)) + uv;
                    uv += 0.5 * vec2(
                        cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
                        sin(uv2.x - 0.113 * speed)
                    );
                    uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
                }
                
                float contrast_mod = (0.25 * uContrast + 0.5 * uSpinAmount + 1.2);
                float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
                float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
                float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
                float c3p = 1.0 - min(1.0, c1p + c2p);
                float light = (uLighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + uLighting * max(c2p * 5.0 - 4.0, 0.0);
                
                return (0.3 / uContrast) * uColor1 + (1.0 - 0.3 / uContrast) * (uColor1 * c1p + uColor2 * c2p + vec4(c3p * uColor3.rgb, c3p * uColor1.a)) + light;
            }

            void main() {
                vec2 uv = vUv * iResolution.xy;
                gl_FragColor = effect(iResolution.xy, uv);
            }
        `
  }

  compileShader(source, type) {
    const shader = this.gl.createShader(type)
    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error("[v0] Shader compilation error:", this.gl.getShaderInfoLog(shader))
      return null
    }

    return shader
  }

  init() {
    this.gl.clearColor(0, 0, 0, 1)

    const vertexShader = this.compileShader(this.vertexShader, this.gl.VERTEX_SHADER)
    const fragmentShader = this.compileShader(this.fragmentShader, this.gl.FRAGMENT_SHADER)

    if (!vertexShader || !fragmentShader) {
      console.error("[v0] Shader compilation failed")
      return
    }

    this.program = this.gl.createProgram()
    this.gl.attachShader(this.program, vertexShader)
    this.gl.attachShader(this.program, fragmentShader)
    this.gl.linkProgram(this.program)

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error("[v0] Program linking error:", this.gl.getProgramInfoLog(this.program))
      return
    }

    const positions = [-1, -1, 1, -1, -1, 1, 1, 1]
    const positionBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW)

    const positionLocation = this.gl.getAttribLocation(this.program, "position")
    this.gl.enableVertexAttribArray(positionLocation)
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0)

    this.uniforms = {
      iTime: this.gl.getUniformLocation(this.program, "iTime"),
      iResolution: this.gl.getUniformLocation(this.program, "iResolution"),
      uSpinRotation: this.gl.getUniformLocation(this.program, "uSpinRotation"),
      uSpinSpeed: this.gl.getUniformLocation(this.program, "uSpinSpeed"),
      uOffset: this.gl.getUniformLocation(this.program, "uOffset"),
      uColor1: this.gl.getUniformLocation(this.program, "uColor1"),
      uColor2: this.gl.getUniformLocation(this.program, "uColor2"),
      uColor3: this.gl.getUniformLocation(this.program, "uColor3"),
      uContrast: this.gl.getUniformLocation(this.program, "uContrast"),
      uLighting: this.gl.getUniformLocation(this.program, "uLighting"),
      uSpinAmount: this.gl.getUniformLocation(this.program, "uSpinAmount"),
      uPixelFilter: this.gl.getUniformLocation(this.program, "uPixelFilter"),
      uSpinEase: this.gl.getUniformLocation(this.program, "uSpinEase"),
      uIsRotate: this.gl.getUniformLocation(this.program, "uIsRotate"),
      uMouse: this.gl.getUniformLocation(this.program, "uMouse"),
    }

    this.resize()
    window.addEventListener("resize", () => this.resize())

    if (this.mouseInteraction) {
      document.addEventListener("mousemove", (e) => this.handleMouseMove(e))
    }

    this.startTime = Date.now()
    console.log("[v0] Balatro animation starting")
    this.animate()
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = 1.0 - (e.clientY - rect.top) / rect.height
    this.gl.uniform2f(this.uniforms.uMouse, x, y)
  }

  resize() {
    this.canvas.width = this.container.offsetWidth
    this.canvas.height = this.container.offsetHeight
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    this.gl.uniform3f(
      this.uniforms.iResolution,
      this.canvas.width,
      this.canvas.height,
      this.canvas.width / this.canvas.height,
    )
  }

  animate() {
    const elapsed = (Date.now() - this.startTime) * 0.001
    this.gl.uniform1f(this.uniforms.iTime, elapsed)
    this.gl.uniform1f(this.uniforms.uSpinRotation, this.spinRotation)
    this.gl.uniform1f(this.uniforms.uSpinSpeed, this.spinSpeed)
    this.gl.uniform2fv(this.uniforms.uOffset, this.offset)
    this.gl.uniform4fv(this.uniforms.uColor1, this.color1)
    this.gl.uniform4fv(this.uniforms.uColor2, this.color2)
    this.gl.uniform4fv(this.uniforms.uColor3, this.color3)
    this.gl.uniform1f(this.uniforms.uContrast, this.contrast)
    this.gl.uniform1f(this.uniforms.uLighting, this.lighting)
    this.gl.uniform1f(this.uniforms.uSpinAmount, this.spinAmount)
    this.gl.uniform1f(this.uniforms.uPixelFilter, this.pixelFilter)
    this.gl.uniform1f(this.uniforms.uSpinEase, this.spinEase)
    this.gl.uniform1i(this.uniforms.uIsRotate, this.isRotate)

    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

    requestAnimationFrame(() => this.animate())
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBalatro)
} else {
  initBalatro()
}

function initBalatro() {
  new BalatroBG("balatroBg", {
    spinRotation: -2.5,
    spinSpeed: 6.0,
    color1: "#8B0000",
    color2: "#1a0000",
    color3: "#0a0e27",
    contrast: 3.2,
    lighting: 0.5,
    spinAmount: 0.3,
    pixelFilter: 650.0,
    mouseInteraction: true,
  })
}