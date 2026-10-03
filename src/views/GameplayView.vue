<template>
  <div class="relative min-h-screen w-full bg-slate-950 font-mono text-slate-100 flex flex-col justify-between overflow-x-hidden select-none p-2 sm:p-4">
    
    <!-- Background Fantasy Tavern Wallpaper -->
    <div class="absolute inset-0 bg-[url('/photo/wallpaper/main/แท่นเกมกลางหุบเขาปราสาทร้าง.png')] bg-cover bg-center filter brightness-50 contrast-125"></div>
    <div class="absolute inset-0 bg-radial from-transparent via-slate-950/60 to-slate-950"></div>

    <!-- HEADER / GAME STATUS BAR -->
    <header class="relative z-10 w-full px-3 py-2 sm:px-6 sm:py-3 bg-amber-950/90 border-b-2 sm:border-b-4 border-amber-800 flex flex-wrap justify-between items-center gap-2 shadow-lg backdrop-blur-md rounded-lg">
      <div class="flex items-center gap-2 sm:gap-4">
        <button @click="leaveGame" class="px-2 py-1 sm:px-3 sm:py-1.5 btn-pixel-back text-[10px] sm:text-xs font-bold">
          ← LEAVE
        </button>
        <span class="text-amber-300 text-[10px] sm:text-xs font-black tracking-wider uppercase">
          ROOM: <span class="text-amber-400">{{ roomCode }}</span>
        </span>
      </div>

      <!-- CURRENT TARGET RANK BANNER -->
      <div class="flex items-center gap-1.5 sm:gap-2 bg-amber-900/90 border border-sm:border-2 border-amber-500 px-3 py-1 sm:px-5 sm:py-1.5 rounded-full shadow-inner animate-pulse">
        <span class="text-[10px] sm:text-xs text-amber-200 font-bold uppercase">TARGET:</span>
        <span class="text-sm sm:text-lg font-black text-amber-300 drop-shadow">TABLE {{ currentTargetRank }}</span>
      </div>

      <!-- TURN TIMER STATUS INDICATOR -->
      <div :class="[
        'flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-inner transition-colors font-bold text-xs',
        turnTimeRemaining <= 10 
          ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse ring-2 ring-red-500' 
          : turnTimeRemaining <= 15 
            ? 'bg-amber-900/90 border-amber-400 text-amber-300 ring-1 ring-amber-400' 
            : 'bg-amber-900/80 border-amber-600 text-amber-200'
      ]">
        <span>⏳ TIME:</span>
        <span :class="['font-black text-sm', turnTimeRemaining <= 10 ? 'text-red-400' : 'text-amber-300']">
          {{ turnTimeRemaining }}s
        </span>
      </div>

      <!-- TURN STATUS INDICATOR -->
      <div class="flex items-center gap-2 bg-amber-900/80 border border-amber-600 px-2.5 py-1 rounded-lg">
        <span class="text-[10px] sm:text-xs font-bold text-amber-200 uppercase">TURN:</span>
        <img :src="players[activePlayerIndex]?.avatar" class="w-6 h-6 rounded-full object-cover border border-amber-400" />
        <span class="text-xs sm:text-sm font-black text-amber-300">{{ players[activePlayerIndex]?.name }}</span>
      </div>
    </header>

    <!-- DEALING ANNOUNCEMENT BANNER -->
    <div v-if="isDealing" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex items-center gap-3 bg-amber-950/95 border-2 border-amber-400 rounded-full px-6 py-2.5 shadow-2xl shadow-amber-500/50 backdrop-blur-md animate-pulse">
      <span class="text-xl">🎴</span>
      <span class="text-xs sm:text-sm font-black text-amber-300 tracking-widest uppercase">DEALING CARDS...</span>
      <span class="text-xl">✨</span>
    </div>

    <!-- MAIN GAME BOARD (4 PLAYER SEATS & CENTER TABLE) -->
    <main class="relative z-10 flex-1 w-full max-w-6xl mx-auto py-2 sm:py-4 px-1 sm:px-4 grid grid-rows-3 grid-cols-3 gap-2 sm:gap-4 items-center">
      
      <!-- TOP PLAYER: P2 -->
      <div class="col-start-2 row-start-1 flex flex-col items-center">
        <PlayerSeat :player="players[1]" :isActive="activePlayerIndex === 1" :turnTimeRemaining="turnTimeRemaining" />
      </div>

      <!-- LEFT PLAYER: P3 -->
      <div class="col-start-1 row-start-2 flex justify-start">
        <PlayerSeat :player="players[2]" :isActive="activePlayerIndex === 2" :turnTimeRemaining="turnTimeRemaining" />
      </div>

      <!-- CENTER TABLE: PILE & ACTION NOTIFICATIONS -->
      <TableCenterPile 
        :tablePile="tablePile" 
        :lastMoveInfo="lastMoveInfo" 
        :lastMovePlayerAvatar="lastMovePlayerAvatar" 
      />

      <!-- RIGHT PLAYER: P4 -->
      <div class="col-start-3 row-start-2 flex justify-end">
        <PlayerSeat :player="players[3]" :isActive="activePlayerIndex === 3" :turnTimeRemaining="turnTimeRemaining" />
      </div>

    </main>

    <!-- BOTTOM PLAYER: P1 (YOU) & CARDS CONTROL FOOTER -->
    <footer class="relative z-20 w-full max-w-5xl mx-auto bg-amber-950/95 border-t-2 sm:border-t-4 border-amber-800 p-2 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 backdrop-blur-md rounded-t-2xl">
      
      <div class="w-full flex flex-col sm:flex-row justify-between items-center gap-2">
        <div class="flex items-center gap-3">
          <div class="relative">
            <!-- TURN ARROW ABOVE P1 AVATAR -->
            <div v-if="activePlayerIndex === 0 && players[0]?.hp > 0" class="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none animate-bounce">
              <span :class="[
                'text-[8px] font-black px-1.5 py-0.5 rounded border border-white shadow-md leading-none tracking-wider whitespace-nowrap flex items-center gap-1',
                turnTimeRemaining <= 10 ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400' : 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-amber-950'
              ]">
                <span>YOUR TURN</span>
                <span class="font-extrabold">{{ turnTimeRemaining }}s</span>
              </span>
              <svg viewBox="0 0 24 16" width="14" height="9" fill="none" class="-mt-0.5 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                <path d="M12 16L2 2h20L12 16z" :fill="turnTimeRemaining <= 10 ? '#ef4444' : '#ffd700'" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-400 overflow-hidden bg-slate-950 shadow-lg shrink-0">
              <img :src="players[0]?.avatar" :alt="players[0]?.name" class="w-full h-full object-cover" />
              <div v-if="players[0]?.hp <= 0" class="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-red-500 font-bold text-xl">💀</div>
            </div>
          </div>
          <div>
            <div class="text-xs sm:text-sm font-black text-amber-200 flex items-center gap-1">
              <span>{{ players[0]?.icon }}</span> {{ players[0]?.name }} (YOU)
            </div>
            <div class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{{ players[0]?.title }}</div>
            <div class="flex items-center gap-0.5 text-red-500 text-xs sm:text-sm mt-0.5">
              <template v-if="players[0]?.hp > 0">
                <span v-for="h in players[0]?.hp" :key="h">❤️</span>
                <span v-for="h in (3 - (players[0]?.hp || 0))" :key="'dead-'+h" class="opacity-30">🖤</span>
              </template>
              <span v-else class="text-xs font-bold text-red-400">💀 YOU ARE ELIMINATED (SPECTATING)</span>
            </div>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <button 
            @click="handleCallBluff"
            :disabled="isDealing || activePlayerIndex !== 0 || tablePile.length === 0 || lastPlayedCards.length === 0 || players[0]?.hp <= 0"
            class="flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-3 btn-pixel-danger text-[9px] sm:text-xs font-black tracking-wider uppercase disabled:opacity-40"
          >
            🔥 CALL BLUFF
          </button>

          <button 
            @click="handlePlayCards"
            :disabled="isDealing || activePlayerIndex !== 0 || selectedCards.length === 0 || selectedCards.length > 3 || players[0]?.hp <= 0"
            class="flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-3 btn-pixel-primary text-[9px] sm:text-xs font-black tracking-wider uppercase disabled:opacity-40"
          >
            🎴 PLAY {{ selectedCards.length }} CARD(s)
          </button>
        </div>
      </div>

      <!-- CARDS IN HAND -->
      <CardHand 
        :hand="players[0]?.hand" 
        :selectedCards="selectedCards" 
        :currentTargetRank="currentTargetRank"
        :getCardIcon="getCardIcon" 
        :isDealing="isDealing"
        @select="toggleSelectCard" 
      />

    </footer>

    <!-- MODAL COMPONENT -->
    <GameModal 
      :modalTitle="modalTitle"
      :modalMessage="modalMessage"
      :modalChallenger="modalChallenger"
      :modalAccused="modalAccused"
      :modalWinner="modalWinner"
      :modalStandings="modalStandings"
      :isGameOver="isGameOver"
      @restart="restartFullGame"
      @leave="leaveGame"
      @continue="closeModalAndContinue"
    />

  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameLogic } from '../composables/useGameLogic.js'
import PlayerSeat from '../components/PlayerSeat.vue'
import TableCenterPile from '../components/TableCenterPile.vue'
import CardHand from '../components/CardHand.vue'
import GameModal from '../components/GameModal.vue'

const router = useRouter()

const {
  roomCode,
  currentTargetRank,
  activePlayerIndex,
  tablePile,
  lastPlayedCards,
  selectedCards,
  lastMoveInfo,
  lastMovePlayerAvatar,
  modalTitle,
  modalMessage,
  modalChallenger,
  modalAccused,
  modalWinner,
  modalStandings,
  isGameOver,
  players,
  isDealing,
  turnTimeRemaining,
  startTurnTimer,
  stopTurnTimer,
  initGame,
  restartFullGame,
  closeModalAndContinue,
  getCardIcon,
  toggleSelectCard,
  handlePlayCards,
  handleCallBluff
} = useGameLogic()

const leaveGame = () => {
  stopTurnTimer()
  router.push('/')
}

onMounted(() => {
  initGame()
})

onUnmounted(() => {
  stopTurnTimer()
})
</script>
