<template>
  <div class="relative min-h-screen w-full bg-slate-950 font-mono text-slate-100 flex flex-col items-center justify-between p-4 overflow-hidden select-none">
    
    <!-- Background Wallpaper -->
    <div class="absolute inset-0 bg-[url('/photo/wallpaper/code_room/ห้องโถงกิลด์ใต้แสงโคม%20pixel%20art.png')] bg-cover bg-center filter brightness-45 contrast-125"></div>
    <div class="absolute inset-0 bg-radial from-transparent via-slate-950/70 to-slate-950"></div>

    <!-- Header -->
    <header class="relative z-10 w-full max-w-4xl flex justify-between items-center bg-amber-950/90 border-b-4 border-amber-800 p-4 rounded-xl shadow-lg mt-2">
      <button @click="leaveLobby" class="px-3 py-1.5 btn-pixel-back text-xs font-bold">
        ← LEAVE LOBBY
      </button>
      <div class="text-amber-300 text-xs sm:text-sm font-black tracking-wider uppercase">
        ROOM CODE: <span class="text-amber-400 font-black">{{ roomCode }}</span>
      </div>
    </header>

    <!-- Lobby Content -->
    <main class="relative z-10 w-full max-w-4xl pixel-board p-6 flex flex-col items-center gap-6 my-auto">
      <h2 class="text-lg sm:text-2xl font-black text-amber-300 uppercase tracking-wider text-center border-b-2 border-dashed border-amber-900/80 pb-3 w-full">
        🏰 WAITING LOBBY (4 PLAYERS)
      </h2>

      <!-- 4 Slots -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        <div 
          v-for="(player, idx) in slots" 
          :key="idx"
          :class="[
            'border-2 rounded-xl p-4 flex flex-col items-center gap-2 shadow-lg transition-all',
            player ? 'bg-amber-950/80 border-amber-600' : 'bg-slate-900/60 border-amber-900/50 opacity-40'
          ]"
        >
          <template v-if="player">
            <img :src="player.avatar" class="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow" />
            <span class="text-xs font-black text-amber-200 text-center">{{ player.name }}</span>
            <span class="text-[9px] font-bold text-amber-400 uppercase">{{ player.title }}</span>
            <span class="text-[10px] text-green-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded-full border border-green-800">READY</span>
          </template>
          <template v-else>
            <div class="w-16 h-16 rounded-full border-2 border-dashed border-amber-800/60 flex items-center justify-center text-xl">⏳</div>
            <span class="text-xs font-bold text-amber-500/70">WAITING...</span>
            <span class="text-[9px] text-amber-700 uppercase">EMPTY SLOT</span>
            <span class="text-[10px] text-amber-600/60 bg-slate-950/40 px-2 py-0.5 rounded-full">WAITING</span>
          </template>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 w-full max-w-lg mt-4">
        <button 
          v-if="!botsAdded"
          @click="addBots" 
          class="flex-1 h-12 btn-pixel-secondary text-xs sm:text-sm font-black tracking-wider uppercase"
        >
          🤖 PLAY WITH AI
        </button>
        <button 
          @click="startGame" 
          :disabled="!botsAdded"
          :class="[
            'flex-1 h-12 btn-pixel-primary text-xs sm:text-sm font-black tracking-wider uppercase',
            !botsAdded ? 'opacity-50 cursor-not-allowed' : ''
          ]"
        >
          ⚔️ START BATTLE NOW ⚔️
        </button>
      </div>
    </main>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const roomCode = ref(sessionStorage.getItem('cod_room_code') || 'COD-8899')
const botsAdded = ref(false)

const hostPlayer = { 
  name: sessionStorage.getItem('cod_username') || 'Host (YOU)', 
  title: 'Paladin Warrior', 
  avatar: '/photo/character/โปรเจ็กต์ใหม่ 16 [3589520].png' 
}

const botPlayers = [
  { name: 'Player 2 (Elf)', title: 'Elf Archer', avatar: '/photo/character/โปรเจ็กต์ใหม่ 16 [60E167B].png' },
  { name: 'Player 3 (Mage)', title: 'Arcane Sorceress', avatar: '/photo/character/โปรเจ็กต์ใหม่ 16 [821AF33].png' },
  { name: 'Player 4 (Rogue)', title: 'Shadow Assassin', avatar: '/photo/character/โปรเจ็กต์ใหม่ 16 [B5F0626].png' }
]

const slots = computed(() => {
  if (botsAdded.value) {
    return [hostPlayer, ...botPlayers]
  }
  return [hostPlayer, null, null, null]
})

const addBots = () => {
  botsAdded.value = true
}

const startGame = () => {
  if (!botsAdded.value) return
  sessionStorage.setItem('cod_lobby_players', JSON.stringify([hostPlayer, ...botPlayers]))
  router.push('/gameplay')
}

const leaveLobby = () => {
  router.push('/')
}
</script>
