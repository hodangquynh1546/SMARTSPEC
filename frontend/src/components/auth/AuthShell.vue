<script setup>
defineProps({ title: { type: String, required: true }, subtitle: { type: String, default: '' } })
</script>

<template>
  <div class="auth-page">
    <header class="auth-brand"><span>SMARTSPEC</span></header>
    <main class="auth-card">
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="auth-muted">{{ subtitle }}</p>
      <slot />
      <footer v-if="$slots.footer" class="auth-footer"><slot name="footer" /></footer>
    </main>
  </div>
</template>

<style>
/* Auth pages: same look as WorkHub's sign-in / sign-up (centered card, serif title, ink pill button). */
.auth-page { min-height: 100vh; background: var(--bg); color: var(--text); display: flex; flex-direction: column; align-items: center; padding: 0 16px 48px; font-family: var(--font-body); }
.auth-brand { width: 100%; padding: 20px var(--gutter); }
.auth-brand span { font-family: var(--font-display); font-weight: 600; font-size: 1.25rem; letter-spacing: 0.12em; }
.auth-card { width: min(440px, 100%); margin-top: 6vh; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 32px; display: grid; gap: 16px; }
.auth-card h1 { margin: 0; font-family: var(--font-display); font-weight: 600; font-size: 2rem; line-height: 1.15; letter-spacing: -0.02em; }
.auth-muted { margin: 0; color: var(--muted); font-size: 0.92rem; }
.auth-form { display: grid; gap: 14px; }
.auth-field { display: grid; gap: 6px; font-size: 0.85rem; font-weight: 500; }
.auth-field input { font: inherit; font-weight: 400; padding: 11px 14px; border: 1px solid var(--border-strong); border-radius: var(--radius-field); background: var(--surface); color: var(--text); }
.auth-field input:focus { outline: 2px solid var(--ink); outline-offset: 1px; }
.auth-field.invalid input { border-color: var(--danger); }
.auth-field-error { color: var(--danger); font-size: 0.8rem; font-weight: 400; }
.auth-password { position: relative; display: grid; }
.auth-password input { padding-right: 70px; }
.auth-password button { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: 0; background: transparent; color: var(--muted); font: inherit; font-size: 0.8rem; cursor: pointer; padding: 4px 8px; }
.auth-error { margin: 0; padding: 10px 14px; border-radius: var(--radius-field); background: var(--danger-soft); color: var(--danger); font-size: 0.88rem; }
.auth-success { margin: 0; padding: 10px 14px; border-radius: var(--radius-field); background: var(--success-soft); color: var(--success); font-size: 0.88rem; }
.auth-btn { font: inherit; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 20px; border-radius: 999px; border: 1px solid var(--ink); background: var(--ink); color: var(--ink-text); cursor: pointer; text-decoration: none; }
.auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.auth-btn.secondary { background: transparent; color: var(--text); border-color: var(--border-strong); }
.auth-sep { display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: 0.8rem; }
.auth-sep::before, .auth-sep::after { content: ''; height: 1px; background: var(--border); flex: 1; }
.auth-footer { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 0.88rem; color: var(--muted); }
.auth-footer a, .auth-card a:not(.auth-btn) { color: var(--text); text-underline-offset: 3px; padding: 0; transition: none; }
</style>
