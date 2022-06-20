import { createRouter, createWebHistory } from 'vue-router'
import TabelaView from '@/views/TabelaView.vue'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
		routes: [
		{
			path: '/',
			name: 'home',
			component: TabelaView
		}
	]
})

export default router
