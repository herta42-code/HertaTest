import { ref } from 'vue'

export function useGameLogic() {
  const CLASSIC_RANKS = ['K', 'Q', 'J', 'A']
  const FULL_DECK_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  const gameMode = ref(sessionStorage.getItem('cod_game_mode') || 'FULL_DECK')
  const drawPile = ref([])
  const roomCode = ref(sessionStorage.getItem('cod_room_code') || 'COD-8899')

  const currentTargetRank = ref('K')
  const lastPlayedTargetRank = ref(null)

  const getNextLadderRank = (currentRank) => {
    const idx = FULL_DECK_RANKS.indexOf(String(currentRank || '').trim().toUpperCase())
    if (idx === -1) return FULL_DECK_RANKS[0]
    return FULL_DECK_RANKS[(idx + 1) % FULL_DECK_RANKS.length]
  }

  const activePlayerIndex = ref(0)
  const tablePile = ref([])
  const lastPlayedCards = ref([])
  const lastPlayerIndex = ref(null)
  const selectedCards = ref([])
  const lastMoveInfo = ref('')
  const lastMovePlayerAvatar = ref(null)

  const modalTitle = ref('')
  const modalMessage = ref('')
  const modalChallenger = ref(null)
  const modalAccused = ref(null)
  const modalWinner = ref(null)
  const modalStandings = ref([])
  const isGameOver = ref(false)
  const isRoundOver = ref(false)
  const isDealing = ref(false)

  const turnTimeRemaining = ref(45)
  let turnTimer = null

  const stopTurnTimer = () => {
    if (turnTimer) {
      clearInterval(turnTimer)
      turnTimer = null
    }
  }

  const startTurnTimer = () => {
    stopTurnTimer()
    turnTimeRemaining.value = 45
    turnTimer = setInterval(() => {
      if (turnTimeRemaining.value > 0) {
        turnTimeRemaining.value--
      }
      if (turnTimeRemaining.value <= 0) {
        stopTurnTimer()
        handleTurnTimeout()
      }
    }, 1000)
  }

  const handleTurnTimeout = () => {
    stopTurnTimer()
    const timedOutPlayer = players.value[activePlayerIndex.value]
    if (timedOutPlayer && timedOutPlayer.hp > 0) {
      timedOutPlayer.hp = Math.max(0, timedOutPlayer.hp - 1)
      lastMoveInfo.value = `⏰ TIME OUT! ${timedOutPlayer.name} took too long (45s) and lost 1 HP! ❤️`

      const alivePlayers = players.value.filter(p => p.hp > 0)
      if (alivePlayers.length === 1) {
        handleGameOver(alivePlayers[0])
        return
      } else if (alivePlayers.length === 0) {
        isGameOver.value = true
        return
      }
    }
    nextTurn()
  }

  const players = ref([
    { 
      id: 1, 
      name: 'P1 (YOU)', 
      title: 'Paladin Warrior', 
      avatar: '/photo/character/โปรเจ็กต์ใหม่ 16 [3589520].png', 
      icon: '⚔️', 
      hp: 3, 
      hand: [] 
    },
    { 
      id: 2, 
      name: 'P2 (Elf)', 
      title: 'Elf Archer', 
      avatar: '/photo/character/โปรเจ็กต์ใหม่ 16 [60E167B].png', 
      icon: '🧝‍♂️', 
      hp: 3, 
      hand: [] 
    },
    { 
      id: 3, 
      name: 'P3 (Mage)', 
      title: 'Arcane Sorceress', 
      avatar: '/photo/character/โปรเจ็กต์ใหม่ 16 [821AF33].png', 
      icon: '🧙‍♀️', 
      hp: 3, 
      hand: [] 
    },
    { 
      id: 4, 
      name: 'P4 (Rogue)', 
      title: 'Shadow Assassin', 
      avatar: '/photo/character/โปรเจ็กต์ใหม่ 16 [B5F0626].png', 
      icon: '🥷', 
      hp: 3, 
      hand: [] 
    }
  ])

  const initGame = () => {
    const lobbyData = sessionStorage.getItem('cod_lobby_players')
    if (lobbyData) {
      const lobbyPlayers = JSON.parse(lobbyData)
      lobbyPlayers.forEach((lp, idx) => {
        if (players.value[idx]) {
          if (lp.name) players.value[idx].name = lp.name
          if (lp.avatar) players.value[idx].avatar = lp.avatar
          if (lp.title) players.value[idx].title = lp.title
        }
      })
    }

    restartFullGame()
  }

  const restartFullGame = () => {
    players.value.forEach(p => {
      p.hp = 3
    })
    isGameOver.value = false
    isRoundOver.value = false
    modalTitle.value = ''
    modalMessage.value = ''
    modalChallenger.value = null
    modalAccused.value = null
    modalWinner.value = null
    modalStandings.value = []
    activePlayerIndex.value = 0
    dealNewRound()
  }

  const dealNewRound = () => {
    let deck = []
    let cardId = 1
    const isFull = gameMode.value === 'FULL_DECK'
    const ranks = isFull ? FULL_DECK_RANKS : CLASSIC_RANKS
    const copies = isFull ? 4 : 6

    ranks.forEach(rank => {
      for (let i = 0; i < copies; i++) {
        deck.push({ id: cardId++, rank })
      }
    })
    deck.push({ id: cardId++, rank: 'JOKER' })
    deck.push({ id: cardId++, rank: 'JOKER' })
    if (isFull) {
      deck.push({ id: cardId++, rank: 'JOKER' })
      deck.push({ id: cardId++, rank: 'JOKER' })
    }

    deck.sort(() => Math.random() - 0.5)

    players.value.forEach((p, idx) => {
      if (p.hp > 0) {
        p.hand = deck.slice(idx * 6, (idx + 1) * 6)
      } else {
        p.hand = []
      }
    })

    drawPile.value = deck.slice(players.value.length * 6)
    currentTargetRank.value = isFull ? '2' : ranks[Math.floor(Math.random() * ranks.length)]
    lastPlayedTargetRank.value = null
    tablePile.value = []
    lastPlayedCards.value = []
    lastPlayerIndex.value = null
    selectedCards.value = []
    lastMovePlayerAvatar.value = null
    lastMoveInfo.value = `Round started! Target rank is [ TABLE ${currentTargetRank.value} ]`
    
    stopTurnTimer()
    isDealing.value = true
    setTimeout(() => {
      isDealing.value = false
      startTurnTimer()
    }, 1200)
  }

  const closeModalAndContinue = () => {
    modalMessage.value = ''
    modalChallenger.value = null
    modalAccused.value = null
    modalWinner.value = null

    if (isGameOver.value) return

    if (isRoundOver.value) {
      isRoundOver.value = false
      dealNewRound()
      return
    }

    if (players.value[activePlayerIndex.value].hp <= 0) {
      nextTurn()
    } else {
      startTurnTimer()
      if (activePlayerIndex.value !== 0) {
        setTimeout(botPlayTurn, 1200)
      }
    }
  }

  const getCardIcon = (rank) => {
    switch (rank) {
      case 'K': return '👑'
      case 'Q': return '👸'
      case 'J': return '🗡️'
      case 'A': return '⚜️'
      case 'JOKER': return '🃏'
      default: return '🎴'
    }
  }

  const toggleSelectCard = (card) => {
    if (isDealing.value || activePlayerIndex.value !== 0 || players.value[0].hp <= 0) return

    const idx = selectedCards.value.findIndex(c => c.id === card.id)
    if (idx > -1) {
      selectedCards.value.splice(idx, 1)
    } else {
      if (selectedCards.value.length < 3) {
        selectedCards.value.push(card)
      }
    }
  }

  const handlePlayCards = () => {
    if (isDealing.value || selectedCards.value.length === 0 || selectedCards.value.length > 3) return

    stopTurnTimer()

    const played = [...selectedCards.value]
    const currentPlayer = players.value[activePlayerIndex.value]

    currentPlayer.hand = currentPlayer.hand.filter(c => !played.some(p => p.id === c.id))

    // Full Deck Rule: Draw exactly 1 card when playing cards (regardless of whether 1-3 cards played)
    let drawnInfo = ''
    if (gameMode.value === 'FULL_DECK') {
      if (drawPile.value.length === 0) {
        FULL_DECK_RANKS.forEach(rank => {
          for (let i = 0; i < 4; i++) {
            drawPile.value.push({ id: Date.now() + Math.random(), rank })
          }
        })
        drawPile.value.sort(() => Math.random() - 0.5)
      }
      if (drawPile.value.length > 0) {
        const drawn = drawPile.value.pop()
        currentPlayer.hand.push(drawn)
        drawnInfo = ' (Drawn 1 card)'
      }
    }

    tablePile.value.push(...played)
    lastPlayedCards.value = played
    lastPlayerIndex.value = activePlayerIndex.value
    const claimedRank = currentTargetRank.value
    lastPlayedTargetRank.value = claimedRank

    let ladderInfo = ''
    if (gameMode.value === 'FULL_DECK') {
      currentTargetRank.value = getNextLadderRank(currentTargetRank.value)
      ladderInfo = ` (Claimed [${claimedRank}] ➔ Next: 🪜[${currentTargetRank.value}])`
    }

    lastMovePlayerAvatar.value = currentPlayer.avatar
    lastMoveInfo.value = `${currentPlayer.name} played ${played.length} card(s) face down${drawnInfo}${ladderInfo}.`
    selectedCards.value = []

    if (currentPlayer.hand.length === 0) {
      modalTitle.value = '🏆 ROUND WINNER!'
      modalWinner.value = currentPlayer
      modalMessage.value = `🎉 ${currentPlayer.name} has emptied their hand and won the round!\n\n🔄 Re-dealing new cards for all surviving players...`
      isRoundOver.value = true
      return
    }

    nextTurn()
  }

  const handleCallBluff = () => {
    if (isDealing.value || lastPlayedCards.value.length === 0 || lastPlayerIndex.value === null) return

    stopTurnTimer()

    const challenger = players.value[activePlayerIndex.value]
    const accused = players.value[lastPlayerIndex.value]

    modalChallenger.value = challenger
    modalAccused.value = accused

    const targetToCheck = lastPlayedTargetRank.value || currentTargetRank.value
    const playedRanks = lastPlayedCards.value.map(c => c.rank || c)
    const isLying = lastPlayedCards.value.some(card => {
      const r = typeof card === 'string' ? card : card.rank
      return r !== targetToCheck && r !== 'JOKER'
    })

    const loser = isLying ? accused : challenger

    loser.hp = Math.max(0, loser.hp - 1)

    const cardsDetailStr = playedRanks.join(', ')

    if (isLying) {
      modalTitle.value = '🎯 BLUFF CAUGHT!'
      modalMessage.value = `🔍 Cards on table revealed: [ ${cardsDetailStr} ]\n\n🔥 ${challenger.name} caught ${accused.name} LYING!\nClaimed target was TABLE [ ${targetToCheck} ].\n\n💔 ${accused.name} lost 1 HP! (${accused.hp > 0 ? `${accused.hp} HP left` : 'ELIMINATED 💀'})`
    } else {
      modalTitle.value = '❌ WRONG CHALLENGE!'
      modalMessage.value = `🔍 Cards on table revealed: [ ${cardsDetailStr} ]\n\n🛡️ ${accused.name} was telling the TRUTH!\nClaimed target was TABLE [ ${targetToCheck} ].\n\n💔 ${challenger.name} lost 1 HP! (${challenger.hp > 0 ? `${challenger.hp} HP left` : 'ELIMINATED 💀'})`
    }

    const alivePlayers = players.value.filter(p => p.hp > 0)

    if (alivePlayers.length === 1) {
      handleGameOver(alivePlayers[0])
      return
    }

    isRoundOver.value = true
  }

  const handleGameOver = (winnerPlayer) => {
    stopTurnTimer()
    isGameOver.value = true
    modalWinner.value = winnerPlayer
    modalTitle.value = '🏆 GAME OVER - ULTIMATE WINNER!'
    modalMessage.value = `🎉 ${winnerPlayer.name} IS THE SOLE SURVIVOR AND THE ULTIMATE WINNER! 👑\n\nAll other players have been eliminated!`
    
    // Sort players: winner first, then by remaining HP
    const list = [...players.value].sort((a, b) => {
      if (a.id === winnerPlayer.id) return -1
      if (b.id === winnerPlayer.id) return 1
      return (b.hp || 0) - (a.hp || 0)
    })
    modalStandings.value = list
  }

  const nextTurn = () => {
    stopTurnTimer()

    const alivePlayers = players.value.filter(p => p.hp > 0)
    if (alivePlayers.length === 1) {
      handleGameOver(alivePlayers[0])
      return
    }

    do {
      activePlayerIndex.value = (activePlayerIndex.value + 1) % 4
    } while (players.value[activePlayerIndex.value].hp <= 0)

    startTurnTimer()

    if (activePlayerIndex.value !== 0) {
      setTimeout(botPlayTurn, 1200)
    }
  }

  const botPlayTurn = () => {
    const bot = players.value[activePlayerIndex.value]
    if (!bot || bot.hp <= 0) {
      nextTurn()
      return
    }

    if (modalMessage.value) {
      return
    }

    const cardCount = lastPlayedCards.value.length
    const bluffChance = cardCount === 3 ? 0.45 : (cardCount === 2 ? 0.30 : 0.15)

    if (tablePile.value.length > 0 && lastPlayedCards.value.length > 0 && Math.random() < bluffChance) {
      handleCallBluff()
      return
    }

    const numCardsToPlay = Math.min(bot.hand.length, Math.floor(Math.random() * 2) + 1)
    if (numCardsToPlay <= 0) {
      nextTurn()
      return
    }

    const cardsToPlay = bot.hand.slice(0, numCardsToPlay)
    bot.hand = bot.hand.filter(c => !cardsToPlay.some(p => p.id === c.id))

    tablePile.value.push(...cardsToPlay)
    lastPlayedCards.value = cardsToPlay
    lastPlayerIndex.value = activePlayerIndex.value

    lastMovePlayerAvatar.value = bot.avatar
    lastMoveInfo.value = `${bot.name} played ${cardsToPlay.length} card(s) face down.`

    if (bot.hand.length === 0) {
      stopTurnTimer()
      modalTitle.value = '🏆 ROUND WINNER!'
      modalWinner.value = bot
      modalMessage.value = `🎉 ${bot.name} has emptied their hand and won the round!\n\n🔄 Re-dealing new cards for all surviving players...`
      isRoundOver.value = true
      return
    }

    nextTurn()
  }

  return {
    gameMode,
    roomCode,
    currentTargetRank,
    lastPlayedTargetRank,
    getNextLadderRank,
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
  }
}
