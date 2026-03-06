'use client'

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { Suspense, useEffect, useRef } from "react"

const WebGLBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2')
    if (!gl) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const vertexShaderSource = `#version 300 es
      layout (location=0) in vec2 point;
      void main() {
        gl_Position = vec4(point.x, point.y, 0.0, 1.0);
      }`

    const fragmentShaderSource = `#version 300 es
      precision highp float;
      
      float N21(vec2 p) {
        p = fract(p * vec2(233.34, 851.73));
        p += dot(p, p + 23.45);
        return fract(p.x * p.y);
      }
      
      vec2 N22(vec2 p) {
        float n = N21(p);
        return vec2(n, N21(p + n));
      }
      
      vec2 getPos(vec2 id, vec2 offset, float iTime) {
        vec2 n = N22(id + offset);
        float x = cos(iTime * n.x);
        float y = sin(iTime * n.y);
        return vec2(x, y) * 0.4 + offset;
      }
      
      float distanceToLine(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float t = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
        return length(pa - t * ba);
      }
      
      float getLine(vec2 p, vec2 a, vec2 b, vec2 iResolution) {
        float distance = distanceToLine(p, a, b);
        float dx = 15./iResolution.y;
        return smoothstep(dx, 0., distance) * smoothstep(1.2, 0.3, length(a - b));
      }
      
      float layer(vec2 st, float iTime, vec2 iResolution) {
        float m = 0.;
        vec2 gv = fract(st) - 0.5;
        vec2 id = floor(st);
        
        vec2 p[9];
        int i = 0;
        for (float x = -1.; x <= 1.; x++) {
          for (float y = -1.; y <= 1.; y++) {
            p[i++] = getPos(id, vec2(x, y), iTime);
          }
        }
        
        for (int j = 0; j <= 8; j++) {
          m += getLine(gv, p[4], p[j], iResolution);
          vec2 temp = (gv - p[j]) * 20.;
          m += 1./dot(temp, temp) * (sin(10. * iTime + fract(p[j].x) * 20.) * 0.5 + 0.5);
        }
        
        m += getLine(gv, p[1], p[3], iResolution);
        m += getLine(gv, p[1], p[5], iResolution);
        m += getLine(gv, p[3], p[7], iResolution);
        m += getLine(gv, p[5], p[7], iResolution);
        
        return m;
      }
      
      uniform float iTime;
      uniform vec2 iResolution;
      out vec4 fragColor;
      
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        
        float m = 0.;
        float theta = iTime * 0.1;
        mat2 rot = mat2(cos(theta), -sin(theta), sin(theta), cos(theta));
        vec2 gradient = uv;
        uv = rot * uv;
        
        for (float i = 0.; i < 1.0; i += 0.25) {
          float depth = fract(i + iTime * 0.1);
          m += layer(uv * mix(10., 0.5, depth) + i * 20., iTime, iResolution) * smoothstep(0., 0.2, depth) * smoothstep(1., 0.8, depth);
        }
        
        vec3 baseColor = sin(vec3(2.45, 4.56, 6.78) * iTime * 0.3) * 0.3 + 0.7;
        vec3 col = (m - gradient.y * 0.3) * baseColor;
        fragColor = vec4(col * 0.6, 1.0);
      }`

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource)

    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.useProgram(program)

    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([1, 0, 2, 3]), gl.STATIC_DRAW)

    const uResolution = gl.getUniformLocation(program, 'iResolution')
    const uTime = gl.getUniformLocation(program, 'iTime')

    const startTime = performance.now()
    const render = () => {
      const time = (performance.now() - startTime) / 1000
      
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, time)
      
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, 0)
      
      animationRef.current = requestAnimationFrame(render)
    }
    render()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #ec4899 100%)' }}
    />
  )
}

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" })
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <WebGLBackground />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Main login card */}
      <div className="relative z-10 w-full max-w-md">
        <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="mx-auto mb-4 relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500 hover:scale-110">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full animate-ping" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce" />
            </div>
            <CardTitle className="text-4xl font-bold text-white mb-2 tracking-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              TB Command Center
            </CardTitle>
            <CardDescription className="text-white/90 text-lg font-medium">
              Alliance India - Advanced Healthcare Management
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8">
            {error === 'AccessDenied' && (
              <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-400/30 rounded-xl text-red-100 text-sm backdrop-blur-sm animate-pulse">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>Your account is not authorized. Please contact the M&E administrator.</span>
              </div>
            )}
            
            <Button 
              onClick={handleGoogleSignIn}
              className="w-full h-16 bg-white/95 hover:bg-white text-gray-800 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 flex items-center justify-center gap-4 text-lg font-semibold backdrop-blur-sm group overflow-hidden relative"
              size="lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
              <div className="relative flex items-center gap-4">
                <div className="relative">
                  <svg className="w-7 h-7 transform group-hover:rotate-12 transition-transform duration-300" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                </div>
                <span className="group-hover:text-blue-600 transition-colors duration-300">Continue with Google</span>
              </div>
            </Button>
            
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-3 text-white/80 text-sm">
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-medium">Enterprise-grade Security</span>
              </div>
              <div className="flex items-center justify-center space-x-6 text-white/60 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  HIPAA Compliant
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  ISO 27001
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Floating decorative elements */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-pink-400/30 to-red-500/30 rounded-full blur-xl animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }} />
        <div className="absolute top-1/2 -right-12 w-24 h-24 bg-gradient-to-br from-yellow-400/25 to-orange-500/25 rounded-full blur-lg animate-ping" style={{ animationDelay: '0.5s', animationDuration: '2s' }} />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}