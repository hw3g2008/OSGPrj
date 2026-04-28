<template>
  <div
    v-if="watermarkUrl"
    aria-hidden="true"
    :style="{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      pointerEvents: 'none',
      backgroundImage: `url(${watermarkUrl})`,
      backgroundRepeat: 'repeat',
      backgroundSize: `${TILE_W}px ${TILE_H}px`,
    }"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const TILE_W = 260
const TILE_H = 140

interface OsgUser {
  userId?: number | string
  nickName?: string
}

function readUser(): OsgUser {
  try {
    const raw = localStorage.getItem('osg_user')
    return raw ? (JSON.parse(raw) as OsgUser) : {}
  } catch {
    return {}
  }
}

function formatNow(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildUrl(): string {
  const canvas = document.createElement('canvas')
  canvas.width = TILE_W
  canvas.height = TILE_H

  const ctx = canvas.getContext('2d')!
  const user = readUser()

  const line1 = 'OSG'
  const line2 = user.userId && user.nickName ? `${user.userId}  ${user.nickName}` : (user.nickName ?? '')
  const line3 = formatNow()

  ctx.save()
  ctx.translate(TILE_W / 2, TILE_H / 2)
  ctx.rotate(-Math.PI / 6)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.10)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.font = 'bold 15px Arial, sans-serif'
  ctx.fillText(line1, 0, -22)

  ctx.font = '12px Arial, sans-serif'
  ctx.fillText(line2, 0, 0)
  ctx.fillText(line3, 0, 18)

  ctx.restore()

  return canvas.toDataURL('image/png')
}

const watermarkUrl = ref('')
let timer: ReturnType<typeof setInterval> | null = null

function refresh() {
  watermarkUrl.value = buildUrl()
}

onMounted(() => {
  refresh()
  // refresh on the next minute boundary, then every 60s
  const now = new Date()
  const msToNext = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
  const initial = setTimeout(() => {
    refresh()
    timer = setInterval(refresh, 60_000)
  }, msToNext)
  onUnmounted(() => {
    clearTimeout(initial)
    if (timer) clearInterval(timer)
  })
})
</script>
