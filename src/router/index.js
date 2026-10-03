import { createRouter, createWebHistory } from 'vue-router'
import MainMenuView from '../views/MainMenuView.vue'
import JoinGameView from '../views/JoinGameView.vue'
import CreateRoomView from '../views/CreateRoomView.vue'
import LobbyView from '../views/LobbyView.vue'
import GameplayView from '../views/GameplayView.vue'

const routes = [
  { path: '/', name: 'Home', component: MainMenuView },
  { path: '/join', name: 'JoinGame', component: JoinGameView },
  { path: '/create', name: 'CreateRoom', component: CreateRoomView },
  { path: '/lobby', name: 'Lobby', component: LobbyView },
  { path: '/gameplay', name: 'Gameplay', component: GameplayView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
