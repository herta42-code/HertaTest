<template>
  <div :class="[
    'px-3 py-2 rounded-2xl border-2 backdrop-blur-md flex flex-col items-center gap-1 shadow-xl transition-all min-w-[110px]',
    isActive 
      ? 'bg-amber-900/95 border-amber-400 scale-105 shadow-amber-500/40 ring-2 ring-amber-400 animate-pulse' 
      : 'bg-slate-900/85 border-amber-900/70',
    player?.hp <= 0 ? 'opacity-50 filter grayscale' : ''
  ]">
    <!-- CHARACTER PORTRAIT AVATAR WITH TURN ARROW & CARDS FAN -->
    <div class="relative">
      <!-- TURN ARROW ABOVE AVATAR (PLACED ABOVE CARDS FAN) -->
      <div v-if="isActive && player?.hp > 0" class="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none animate-bounce">
        <span :class="[
          'text-[8px] font-black px-1.5 py-0.5 rounded border border-white shadow-md leading-none tracking-wider whitespace-nowrap flex items-center gap-1',
          (turnTimeRemaining <= 10) ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400' : 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-amber-950'
        ]">
          <span>TURN</span>
          <span class="font-extrabold">{{ turnTimeRemaining }}s</span>
        </span>
        <svg viewBox="0 0 24 16" width="14" height="9" fill="none" class="-mt-0.5 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <path d="M12 16L2 2h20L12 16z" :fill="turnTimeRemaining <= 10 ? '#ef4444' : '#ffd700'" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- OPPONENT FACE-DOWN CARDS FAN ABOVE HEAD -->
      <div 
        v-if="player?.hp > 0 && player?.hand && player?.hand.length > 0" 
        :class="[
          'absolute -top-7 left-1/2 -translate-x-1/2 flex items-end justify-center pointer-events-none z-20 transition-all filter drop-shadow-md',
          player.hand.length === 1 ? 'animate-pulse' : ''
        ]"
        :title="`${player.hand.length} Cards Remaining`"
      >
        <div 
          v-for="(card, cIdx) in player.hand" 
          :key="cIdx"
          :style="{
            transform: `rotate(${(cIdx - (player.hand.length - 1) / 2) * 6}deg) translateY(${Math.abs(cIdx - (player.hand.length - 1) / 2) * 1.5}px)`,
            marginLeft: cIdx === 0 ? '0' : '-8px',
            zIndex: cIdx + 1
          }"
          :class="[
            'w-4 h-6 rounded border bg-[url(\'/photo/cards/card_back.jpg\')] bg-cover bg-center shrink-0 shadow',
            player.hand.length === 1 ? 'border-red-500 shadow-red-500/80 ring-1 ring-red-400' : 'border-amber-400/90'
          ]"
        ></div>
        <span class="absolute -top-1.5 -right-2 bg-amber-950/95 border border-amber-400 text-amber-200 text-[8px] font-black rounded-full px-1 py-0 leading-none shadow">
          {{ player.hand.length }}
        </span>
      </div>

      <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-400 overflow-hidden bg-slate-950 shadow-md">
        <img :src="player?.avatar" :alt="player?.name" class="w-full h-full object-cover" />
        <div v-if="player?.hp <= 0" class="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-red-500 font-bold text-lg">💀</div>
      </div>
    </div>

    <!-- PLAYER NAME & TITLE -->
    <div class="text-center">
      <div class="text-xs font-black text-amber-200 flex items-center gap-1 justify-center">
        <span>{{ player?.icon }}</span> {{ player?.name }}
      </div>
      <div class="text-[9px] text-amber-400/90 font-bold uppercase tracking-wider">{{ player?.title }}</div>
    </div>

    <!-- HP HEARTS -->
    <div class="relative flex items-center gap-0.5 text-red-500 text-xs">
      <div v-if="isDamaged" class="absolute -top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-[10px] font-black text-red-500 bg-black/90 px-1.5 py-0.5 rounded border border-red-500 shadow-lg whitespace-nowrap animate-bounce">
        -1 💔
      </div>
      <template v-if="player?.hp > 0">
        <span v-for="h in player?.hp" :key="h">❤️</span>
        <span v-for="h in (3 - (player?.hp || 0))" :key="'dead-'+h" class="opacity-30">🖤</span>
      </template>
      <span v-else class="text-[10px] font-bold text-red-400">ELIMINATED</span>
    </div>

    <!-- HAND CARD COUNT -->
    <span class="text-[10px] text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800">
      {{ player?.hp > 0 ? `🎴 ${player?.hand.length} Cards` : 'OUT' }}
    </span>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  player: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  turnTimeRemaining: {
    type: Number,
    default: 45
  }
})

const isDamaged = ref(false)

watch(() => props.player?.hp, (newHp, oldHp) => {
  if (oldHp !== undefined && newHp < oldHp) {
    isDamaged.value = true
    setTimeout(() => {
      isDamaged.value = false
    }, 850)
  }
})
</script>
