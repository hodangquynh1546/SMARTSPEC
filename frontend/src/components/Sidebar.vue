<template>
  <div class="sidebar" :class="{ 'mobile-open': isMobileOpen, mobile: isMobile }">
    <!-- Mobile Header -->
    <div v-if="isMobile" class="mobile-header">
      <button class="mobile-toggle" @click="toggleMobile">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <div class="mobile-brand">
        <h2>SMART SPEC</h2>
      </div>
    </div>

    <div class="sidebar-content" :class="{ 'mobile-hidden': isMobile && !isMobileOpen }">
      <div class="brand-section">
        <div class="brand">
          <h2>
            <router-link class="logo-link">
              <i class="fa-brands fa-slack"></i>
            </router-link>
            SMART SPEC
          </h2>
          <p>Tạo tài liệu đặc tả phần mềm chuyên nghiệp bằng AI</p>
        </div>
        <button class="new-project-btn" @click="$emit('new')">
          <i class="fa-solid fa-plus"></i> Dự án mới
        </button>
      </div>

      <nav class="navigation">
        <ul>
          <li>
            <a
              class="sidebar-link"
              href="#"
              :class="{ active: activeSection === 'recent-projects' }"
              @click.prevent="navigate('recent-projects')"
            >
              <i class="fa-solid fa-clock"></i>
              Gần đây
            </a>
          </li>
          <li>
            <a
              class="sidebar-link"
              href="#"
              :class="{ active: activeSection === 'my-projects' }"
              @click.prevent="navigate('my-projects')"
            >
              <i class="fa-brands fa-space-awesome"></i>
              Dự án của tôi
            </a>
          </li>
          <li>
            <a
              class="sidebar-link"
              href="#"
              :class="{ active: activeSection === 'shared-projects' }"
              @click.prevent="navigate('shared-projects')"
            >
              <i class="fa-regular fa-star"></i>
              Được chia sẻ
            </a>
          </li>
          <li>
            <a
              class="sidebar-link"
              href="#"
              :class="{ active: activeSection === 'trash' }"
              @click.prevent="navigate('trash')"
            >
              <i class="fa-solid fa-trash-can"></i>
              Thùng rác
            </a>
          </li>
        </ul>
      </nav>

      <div @click="toggleUserMenu" class="user-account">
        <div class="avatar">
          <img
            v-if="user && user.avatar_url"
            :src="getFullAvatarUrl(user.avatar_url)"
            @error="handleAvatarError"
            alt="User Avatar"
          />
          <div v-else class="avatar-placeholder">
            {{ userInitials }}
          </div>
        </div>

        <div v-if="user" class="user-info">
          <div class="user-name">{{ user.name || 'User' }}</div>
          <div class="user-email">{{ user.email || 'user@example.com' }}</div>
        </div>
        <div v-else class="user-info">
          <div class="user-name">Loading...</div>
          <div class="user-email">...</div>
        </div>

        <transition name="fade-slide">
          <div v-if="showUserMenu" class="user-menu">
            <ul class="menu-list">
              <li><span class="material-symbols-outlined">help</span> Trợ giúp</li>
              <li @click.stop="$emit('open-personal')">
                <span class="material-symbols-outlined">settings</span> Tài khoản
              </li>
              <li @click.stop="$router.push('/connect-claude')">
                <span class="material-symbols-outlined">hub</span> Kết nối Claude
              </li>
              <li @click.stop="openModelSelection">
                <span class="material-symbols-outlined">smart_toy</span> Chọn mô hình AI
              </li>
              <hr />
              <li @click.stop="handleLogout">
                <span class="material-symbols-outlined">logout</span> Đăng xuất
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>

    <!-- Model Selection Modal -->
    <ModelSelectionModal
      v-model="showModelModal"
      @model-selected="handleModelSelected"
    />

    <!-- Mobile Overlay -->
    <div v-if="isMobile && isMobileOpen" class="mobile-overlay" @click="closeMobile"></div>
  </div>
</template>

<script>
import { isAdmin } from '../utils/authGuard'
import axiosClient from '@/utils/axiosClient'
import ModelSelectionModal from './ModelSelectionModal.vue'

export default {
  name: 'Sidebar',
  components: {
    ModelSelectionModal,
  },
  props: {
    user: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      showUserMenu: false,
      activeSection: 'recent-projects',
      avatarLoadError: false,
      localUser: null,
      isMobile: false,
      isMobileOpen: false,
      showModelModal: false,
    }
  },
  computed: {
    userInitials() {
      if (!this.user || !this.user.name) return 'U'
      const names = this.user.name.split(' ')
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return this.user.name.substring(0, 2).toUpperCase()
    },
    isAdmin() {
      return isAdmin()
    },
  },
  watch: {
    user: {
      handler(newUser) {
        console.log('🔄 Sidebar user prop changed:', newUser?.avatar_url)
        if (newUser) {
          this.localUser = { ...newUser }
        }
      },
      deep: true,
      immediate: true,
    },
  },
  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)

    const savedSection = localStorage.getItem('activeSection')
    if (savedSection) {
      this.activeSection = savedSection
      this.$emit('navigate', savedSection)
    }

    if (!this.user) {
      this.fetchUser()
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
  },
  methods: {
    checkMobile() {
      this.isMobile = window.innerWidth <= 768
      if (!this.isMobile) {
        this.isMobileOpen = false
      }
    },
    toggleMobile() {
      this.isMobileOpen = !this.isMobileOpen
    },
    closeMobile() {
      this.isMobileOpen = false
    },
    getFullAvatarUrl(avatarUrl) {
      if (!avatarUrl) {
        console.log('❌ No avatar_url provided')
        return ''
      }

      if (avatarUrl.startsWith('http') || avatarUrl.startsWith('blob:')) {
        console.log('✅ Already full URL:', avatarUrl)
        return avatarUrl
      }

      const cleanUrl = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
      const fullUrl = `${baseUrl}${cleanUrl}`

      console.log('🔗 Sidebar constructed avatar URL:', fullUrl)
      return fullUrl
    },
    handleAvatarError(event) {
      console.error('❌ Sidebar avatar load failed:', event.target.src)
      this.avatarLoadError = true
      const img = event.target
      img.style.display = 'none'
    },
    async fetchUser() {
      try {
        console.log('🔄 Sidebar fetching user data...')
        const res = await axiosClient.get('/api/auth/me')
        this.localUser = res.data?.data || {}
        console.log('✅ Sidebar user data loaded:', this.localUser)
      } catch (error) {
        console.error('❌ Failed to fetch user in sidebar:', error)
        this.localUser = {
          name: 'User',
          email: 'user@example.com',
          avatar_url: '',
        }
      }
    },
    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu

      if (this.showUserMenu) {
        document.addEventListener('click', this.handleClickOutside)
      } else {
        document.removeEventListener('click', this.handleClickOutside)
      }
    },
    handleClickOutside(event) {
      const userMenu = this.$el.querySelector('.user-menu')
      const userAccount = this.$el.querySelector('.user-account')

      if (userMenu && !userMenu.contains(event.target) && !userAccount.contains(event.target)) {
        this.showUserMenu = false
        document.removeEventListener('click', this.handleClickOutside)
      }
    },
    handleLogout() {
      this.showUserMenu = false
      this.$emit('logout')
    },
    navigate(section) {
      this.activeSection = section
      localStorage.setItem('activeSection', section)
      this.$emit('navigate', section)
      if (this.isMobile) {
        this.closeMobile()
      }
    },
    openModelSelection() {
      this.showUserMenu = false
      this.showModelModal = true
    },
    handleModelSelected(modelName) {
      console.log('Model selected:', modelName)
      // Có thể emit event hoặc lưu vào store nếu cần
      this.$emit('model-selected', modelName)
    },
  },
}
</script>

<style scoped>
.fa-slack {
  font-size: 28px;
  color: var(--ink);
}

.sidebar {
  position: fixed;
  height: 100vh;
  width: 250px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  padding: 20px 16px 0 16px;
  border-radius: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-right: 1px solid var(--border);
  z-index: 30;
  box-shadow: none;
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

.brand h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  color: var(--text);
  margin-bottom: 5px;
}

.brand p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  margin-bottom: 20px;
  margin-left: 4px;
}

.new-project-btn {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  background: var(--ink);
  color: white;
  border: none;
  padding: 14px 16px;
  border-radius: 999px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 30px;
  width: 100%;
  font-weight: 600;
  box-shadow: var(--shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.new-project-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.new-project-btn:hover::before {
  width: 300px;
  height: 300px;
}

.new-project-btn i {
  position: absolute;
  left: 1.4em;
  font-weight: bold;
  font-size: 1.3rem;
  transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 1;
}

.new-project-btn:hover i {
  transform: rotate(180deg) scale(1.1);
}

.new-project-btn:hover {
  transform: translateY(-3px);
  background: var(--ink);
  box-shadow: var(--shadow);
}

.navigation ul {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}

.navigation li {
  margin-bottom: 8px;
}

.navigation a {
  display: block;
  padding: 10px 14px;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  border-radius: var(--radius-field);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  font-weight: 500;
}

.navigation a::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  background: rgba(10, 10, 10, 0.06);
  transition: width 0.3s ease;
}

.navigation a:hover::before {
  width: 4px;
}

.navigation a:hover {
  color: var(--ink);
  background-color: var(--sunken);
}

.navigation a.active {
  background-color: var(--ink);
  font-weight: 600;
  color: var(--ink-text);
  box-shadow: none;
}

.navigation a.active::before {
  width: 4px;
}

.sidebar-link i {
  margin-right: 10px;
  width: 16px;
  text-align: center;
}

/* User Account Section */
.user-account {
  gap: 12px;
  width: 100%;
  display: flex;
  padding: 12px;
  border-top: 1px solid var(--border);
  align-items: center;
  justify-content: flex-start;
  transition: 0.1s ease;
  cursor: pointer;
  background: var(--surface);
  margin-top: auto;
}

.user-account:hover {
  background-color: var(--bg);
}

.avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background-color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.25s ease;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.user-menu {
  position: absolute;
  bottom: 80px;
  left: 10px;
  right: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-field);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  padding: 8px 0;
  animation: fadeIn 0.2s ease;
}

.menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.menu-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: var(--text);
  font-size: 14px;
}

.menu-list li span {
  font-size: 18px;
  width: 20px;
  text-align: center;
  color: var(--muted);
}

.menu-list li:hover {
  background-color: var(--sunken);
}

.menu-list hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 6px 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  margin-bottom: 2px;
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.user-email {
  font-size: 12px;
  color: var(--muted);
  pointer-events: none;
  user-select: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* transition cho user-menu */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== RESPONSIVE STYLES ===== */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    width: 100%;
    height: 60px;
    padding: 0;
    border-radius: 0;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    height: 60px;
    background: white;
    border-bottom: 1px solid var(--border);
  }

  .mobile-toggle {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
    color: var(--text);
  }

  .mobile-brand h2 {
    margin: 0;
    font-size: 18px;
    color: var(--text);
  }

  .sidebar-content {
    position: fixed;
    top: 60px;
    left: 0;
    width: 280px;
    height: calc(100vh - 60px);
    background: white;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    padding: 20px 16px;
    border-right: 1px solid var(--border);
    overflow-y: auto;
  }

  .sidebar.mobile-open .sidebar-content {
    transform: translateX(0);
  }

  .mobile-overlay {
    position: fixed;
    top: 60px;
    left: 0;
    z-index: 999;
  }

  .brand h2 {
    font-size: 16px;
  }

  .brand p {
    font-size: 11px;
  }

  .new-project-btn {
    padding: 10px 12px;
    font-size: 13px;
    margin-bottom: 20px;
  }

  .navigation a {
    padding: 10px 12px;
    font-size: 14px;
  }

  .user-account {
    padding: 16px 12px;
  }

  .user-menu {
    bottom: 70px;
    left: 16px;
    right: 16px;
  }
}

@media (max-width: 480px) {
  .sidebar-content {
    width: 100%;
  }

  .mobile-header {
    padding: 0 12px;
  }

  .mobile-brand h2 {
    font-size: 16px;
  }

  .brand-section {
    padding: 0 8px;
  }

  .navigation a {
    padding: 12px 16px;
    font-size: 15px;
  }

  .user-account {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .user-info {
    align-items: center;
  }
}
</style>