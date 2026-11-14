<template>
  <div class="auth-layout">
    <aside class="auth-story">
      <router-link class="brand-lockup" to="/login" aria-label="SmartSpec home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span>SmartSpec</span>
      </router-link>

      <div class="story-content">
        <p class="story-kicker">REQUIREMENTS WORKSPACE</p>
        <h2>From source material to a specification your team can use.</h2>
        <p class="story-description">
          Bring documents, conversations, and ideas into one place. Shape them into clear,
          connected engineering artifacts.
        </p>

        <div class="workflow-preview" aria-label="SmartSpec workflow: inputs, use cases, and delivery artifacts">
          <div class="workflow-heading">
            <span>PROJECT FLOW</span>
            <span class="workflow-status"><i></i> READY</span>
          </div>
          <div class="workflow-steps">
            <div class="workflow-step">
              <span class="workflow-number">01</span>
              <span class="workflow-label">Inputs</span>
              <span class="workflow-detail">Documents & notes</span>
            </div>
            <div class="workflow-step">
              <span class="workflow-number">02</span>
              <span class="workflow-label">Use cases</span>
              <span class="workflow-detail">Actors & flows</span>
            </div>
            <div class="workflow-step">
              <span class="workflow-number">03</span>
              <span class="workflow-label">Artifacts</span>
              <span class="workflow-detail">Data, UML, tests</span>
            </div>
          </div>
          <div class="workflow-footer">
            <span>One source of truth</span>
            <span class="workflow-indicator"><i></i><i></i><i></i></span>
          </div>
        </div>
      </div>

      <p class="story-footer">Make every requirement easier to follow through.</p>
    </aside>

    <main class="auth-main">
      <section class="login-card" aria-labelledby="login-title">
        <router-link class="mobile-brand" to="/login" aria-label="SmartSpec home">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span>SmartSpec</span>
        </router-link>
        <p class="auth-kicker">YOUR PROJECT WORKSPACE</p>
        <h1 id="login-title" class="card-title">Log in to SmartSpec</h1>
        <p class="auth-description">Sign in to continue to your requirements workspace.</p>

        <div class="form-group">
          <form @submit.prevent="handleSubmit">
            <div class="form-group-input">
              <label for="emailOrUsername" class="form-label">Email address</label>
              <input
                type="text"
                v-model="email"
                class="form-control"
                :class="{ error: emailError }"
                id="emailOrUsername"
                placeholder="you@example.com"
                autocomplete="username"
                @input="clearErrors"
              />
              <p v-if="emailError" class="field-error">{{ emailError }}</p>
            </div>
            <div class="form-group-input" v-if="showPasswordField" id="password-input">
              <label for="password" class="form-label">Password</label>
              <input
                :type="passwordVisible ? 'text' : 'password'"
                v-model="password"
                class="form-control"
                :class="{ error: passwordError }"
                id="password"
                placeholder="Password"
                autocomplete="current-password"
                @input="clearErrors"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
                @click="togglePasswordVisibility"
              >
                <i :class="passwordVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"></i>
              </button>
              <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
            </div>
            <div class="divider">
              <span class="divider-text">or</span>
            </div>
            <div class="social-buttons-grid">
              <button type="button" class="btn btn-social" @click="loginWithGoogle">
                <i class="fab fa-google icon-margin-right"></i>
                <div class="brand">Continue with Google</div>
              </button>

              <!-- <div class="btn btn-social" @click="continueWith('facebook')">
                <i class="fab fa-facebook icon-margin-right"></i>
                <div class="brand">Continue with Facebook</div>
              </div>
              <div class="btn btn-social" @click="continueWith('apple')">
                <i class="fab fa-apple icon-margin-right" style="font-size: 1.2rem"></i>
                <div class="brand">Continue with Apple</div>
              </div> -->
            </div>
            <div class="continue-button-wrapper">
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="button-spinner"></span>
                <span v-else>{{ showPasswordField ? 'Log In' : 'Continue' }}</span>
              </button>
            </div>
          </form>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        </div>

        <router-link to="forgot-password" class="forgot-password-link"
          >Forgot your password?</router-link
        >

        <p class="signup-text">
          Don't have an account?
          <router-link to="/register" class="signup-link">Sign up for SmartSpec</router-link>
        </p>
      </section>
    </main>
    <AppModal
      v-model="modalOpen"
      :title="modalTitle"
      :message="modalMessage"
      @update:modelValue="handleModalClose"
    />
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axiosClient from '../utils/axiosClient'
import AppModal from '../components/AppModal.vue'
import { useToast } from 'vue-toastification'
export default {
  name: 'LoginView',
  components: { AppModal },
  setup() {
    const router = useRouter()
    const toast = useToast()
    const email = ref('')
    const password = ref('')
    const passwordVisible = ref(false)
    const showPasswordField = ref(false)
    const errorMessage = ref('')
    const loading = ref(false)
    const emailError = ref('')
    const passwordError = ref('')

    // Modal state
    const modalOpen = ref(false)
    const modalTitle = ref('Thông báo')
    const modalMessage = ref('')

    const openModal = (message, title = 'Thông báo', onClose = null) => {
      modalTitle.value = title
      modalMessage.value = message
      modalOpen.value = true
      // Store callback for when modal closes
      if (onClose) {
        modalOnClose.value = onClose
      }
    }

    const modalOnClose = ref(null)

    const handleModalClose = () => {
      modalOpen.value = false
      if (modalOnClose.value) {
        modalOnClose.value()
        modalOnClose.value = null
      }
    }

    // Google OAuth config
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const GOOGLE_REDIRECT_URI = new URL(
      '/api/auth/google/oauth',
      axiosClient.defaults.baseURL || 'http://localhost:8000',
    ).toString()
    const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

    function loginWithGoogle() {
      if (!GOOGLE_CLIENT_ID) {
        toast.error('Google sign-in is not configured')
        return
      }

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
      })
      window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`
    }

    const togglePasswordVisibility = () => {
      passwordVisible.value = !passwordVisible.value
    }

    const validateEmail = () => {
      emailError.value = ''
      if (!email.value) {
        emailError.value = 'Email is required'
        return false
      }
      if (!/\S+@\S+\.\S+/.test(email.value)) {
        emailError.value = 'Please enter a valid email'
        return false
      }
      return true
    }

    const validatePassword = () => {
      passwordError.value = ''
      if (!password.value) {
        passwordError.value = 'Password is required'
        return false
      }
      return true
    }

    const clearErrors = () => {
      errorMessage.value = ''
      emailError.value = ''
      passwordError.value = ''
    }

    const handleSubmit = async () => {
      clearErrors()

      if (!showPasswordField.value) {
        if (validateEmail()) {
          showPasswordField.value = true
        }
        return
      }

      if (!validateEmail() || !validatePassword()) return

      loading.value = true
      try {
        const response = await axiosClient.post('/api/auth/login', {
          email: email.value,
          password: password.value,
        })

        const data = response.data?.data
        if (!data) throw new Error('Login response không có token')

        if (data.isTwoFactorEnabled) {
          localStorage.setItem('otpToken', data.otpToken)
          localStorage.setItem('email', email.value)
          router.push('/verify-otp')
        } else {
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)
          localStorage.setItem('userId', data.sub)

          // Kiểm tra nếu là ADMIN thì chuyển vào trang admin
          try {
            const payload = JSON.parse(atob(data.accessToken.split('.')[1]))
            if (payload.system_role === 'ADMIN') {
              toast.success('Login successfully!', {
                timeout: 1000,
                onClose: () => router.push('/admin'),
              })
            } else {
              toast.success('Login successfully!', {
                timeout: 1000,
                onClose: () => router.push('/dashboard'),
              })
            }
          } catch (error) {
            console.error('Error parsing token:', error)
            toast.success('Login successfully!', {
              timeout: 1000,
              onClose: () => router.push('/dashboard'),
            })
          }
        }
      } catch (error) {
        console.error(error)
        const msg = error.response?.data?.message || 'Invalid email or password. Please try again.'
        errorMessage.value = msg
        toast.error(msg)
      } finally {
        loading.value = false
      }
    }

    return {
      email,
      password,
      passwordVisible,
      showPasswordField,
      errorMessage,
      loading,
      emailError,
      passwordError,
      modalOpen,
      modalTitle,
      modalMessage,
      togglePasswordVisibility,
      handleSubmit,
      clearErrors,
      loginWithGoogle,
      openModal,
      handleModalClose,
    }
  },
}
</script>

<style scoped>
.container-center {
  width: 100%;
  width: 450px;
  padding: 20px;
  margin: 0 auto;
}

.login-card {
  /* background-color: white; */
  border-radius: var(--radius-field);
  /* box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); */
  padding: 30px;
  text-align: center;
}

.fa-slack {
  font-size: 50px;
  color: var(--ink);
  margin-bottom: 24px;
  display: block;
  justify-self: center;
}

.card-title {
  font-size: 24px;
  margin-bottom: 24px;
  font-weight: bold;
  color: var(--ink);
}

.form-group {
  text-align: left;
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: var(--ink);
  box-shadow: 0 0 0 2px rgba(10, 10, 10, 0.2);
}

.form-control::placeholder {
  color: var(--muted);
}

.form-control.error {
  border-color: var(--danger);
}

#password-input {
  position: relative;
  margin-top: 12px;
}

.password-toggle {
  position: absolute;
  right: 15px;
  transform: translateY(40%);
  color: var(--muted);
  cursor: pointer;
  font-size: 18px;
  transition: 0.2s ease;
}

.password-toggle:hover {
  color: var(--text);
}

.divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 20px 0;
  position: relative;
}

.divider-text {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 0 15px;
  color: var(--muted);
  font-size: 14px;
}

.social-buttons-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px 20px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background-color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-sizing: border-box;
  font-weight: 500;
}

.btn-social {
  background-color: white;
  color: var(--text);
}

.btn-social:hover {
  background-color: var(--bg);
  border-color: var(--border-strong);
}

.btn-social .brand {
  text-align: center;
  flex: 1;
}

.btn-primary {
  background-color: var(--ink);
  border-color: var(--ink);
  color: white;
  font-weight: bold;
  font-size: 16px;
  padding: 16px 20px;
}

.btn-primary:hover {
  background-color: var(--ink);
  border-color: var(--ink);
}

.btn-primary:disabled {
  background-color: var(--muted);
  border-color: var(--border-strong);
  cursor: not-allowed;
}

.icon-margin-right {
  margin-right: 8px;
}

.continue-button-wrapper {
  margin-top: 24px;
  margin-bottom: 16px;
}

.error-message {
  color: var(--danger);
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
}

.field-error {
  color: var(--danger);
  font-size: 13px;
  margin-top: 5px;
}

.forgot-password-link {
  color: var(--ink);
  text-decoration: none;
  display: block;
  margin-bottom: 24px;
  font-size: 14px;
}

.forgot-password-link:hover {
  text-decoration: underline;
}

.signup-text {
  color: var(--muted);
  font-size: 14px;
  margin-top: 16px;
}

.signup-link {
  color: var(--ink);
  text-decoration: none;
  font-weight: 500;
}

.signup-link:hover {
  text-decoration: underline;
}

/* Loading animation */
/* 👇 NEW SPINNER STYLES ADDED HERE 👇 */
@keyframes spinner-a4dj62 {
  100% {
    transform: rotate(1turn);
  }
}

.button-spinner {
  width: 24px;
  height: 24px;
  display: grid;
  border: 3px solid #0000;
  border-radius: 50%;
  border-right-color: var(--border); /* Color for spinner */
  animation: spinner-a4dj62 1s infinite linear;
}

.button-spinner::before,
.button-spinner::after {
  content: '';
  grid-area: 1/1;
  margin: 1.5px;
  border: inherit;
  border-radius: 50%;
  animation: spinner-a4dj62 2s infinite;
}

.button-spinner::after {
  margin: 6px;
  animation-duration: 3s;
}

/* Responsive */
@media (max-width: 480px) {
  .container-center {
    width: 100vw;
    padding: 10px;
  }

  .login-card {
    padding: 20px;
    max-width: 300px;
  }

  .card-title {
    font-size: 20px;
  }

  .btn {
    padding: 12px 16px;
    font-size: 14px;
  }
}

.auth-layout {
  --auth-ink: var(--text);
  --auth-muted: var(--muted);
  --auth-green: var(--ink);
  --auth-orange: var(--muted);
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(420px, 1.05fr);
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--bg);
  color: var(--auth-ink);
  font-family: var(--font-body);
}

.auth-story {
  position: relative;
  isolation: isolate;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  padding: 40px 56px 32px;
  background: var(--ink);
  color: var(--muted);
}

.auth-story::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background-image:
    linear-gradient(rgba(242, 246, 232, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(242, 246, 232, 0.055) 1px, transparent 1px);
  background-size: 48px 48px;
  content: '';
  mask-image: linear-gradient(to bottom, black, transparent 90%);
}

.brand-lockup,
.mobile-brand {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 11px;
  padding: 0;
  color: inherit;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
}

.brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  transform: rotate(-8deg);
}

.brand-mark i {
  display: block;
  border-radius: var(--radius-sm) 7px var(--radius-sm) 7px;
  background: #ffffff;
}

.brand-mark i:nth-child(2),
.brand-mark i:nth-child(3) {
  background: var(--danger);
}

.story-content {
  width: min(100%, 570px);
  margin: 56px 0;
}

.story-kicker,
.auth-kicker {
  margin: 0 0 17px;
  color: var(--auth-orange);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.4px;
}

.story-kicker {
  color: #ffffff;
}

.story-content h2 {
  max-width: 540px;
  margin: 0;
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 600;
  line-height: 1.12;
}

.story-description {
  max-width: 460px;
  margin: 18px 0 32px;
  color: rgba(255, 255, 255, 0.74);
  font-size: 15px;
  line-height: 1.7;
}

.workflow-preview {
  max-width: 550px;
  padding: 20px 22px 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  background: rgba(8, 24, 20, 0.24);
}

.workflow-heading,
.workflow-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.68);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
}

.workflow-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #ffffff;
}

.workflow-status i,
.workflow-indicator i {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ffffff;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 22px 0 19px;
}

.workflow-step {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  padding: 0 14px;
  border-left: 1px solid rgba(255, 255, 255, 0.22);
}

.workflow-step:first-child {
  padding-left: 0;
  border-left: 0;
}

.workflow-number {
  color: var(--danger);
  font-size: 10px;
  font-weight: 700;
}

.workflow-label {
  color: var(--muted);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
}

.workflow-detail {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-footer {
  padding-top: 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  font-weight: 500;
  letter-spacing: 0;
}

.workflow-indicator {
  display: flex;
  gap: 5px;
}

.workflow-indicator i:nth-child(2) {
  background: var(--danger);
}

.workflow-indicator i:nth-child(3) {
  background: rgba(255, 255, 255, 0.45);
}

.story-footer {
  margin: 0;
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
}

.auth-main {
  display: grid;
  min-width: 0;
  min-height: 100vh;
  place-items: center;
  padding: 48px 56px;
}

.login-card {
  width: min(100%, 430px);
  max-width: none;
  padding: 0;
  border-radius: 0;
  text-align: left;
}

.mobile-brand {
  display: none;
  margin-bottom: 44px;
  color: var(--auth-green);
}

.mobile-brand .brand-mark i {
  background: var(--auth-green);
}

.mobile-brand .brand-mark i:nth-child(2),
.mobile-brand .brand-mark i:nth-child(3) {
  background: var(--auth-orange);
}

.auth-kicker {
  margin-bottom: 11px;
}

.card-title {
  margin: 0;
  color: var(--auth-ink);
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.15;
}

.auth-description {
  margin: 11px 0 31px;
  color: var(--auth-muted);
  font-size: 14px;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 12px;
}

.form-label {
  margin-bottom: 8px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
}

.form-control {
  min-height: 50px;
  padding: 13px 15px;
  border-color: var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--auth-ink);
  font-family: inherit;
  font-size: 14px;
}

.form-control:focus {
  border-color: var(--auth-green);
  box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.12);
}

.form-control::placeholder {
  color: var(--muted);
}

.form-group-input {
  position: relative;
}

.password-toggle {
  position: absolute;
  top: 34px;
  right: 9px;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  padding: 0;
  transform: none;
  border: 0;
  background: transparent;
  color: var(--muted);
}

.divider {
  margin: 21px 0;
  border-color: var(--border);
}

.divider-text {
  background: var(--bg);
  color: var(--muted);
  font-size: 12px;
}

.social-buttons-grid {
  margin-bottom: 13px;
}

.btn {
  min-height: 48px;
  padding: 12px 18px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
}

.btn-social {
  border-color: var(--border);
  color: var(--text);
}

.btn-social:hover {
  border-color: var(--border-strong);
  background: var(--surface);
}

.btn-primary {
  border-color: var(--auth-green);
  background: var(--auth-green);
  color: #fff;
  font-size: 14px;
}

.btn-primary:hover {
  border-color: var(--ink);
  background: var(--ink);
}

.continue-button-wrapper {
  margin: 16px 0 13px;
}

.forgot-password-link,
.signup-link {
  color: var(--auth-green);
}

.forgot-password-link {
  margin: 0 0 26px;
  font-size: 13px;
  font-weight: 600;
}

.signup-text {
  margin-top: 0;
  color: var(--auth-muted);
  font-size: 13px;
}

.signup-link {
  font-weight: 700;
}

@media (min-width: 1024px) {
  .auth-layout {
    width: calc(100% + 1.2rem);
    margin-left: -0.6rem;
  }
}

@media (max-width: 900px) {
  .auth-layout {
    display: block;
    min-height: 100vh;
    overflow: auto;
  }

  .auth-story {
    display: none;
  }

  .auth-main {
    min-height: 100vh;
    padding: 36px 24px;
  }

  .login-card {
    max-width: 430px;
  }

  .mobile-brand {
    display: inline-flex;
  }
}

@media (max-width: 480px) {
  .auth-main {
    padding: 27px 22px;
  }

  .mobile-brand {
    margin-bottom: 52px;
  }

  .card-title {
    font-size: 29px;
  }

  .auth-description {
    margin-bottom: 27px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-layout *,
  .auth-layout *::before,
  .auth-layout *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

<style>
/* Global styles for Font Awesome */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
</style>
