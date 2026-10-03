<template>
  <Teleport to="body">
    <div v-if="modalMessage" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div class="w-full max-w-sm bg-amber-950 border-4 border-amber-600 rounded-2xl p-6 text-center flex flex-col items-center gap-4 shadow-2xl">
        
        <!-- CHARACTER DISPLAY IN MODAL -->
        <div v-if="modalChallenger && modalAccused" class="flex items-center justify-center gap-4 w-full py-2 border-b border-amber-800">
          <div class="flex flex-col items-center">
            <img :src="modalChallenger.avatar" class="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow" />
            <span class="text-[10px] font-bold text-amber-200 mt-1">{{ modalChallenger.name }}</span>
            <span class="text-[8px] text-amber-400 font-bold">CHALLENGER</span>
          </div>
          <span class="text-lg font-black text-amber-400">VS</span>
          <div class="flex flex-col items-center">
            <img :src="modalAccused.avatar" class="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow" />
            <span class="text-[10px] font-bold text-amber-200 mt-1">{{ modalAccused.name }}</span>
            <span class="text-[8px] text-amber-400 font-bold">ACCUSED</span>
          </div>
        </div>
        <div v-else-if="modalWinner" class="flex flex-col items-center gap-2 py-2">
          <div class="relative">
            <img :src="modalWinner.avatar" class="w-20 h-20 rounded-full object-cover border-4 border-amber-400 shadow-xl ring-4 ring-amber-500/50" />
            <span class="absolute -top-2 -right-2 text-2xl drop-shadow">👑</span>
          </div>
          <span class="text-sm font-black text-amber-300">{{ modalWinner.name }} ({{ modalWinner.title }})</span>
        </div>

        <h3 class="text-lg sm:text-xl font-black text-amber-300 uppercase tracking-wide">
          {{ modalTitle }}
        </h3>
        <p class="text-xs text-amber-100 leading-relaxed whitespace-pre-line">
          {{ modalMessage }}
        </p>

        <!-- FINAL STANDINGS DISPLAY -->
        <div v-if="isGameOver && modalStandings && modalStandings.length" class="w-full bg-black/50 rounded-xl p-3 border border-amber-800 flex flex-col gap-2">
          <div class="text-[10px] font-bold text-amber-400 tracking-wider text-left uppercase">
            🏆 FINAL STANDINGS (อันดับผลการแข่งขัน)
          </div>
          <div 
            v-for="(p, idx) in modalStandings" 
            :key="idx" 
            class="flex items-center gap-2 p-2 rounded-lg border text-left"
            :class="idx === 0 ? 'bg-amber-900/60 border-yellow-500/80 shadow-sm' : (idx === 1 ? 'bg-amber-950/70 border-slate-400/50' : 'bg-amber-950/50 border-amber-900/60')"
          >
            <span 
              class="text-xs font-black min-w-[32px]"
              :class="idx === 0 ? 'text-yellow-400' : (idx === 1 ? 'text-slate-200' : (idx === 2 ? 'text-amber-500' : 'text-rose-400'))"
            >
              {{ idx === 0 ? '👑 1st' : (idx === 1 ? '🥈 2nd' : (idx === 2 ? '🥉 3rd' : '💀 4th')) }}
            </span>
            <img :src="p.avatar || './photo/character/โปรเจ็กต์ใหม่ 16 [3589520].png'" class="w-7 h-7 rounded-full object-cover border border-amber-400/60" />
            <div class="flex-1 min-w-0">
              <div class="text-[11px] font-bold text-white truncate">{{ p.name }}</div>
              <div class="text-[9px] text-amber-200/80">
                {{ p.hp > 0 ? '❤️'.repeat(p.hp) : '💀 ออกจากการแข่งขัน' }}
              </div>
            </div>
            <span 
              class="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
              :class="idx === 0 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : (idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40' : 'bg-red-500/20 text-red-300 border border-red-500/40')"
            >
              {{ idx === 0 ? '👑 ชนะเลิศ' : (idx === 1 ? '🥈 รองชนะเลิศ' : (idx === 2 ? '🥉 ที่ 3' : '💀 ที่ 4')) }}
            </span>
          </div>
        </div>

        <div v-if="isGameOver" class="flex flex-col gap-2 w-full">
          <button 
            @click="$emit('restart')" 
            class="w-full py-3 btn-pixel-primary text-xs font-black uppercase tracking-wider"
          >
            🔄 PLAY AGAIN (เล่นใหม่อีกครั้ง)
          </button>
          <button 
            @click="$emit('leave')" 
            class="w-full py-2 btn-pixel-back text-xs font-black uppercase tracking-wider"
          >
            ← MAIN MENU (เมนูหลัก)
          </button>
        </div>
        <button 
          v-else
          @click="$emit('continue')" 
          class="w-full py-3 btn-pixel-primary text-xs font-black uppercase tracking-wider"
        >
          CONTINUE PLAYING (แจกไพ่ใหม่ / เล่นต่อ)
        </button>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  modalTitle: String,
  modalMessage: String,
  modalChallenger: Object,
  modalAccused: Object,
  modalWinner: Object,
  modalStandings: Array,
  isGameOver: Boolean
})

defineEmits(['restart', 'leave', 'continue'])
</script>
