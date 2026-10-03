<template>
  <div class="relative min-h-screen w-full bg-slate-950 font-mono text-slate-100 flex items-center justify-center overflow-hidden select-none p-4">
    
    <!-- Fantasy Pixel Background Overlay -->
    <div class="absolute inset-0 bg-[url('/photo/wallpaper/code_room/ห้องโถงกิลด์ใต้แสงโคม%20pixel%20art.png')] bg-cover bg-center filter brightness-50 contrast-125"></div>
    <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>

    <!-- Top Left Back Button -->
    <button 
      @click="handleBack"
      class="absolute top-6 left-6 z-20 px-4 py-2.5 btn-pixel-back text-xs font-bold flex items-center gap-2"
    >
      <span>←</span> BACK TO MAIN
    </button>

    <!-- Main Card Container: Create Room View -->
    <div class="relative z-10 w-full max-w-lg mx-auto pixel-board p-6 sm:p-8 flex flex-col items-center">
      
      <!-- Banner Title -->
      <h2 class="text-xl sm:text-2xl font-black text-amber-300 tracking-wider text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] border-b-2 border-dashed border-amber-900/80 pb-4 mb-6 w-full uppercase">
        👑 Create Room Setup
      </h2>

      <!-- Create Room Form -->
      <form @submit.prevent="handleCreateRoom" class="w-full flex flex-col gap-5">
        
        <!-- 1. Host Name Input -->
        <div class="flex flex-col gap-2">
          <label for="hostName" class="text-xs font-bold text-amber-200 tracking-wider">
            HOST PLAYER NAME:
          </label>
          <input 
            id="hostName"
            v-model.trim="hostName"
            type="text" 
            placeholder="Enter Host Name..."
            maxlength="12"
            class="w-full h-11 pixel-input font-bold text-amber-300 placeholder-amber-900/60"
            @input="errorMessage = ''"
          />
        </div>

        <!-- 2. Room Name Input -->
        <div class="flex flex-col gap-2">
          <label for="roomName" class="text-xs font-bold text-amber-200 tracking-wider">
            ROOM NAME:
          </label>
          <input 
            id="roomName"
            v-model.trim="roomName"
            type="text" 
            placeholder="e.g. Tavern of Lies #1"
            maxlength="20"
            class="w-full h-11 pixel-input font-bold text-amber-300 placeholder-amber-900/60"
            @input="errorMessage = ''"
          />
        </div>

        <!-- 3. Room Type Selection -->
        <div class="flex flex-col gap-2">
          <span class="text-xs font-bold text-amber-200 tracking-wider">ROOM PRIVACY TYPE:</span>
          <div class="grid grid-cols-2 gap-4">
            <!-- Public Option -->
            <label 
              :class="[
                'flex items-center justify-center gap-2 h-12 rounded-lg border-2 font-bold text-xs cursor-pointer transition-all',
                roomType === 'public' 
                  ? 'bg-amber-900/90 border-amber-400 text-amber-200 shadow-md scale-[1.02]' 
                  : 'bg-slate-900/80 border-amber-800/80 text-amber-500/70 hover:border-amber-700'
              ]"
            >
              <input 
                type="radio" 
                v-model="roomType" 
                value="public" 
                class="hidden" 
              />
              🌐 PUBLIC ROOM
            </label>

            <!-- Private Option -->
            <label 
              :class="[
                'flex items-center justify-center gap-2 h-12 rounded-lg border-2 font-bold text-xs cursor-pointer transition-all',
                roomType === 'private' 
                  ? 'bg-amber-900/90 border-amber-400 text-amber-200 shadow-md scale-[1.02]' 
                  : 'bg-slate-900/80 border-amber-800/80 text-amber-500/70 hover:border-amber-700'
              ]"
            >
              <input 
                type="radio" 
                v-model="roomType" 
                value="private" 
                class="hidden" 
              />
              🔒 PRIVATE ROOM
            </label>
          </div>
        </div>

        <!-- 4. Private Password Input -->
        <Transition name="expand">
          <div v-if="roomType === 'private'" class="flex flex-col gap-2 pixel-board-dark p-3.5 rounded-lg">
            <label for="roomPassword" class="text-xs font-bold text-amber-300 tracking-wider">
              SET PRIVATE ROOM PASSWORD:
            </label>
            <input 
              id="roomPassword"
              v-model.trim="roomPassword"
              type="password" 
              placeholder="Enter password..."
              maxlength="10"
              class="w-full h-10 pixel-input font-bold text-amber-300 placeholder-amber-900/60 tracking-widest"
              @input="errorMessage = ''"
            />
          </div>
        </Transition>

        <!-- Validation Error Message Alert -->
        <div v-if="errorMessage" class="text-red-400 text-xs font-semibold text-center bg-red-950/80 border-2 border-red-800 py-2.5 px-3 rounded-lg">
          ⚠️ {{ errorMessage }}
        </div>

        <!-- Create Button -->
        <button 
          type="submit"
          :disabled="isSubmitting"
          class="w-full h-14 mt-2 btn-pixel-primary text-xs font-black tracking-wider uppercase disabled:opacity-50"
        >
          CREATE & GO TO LOBBY 👑
        </button>

      </form>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const hostName = ref('')
const roomName = ref('')
const roomType = ref('public')
const roomPassword = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

const handleBack = () => {
  router.push('/')
}

const generateRandomPin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

const handleCreateRoom = () => {
  errorMessage.value = ''

  if (!hostName.value) {
    errorMessage.value = 'Please enter Host player name!'
    return
  }

  if (!roomName.value) {
    errorMessage.value = 'Please enter room name!'
    return
  }

  if (roomType.value === 'private' && !roomPassword.value) {
    errorMessage.value = 'Please set a password for private room!'
    return
  }

  isSubmitting.value = true

  const pinCode = generateRandomPin()
  const fullRoomCode = `COD-${pinCode}`

  const roomConfig = {
    isHost: true,
    hostName: hostName.value,
    roomName: roomName.value,
    roomType: roomType.value,
    roomCode: fullRoomCode,
    password: roomType.value === 'private' ? roomPassword.value : null,
    createdAt: new Date().toISOString()
  }

  sessionStorage.setItem('cod_username', hostName.value)
  sessionStorage.setItem('cod_is_host', 'true')
  sessionStorage.setItem('cod_room_config', JSON.stringify(roomConfig))

  setTimeout(() => {
    isSubmitting.value = false
    router.push('/lobby')
  }, 400)
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease-out;
  max-height: 100px;
  opacity: 1;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
