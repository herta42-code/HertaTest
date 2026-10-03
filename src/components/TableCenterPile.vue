<template>
  <div class="col-start-2 row-start-2 relative w-full h-full min-h-[160px] sm:min-h-[220px] bg-amber-950/70 border-2 sm:border-4 border-amber-800 rounded-2xl sm:rounded-3xl p-2 sm:p-4 shadow-2xl flex flex-col items-center justify-center gap-1.5 sm:gap-3 backdrop-blur-sm">
    
    <!-- TABLE BOARD CENTER PILE -->
    <div class="relative w-20 h-28 sm:w-28 sm:h-36 border border-dashed border-amber-700/60 rounded-lg sm:rounded-xl flex items-center justify-center bg-slate-900/50">
      <div v-if="tablePile.length > 0" class="relative w-full h-full flex items-center justify-center">
        <div 
          v-for="(cardStack, idx) in Math.min(tablePile.length, 5)" 
          :key="idx"
          class="absolute w-16 h-24 sm:w-24 sm:h-32 bg-amber-900 border border-amber-500 rounded-md sm:rounded-lg shadow-md flex items-center justify-center text-amber-300 font-bold text-[9px] sm:text-xs"
          :style="{ transform: `rotate(${ (idx - 2) * 4 }deg) translate(${idx * 2}px, ${idx * -2}px)` }"
        >
          🎴 DECEPTION
        </div>
        <span class="absolute -bottom-2.5 bg-amber-950 border border-amber-500 text-amber-300 text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full z-20 shadow">
          {{ tablePile.length }} CARDS
        </span>
      </div>
      <span v-else class="text-[8px] sm:text-[10px] text-amber-700/80 font-bold text-center px-1">
        EMPTY PILE
      </span>
    </div>

    <!-- LAST MOVE LOG TEXT WITH AVATAR THUMBNAIL -->
    <div v-if="lastMoveInfo" class="flex items-center justify-center gap-2 text-center bg-slate-950/90 border border-amber-700/80 px-3 py-1.5 rounded-lg text-[9px] sm:text-xs text-amber-200 max-w-xs shadow">
      <img v-if="lastMovePlayerAvatar" :src="lastMovePlayerAvatar" class="w-5 h-5 rounded-full object-cover border border-amber-400 shrink-0" />
      <span>{{ lastMoveInfo }}</span>
    </div>

  </div>
</template>

<script setup>
defineProps({
  tablePile: {
    type: Array,
    default: () => []
  },
  lastMoveInfo: {
    type: String,
    default: ''
  },
  lastMovePlayerAvatar: {
    type: String,
    default: null
  }
})
</script>
