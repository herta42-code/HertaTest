<template>
  <div class="relative min-h-screen w-full bg-slate-950 font-mono text-slate-100 flex flex-col items-center justify-between p-6 overflow-hidden select-none">
    
    <!-- Background Pixel Fantasy Tavern Wallpaper -->
    <div class="absolute inset-0 bg-[url('/photo/wallpaper/main/แท่นเกมกลางหุบเขาปราสาทร้าง.png')] bg-cover bg-center filter brightness-45 contrast-125"></div>
    <div class="absolute inset-0 bg-radial from-transparent via-slate-950/70 to-slate-950"></div>

    <!-- HEADER / GAME TITLE BADGE -->
    <header class="relative z-10 text-center mt-6">
      <div class="inline-block bg-amber-950/90 border-4 border-amber-600 rounded-2xl px-8 py-4 shadow-2xl backdrop-blur-md animate-bounce-short">
        <h1 class="text-3xl md:text-5xl font-black text-amber-300 tracking-widest drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] uppercase">
          CARDS OF DECEPTION
        </h1>
        <p class="text-xs md:text-sm font-bold text-amber-200/90 tracking-wider mt-1">
          FANTASY SOCIAL DEDUCTION & BLUFFING CARD GAME
        </p>
      </div>
    </header>

    <!-- CENTER PIXEL ART CHARACTER SHOWCASE (4 SLOTS) -->
    <main class="relative z-10 w-full max-w-4xl flex flex-col items-center gap-6 my-auto">
      
      <div class="text-amber-200 text-xs font-black tracking-widest uppercase bg-slate-900/80 border border-amber-700/80 px-4 py-1.5 rounded-full shadow">
        ⚔️ CHOOSE YOUR HERO & ADVENTURE ⚔️
      </div>

      <!-- 4 CHARACTER CARDS SHOWCASE -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 w-full px-4">
        
        <!-- Hero 1 -->
        <div class="bg-amber-950/80 border-3 border-amber-600 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer backdrop-blur-sm group">
          <div class="w-full aspect-square rounded-lg bg-amber-900/60 border border-amber-700/80 overflow-hidden flex items-center justify-center p-2 group-hover:bg-amber-800/80 transition-colors">
            <img src="/photo/character/โปรเจ็กต์ใหม่ 16 [3589520].png" alt="Warrior Hero" class="w-full h-full object-contain filter drop-shadow-md">
          </div>
          <span class="text-xs font-black text-amber-300">KNIGHT</span>
        </div>

        <!-- Hero 2 -->
        <div class="bg-amber-950/80 border-3 border-amber-600 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer backdrop-blur-sm group">
          <div class="w-full aspect-square rounded-lg bg-amber-900/60 border border-amber-700/80 overflow-hidden flex items-center justify-center p-2 group-hover:bg-amber-800/80 transition-colors">
            <img src="/photo/character/โปรเจ็กต์ใหม่ 16 [60E167B].png" alt="Elf Archer" class="w-full h-full object-contain filter drop-shadow-md">
          </div>
          <span class="text-xs font-black text-amber-300">ELF HUNTER</span>
        </div>

        <!-- Hero 3 -->
        <div class="bg-amber-950/80 border-3 border-amber-600 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer backdrop-blur-sm group">
          <div class="w-full aspect-square rounded-lg bg-amber-900/60 border border-amber-700/80 overflow-hidden flex items-center justify-center p-2 group-hover:bg-amber-800/80 transition-colors">
            <img src="/photo/character/โปรเจ็กต์ใหม่ 16 [821AF33].png" alt="Mage Hero" class="w-full h-full object-contain filter drop-shadow-md">
          </div>
          <span class="text-xs font-black text-amber-300">ARCANE MAGE</span>
        </div>

        <!-- Hero 4 -->
        <div class="bg-amber-950/80 border-3 border-amber-600 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer backdrop-blur-sm group">
          <div class="w-full aspect-square rounded-lg bg-amber-900/60 border border-amber-700/80 overflow-hidden flex items-center justify-center p-2 group-hover:bg-amber-800/80 transition-colors">
            <img src="/photo/character/โปรเจ็กต์ใหม่ 16 [B5F0626].png" alt="Rogue Hero" class="w-full h-full object-contain filter drop-shadow-md">
          </div>
          <span class="text-xs font-black text-amber-300">SHADOW ROGUE</span>
        </div>

      </div>

    </main>

    <!-- NAVIGATION ACTIONS & FOOTER (PIXEL BUTTONS) -->
    <footer class="relative z-10 w-full max-w-md flex flex-col gap-4 mb-4">
      <button 
        @click="$router.push('/join')" 
        class="w-full py-4 btn-pixel-primary text-sm tracking-widest uppercase flex items-center justify-center gap-2"
      >
        <span>🗝️</span> JOIN GAME WITH CODE
      </button>

      <button 
        @click="$router.push('/create')" 
        class="w-full py-4 btn-pixel-secondary text-sm tracking-widest uppercase flex items-center justify-center gap-2"
      >
        <span>👑</span> CREATE NEW ROOM
      </button>
    </footer>

  </div>
</template>

<script setup>
</script>
