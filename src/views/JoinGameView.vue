<template>
  <div class="relative min-h-screen w-full bg-slate-950 font-mono text-slate-100 flex items-center justify-center overflow-hidden select-none p-4">
    
    <!-- Background Overlay -->
    <div class="absolute inset-0 bg-[url('/photo/wallpaper/code_room/ห้องโถงกิลด์ใต้แสงโคม%20pixel%20art.png')] bg-cover bg-center filter brightness-50 contrast-125"></div>
    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

    <!-- Back Button -->
    <button 
      @click="handleBack"
      class="absolute top-6 left-6 z-20 px-4 py-2.5 btn-pixel-back text-xs font-bold flex items-center gap-2"
    >
      <span>←</span> BACK TO MAIN
    </button>

    <!-- Main Card Container -->
    <div class="relative z-10 w-full max-w-lg mx-auto pixel-board p-6 sm:p-8 flex flex-col items-center">
      
      <h2 class="text-xl sm:text-2xl font-black text-amber-300 tracking-wider text-center border-b-2 border-dashed border-amber-900/80 pb-4 mb-6 w-full uppercase">
        🗝️ Join Room Setup
      </h2>

      <form @submit.prevent="handleJoinRoom" class="w-full flex flex-col gap-5">
        
        <!-- Player Name Input -->
        <div class="flex flex-col gap-2">
          <label for="playerName" class="text-xs font-bold text-amber-200 tracking-wider">
            YOUR PLAYER NAME:
          </label>
          <input 
            id="playerName"
            v-model.trim="playerName"
            type="text" 
            placeholder="Enter Your Name..."
            maxlength="12"
            class="w-full h-11 pixel-input font-bold text-amber-300 placeholder-amber-900/60"
            @input="errorMessage = ''"
          />
        </div>

        <!-- Room Code Input -->
        <div class="flex flex-col gap-2">
          <label for="roomCodeInput" class="text-xs font-bold text-amber-200 tracking-wider">
            ENTER ROOM CODE (e.g. COD-8899):
          </label>
          <input 
            id="roomCodeInput"
            v-model.trim="roomCodeInput"
            type="text" 
            placeholder="COD-XXXX"
            maxlength="10"
            class="w-full h-11 pixel-input font-bold text-amber-300 uppercase tracking-widest placeholder-amber-900/60"
            @input="errorMessage = ''"
          />
        </div>

        <div v-if="errorMessage" class="text-red-400 text-xs font-semibold text-center bg-red-950/80 border-2 border-red-800 py-2.5 px-3 rounded-lg">
          ⚠️ {{ errorMessage }}
        </div>

        <button 
          type="submit"
          class="w-full h-14 mt-2 btn-pixel-primary text-xs font-black tracking-wider uppercase"
        >
          JOIN ROOM LOBBY (เข้าร่วมเกม) 🗝️
        </button>

      </form>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const playerName = ref('')
const roomCodeInput = ref('')
const errorMessage = ref('')

const handleBack = () => {
  router.push('/')
}

const handleJoinRoom = () => {
  if (!playerName.value) {
    errorMessage.value = 'Please enter your player name!'
    return
  }
  if (!roomCodeInput.value) {
    errorMessage.value = 'Please enter room code!'
    return
  }

  sessionStorage.setItem('cod_username', playerName.value)
  sessionStorage.setItem('cod_room_code', roomCodeInput.value.toUpperCase())
  sessionStorage.setItem('cod_is_host', 'false')

  router.push('/lobby')
}
</script>
