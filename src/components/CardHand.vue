<template>
  <div v-if="hand.length > 0" class="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto py-2 px-2 w-full max-w-4xl min-h-[90px] sm:min-h-[110px]">
    <div 
      v-for="(card, index) in hand" 
      :key="card.id"
      @click="!isDealing && $emit('select', card)"
      :style="{ animationDelay: (index * 70) + 'ms' }"
      :class="[
        'relative min-w-[52px] w-14 sm:w-16 h-22 sm:h-26 rounded-lg border-2 flex flex-col justify-between p-1 cursor-pointer transition-all transform shadow-md select-none shrink-0 animate-card-deal-in',
        isDealing ? 'pointer-events-none opacity-90' : '',
        selectedCards.some(c => c.id === card.id)
          ? 'bg-amber-300 border-amber-100 -translate-y-3 sm:-translate-y-4 shadow-amber-400/50 ring-2 ring-amber-400'
          : (String(card.rank).trim().toUpperCase() === String(currentTargetRank).trim().toUpperCase()
              ? 'bg-emerald-950/80 border-emerald-400 shadow-emerald-500/30 ring-1 ring-emerald-400/60 hover:-translate-y-1'
              : 'bg-amber-900/90 border-amber-600 hover:-translate-y-1')
      ]"
    >
      <div class="flex items-center justify-between w-full">
        <span class="text-[9px] sm:text-xs font-black text-amber-200">{{ card.rank }}</span>
        <!-- Real-time dynamic MATCH / BLUFF / WILD badge -->
        <span 
          :class="[
            'text-[7px] font-black px-1 py-0.5 rounded tracking-tighter uppercase',
            card.rank === 'JOKER'
              ? 'bg-purple-600 text-white'
              : (String(card.rank).trim().toUpperCase() === String(currentTargetRank).trim().toUpperCase()
                  ? 'bg-emerald-400 text-black font-extrabold shadow-sm'
                  : 'bg-red-600/80 text-white')
          ]"
        >
          {{ card.rank === 'JOKER' ? 'WILD' : (String(card.rank).trim().toUpperCase() === String(currentTargetRank).trim().toUpperCase() ? 'MATCH' : 'BLUFF') }}
        </span>
      </div>
      <span class="text-center text-base sm:text-xl">{{ getCardIcon(card.rank) }}</span>
      <span class="text-[9px] sm:text-xs font-black text-amber-200 text-right">{{ card.rank }}</span>
    </div>
  </div>
  <div v-else class="py-2 text-center text-xs text-amber-400 font-bold">
    👀 คุณถูกคัดออกแล้ว (กำลังรับชมบอทเล่นต่อจนเหลือผู้ชนะคนเดียว)
  </div>
</template>

<script setup>
defineProps({
  hand: {
    type: Array,
    default: () => []
  },
  selectedCards: {
    type: Array,
    default: () => []
  },
  currentTargetRank: {
    type: String,
    default: 'K'
  },
  getCardIcon: {
    type: Function,
    required: true
  },
  isDealing: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select'])
</script>

<style scoped>
@keyframes cardDealInVue {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.6) rotateX(45deg);
  }
  70% {
    opacity: 1;
    transform: translateY(-6px) scale(1.05) rotateX(0deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateX(0deg);
  }
}

.animate-card-deal-in {
  animation: cardDealInVue 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
}
</style>
