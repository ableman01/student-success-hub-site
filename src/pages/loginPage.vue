<template>
  <main class="login-page">
    <div class="auth-shell">
      <header class="auth-header">
        <RouterLink aria-label="LASU Student Success Hub home" class="auth-brand" to="/">
          <img alt="" src="/academic-mark.svg">
          <span>LASU Student Success Hub</span>
        </RouterLink>

        <div class="auth-header-actions">
          <span class="header-prompt">New to the hub?</span>
          <v-btn rounded="pill" to="/signup" variant="text">Create account</v-btn>
        </div>
      </header>

      <section class="auth-layout">
        <aside class="auth-story">
          <div class="story-content">
            <span class="story-kicker"><v-icon size="16">mdi-school-outline</v-icon> YOUR STUDY SPACE</span>
            <h1>Welcome back to your next big step.</h1>

            <p>
              Pick up where you left off. Your assignments, class materials,
              and study goals are waiting for you.
            </p>

            <div class="story-points">
              <div><v-icon>mdi-check-circle-outline</v-icon><span>Keep your coursework organized</span></div>
              <div><v-icon>mdi-check-circle-outline</v-icon><span>Find resources shared by students</span></div>
              <div><v-icon>mdi-check-circle-outline</v-icon><span>Make steady progress, one day at a time</span></div>
            </div>
          </div>

          <div aria-hidden="true" class="story-illustration">
            <div class="illustration-orbit" />

            <div class="illustration-book">
              <v-icon size="80">mdi-book-open-page-variant</v-icon>
            </div>

            <div class="illustration-spark spark-one">✦</div>
            <div class="illustration-spark spark-two">✧</div>
            <div class="illustration-caption">A space to learn<br>and grow together.</div>
          </div>

          <div class="story-footer">LEARN TOGETHER. GO FURTHER.</div>
        </aside>

        <v-card class="login-card" elevation="0" rounded="xl">
          <div class="login-card-heading">
            <div class="login-icon"><v-icon>mdi-account-school-outline</v-icon></div>

            <div class="mode-pill">
              <span class="mode-dot" />
              {{ isSupabaseConfigured ? 'SECURE ONLINE SIGN IN' : 'LOCAL TEST MODE' }}
            </div>

            <h2>Good to see you again.</h2>
            <p>Log in with your student account to continue.</p>
          </div>

          <v-alert
            v-if="isSupabaseConfigured && route.query.authError === 'session-check'"
            class="mb-5"
            type="error"
            variant="tonal"
          >
            Could not verify your session with Supabase. Check your connection and try again.
          </v-alert>

          <v-alert
            v-else-if="!isSupabaseConfigured"
            class="mb-5"
            density="compact"
            type="info"
            variant="tonal"
          >
            {{ modeMessage }}
          </v-alert>

          <v-form class="login-form" @submit.prevent="login">
            <v-text-field
              v-model="email"
              autocomplete="email"
              autofocus
              color="primary"
              label="Student email"
              prepend-inner-icon="mdi-email-outline"
              required
              type="email"
              variant="outlined"
            />

            <v-text-field
              v-model="password"
              :append-inner-icon="visible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              autocomplete="current-password"
              color="primary"
              label="Password"
              prepend-inner-icon="mdi-lock-outline"
              required
              :type="visible ? 'text' : 'password'"
              variant="outlined"
              @click:append-inner="visible = !visible"
            />

            <v-alert
              v-if="errorMessage"
              class="mb-4"
              type="error"
              variant="tonal"
            >
              {{ errorMessage }}
            </v-alert>

            <v-btn
              block
              class="login-submit"
              color="primary"
              :loading="loading"
              rounded="lg"
              size="large"
              type="submit"
            >
              Log in to your dashboard
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-form>

          <div class="login-divider"><span>YOUR ACADEMIC SPACE</span></div>

          <p class="login-signup">
            New to the community?
            <RouterLink to="/signup">Create your account</RouterLink>
          </p>

          <RouterLink class="back-home" to="/">
            <v-icon size="17">mdi-arrow-left</v-icon>
            Back to home
          </RouterLink>
        </v-card>
      </section>

      <footer class="auth-footer">
        <span>LASU Student Success Hub</span>
        <span>Built for your academic journey</span>
      </footer>
    </div>
  </main>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { signIn } from '@/lib/auth'
  import { isSupabaseConfigured } from '@/lib/supabase'

  const route = useRoute()
  const router = useRouter()
  const visible = ref(false)
  const email = ref('')
  const password = ref('')
  const loading = ref(false)
  const errorMessage = ref('')
  const modeMessage = computed(() => isSupabaseConfigured
    ? 'Connected to Supabase. Log in using your online account.'
    : 'Local test mode. Log in to a demo account created in this browser tab.')

  function getErrorMessage (error: unknown) {
    return error instanceof Error
      ? error.message
      : 'Login failed. Please try again.'
  }

  async function login () {
    errorMessage.value = ''
    loading.value = true

    try {
      const user = await signIn(email.value, password.value)
      if (!user) {
        throw new Error('Login did not return a user. Please try again.')
      }

      const redirect = route.query.redirect
      const destination = typeof redirect === 'string'
        && redirect.startsWith('/')
        && !redirect.startsWith('//')
        ? redirect
        : '/dashboard'

      await router.replace(destination)
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  .login-page {
    min-height: 100vh;
    padding: 0 28px;
    color: #203a4a;
    background:
      radial-gradient(ellipse at 9% 28%, rgb(218 235 224 / 58%), transparent 29rem),
      radial-gradient(ellipse at 92% 90%, rgb(241 229 201 / 45%), transparent 27rem),
      #f4f6f2;
  }

  .auth-shell {
    width: min(100%, 1160px);
    min-height: 100vh;
    margin-inline: auto;
  }

  .auth-header {
    display: flex;
    min-height: 86px;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .auth-brand {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    color: #19394c;
    font-size: 14px;
    font-weight: 750;
    text-decoration: none;
  }

  .auth-brand img {
    width: 42px;
    height: 42px;
  }

  .auth-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-prompt {
    color: #78858a;
    font-size: 12px;
  }

  .auth-layout {
    display: grid;
    min-height: min(690px, calc(100vh - 140px));
    grid-template-columns: 1fr 0.9fr;
    overflow: hidden;
    border: 1px solid rgb(222 229 220 / 88%);
    border-radius: 27px;
    background: #fffefa;
    box-shadow: 0 26px 70px rgb(28 55 57 / 10%);
  }

  .auth-story {
    position: relative;
    display: flex;
    min-height: 600px;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    padding: 58px 54px 28px;
    color: #fff;
    background:
      radial-gradient(ellipse at 75% 76%, rgb(103 143 119 / 42%), transparent 22rem),
      linear-gradient(145deg, #17394e 4%, #1e4b58 55%, #2f655b 100%);
  }

  .auth-story::before,
  .auth-story::after {
    position: absolute;
    right: -130px;
    bottom: -220px;
    width: 510px;
    height: 510px;
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 50%;
    content: '';
  }

  .auth-story::after {
    right: -70px;
    bottom: -160px;
    width: 390px;
    height: 390px;
  }

  .story-content,
  .story-illustration,
  .story-footer {
    position: relative;
    z-index: 1;
  }

  .story-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #dfd09f;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }

  .story-content h1 {
    max-width: 430px;
    margin: 23px 0 15px;
    font-size: clamp(2.25rem, 4.3vw, 3.5rem);
    font-weight: 750;
    letter-spacing: -0.055em;
    line-height: 1.04;
  }

  .story-content > p {
    max-width: 420px;
    margin: 0;
    color: rgb(255 255 255 / 75%);
    font-size: 14px;
    line-height: 1.7;
  }

  .story-points {
    display: grid;
    gap: 14px;
    margin-top: 30px;
  }

  .story-points > div {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgb(255 255 255 / 88%);
    font-size: 12px;
  }

  .story-points .v-icon {
    color: #d9c27c;
    font-size: 18px;
  }

  .story-illustration {
    display: flex;
    min-height: 195px;
    align-items: center;
    justify-content: center;
    gap: 21px;
    padding-top: 13px;
  }

  .illustration-orbit {
    position: absolute;
    width: 200px;
    height: 200px;
    border: 1px solid rgb(255 255 255 / 14%);
    border-radius: 50%;
    box-shadow: 0 0 0 24px rgb(255 255 255 / 3%), 0 0 0 50px rgb(255 255 255 / 2%);
  }

  .illustration-book {
    display: grid;
    width: 148px;
    height: 135px;
    place-items: center;
    border: 1px solid rgb(255 255 255 / 53%);
    border-radius: 30px;
    color: #e2c97f;
    background: linear-gradient(145deg, #fffdf5, #e9eadc);
    box-shadow: 0 23px 42px rgb(6 23 33 / 25%);
    transform: rotate(-7deg);
  }

  .illustration-book .v-icon {
    color: #285b5b;
  }

  .illustration-caption {
    color: rgb(255 255 255 / 89%);
    font-size: 15px;
    font-weight: 650;
    line-height: 1.4;
  }

  .illustration-spark {
    position: absolute;
    color: #e2c97f;
    font-size: 28px;
  }

  .spark-one {
    top: 15px;
    left: 21%;
  }

  .spark-two {
    right: 20%;
    bottom: 18px;
    color: #d6e3ca;
  }

  .story-footer {
    color: rgb(255 255 255 / 50%);
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.17em;
  }

  .login-card {
    align-self: center;
    margin: 38px auto;
    padding: 40px clamp(28px, 5vw, 62px);
    background: transparent;
    box-shadow: none;
  }

  .login-card-heading {
    margin-bottom: 25px;
  }

  .login-icon {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    margin-bottom: 19px;
    border-radius: 15px;
    color: #4f8069;
    background: #e9f1e8;
    font-size: 23px;
  }

  .mode-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 11px;
    color: #648371;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.13em;
  }

  .mode-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #609274;
    box-shadow: 0 0 0 4px #e5eee5;
  }

  .login-card-heading h2 {
    margin: 0;
    color: #203a4a;
    font-size: clamp(1.7rem, 3vw, 2.1rem);
    font-weight: 750;
    letter-spacing: -0.045em;
  }

  .login-card-heading p {
    margin: 8px 0 0;
    color: #7b888c;
    font-size: 13px;
  }

  .login-form {
    display: grid;
    gap: 7px;
  }

  .login-submit {
    min-height: 52px;
    margin-top: 8px;
    font-weight: 700;
  }

  .login-divider {
    display: flex;
    align-items: center;
    gap: 11px;
    margin: 26px 0 17px;
    color: #9aa3a1;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.13em;
  }

  .login-divider::before,
  .login-divider::after {
    height: 1px;
    flex: 1;
    background: #e7eae3;
    content: '';
  }

  .login-signup {
    margin: 0;
    color: #718087;
    font-size: 12px;
    text-align: center;
  }

  .login-signup a {
    margin-left: 3px;
    color: #2f705c;
    font-weight: 750;
    text-decoration: none;
  }

  .back-home {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    margin-top: 24px;
    color: #839094;
    font-size: 11px;
    text-decoration: none;
  }

  .auth-footer {
    display: flex;
    min-height: 54px;
    align-items: center;
    justify-content: space-between;
    color: #879294;
    font-size: 10px;
  }

  :global(.v-theme--academicDark) .login-page {
    color: #e4ecee;
    background:
      radial-gradient(ellipse at 9% 28%, rgb(41 83 73 / 27%), transparent 29rem),
      radial-gradient(ellipse at 92% 90%, rgb(114 92 45 / 17%), transparent 27rem),
      #101a21;
  }

  :global(.v-theme--academicDark) .auth-layout {
    border-color: #30414a;
    background: #1b2932;
  }

  :global(.v-theme--academicDark) .auth-brand,
  :global(.v-theme--academicDark) .login-card-heading h2 {
    color: #e5eeec;
  }

  :global(.v-theme--academicDark) .header-prompt,
  :global(.v-theme--academicDark) .login-card-heading p,
  :global(.v-theme--academicDark) .login-signup,
  :global(.v-theme--academicDark) .back-home {
    color: #a4b3b7;
  }

  :global(.v-theme--academicDark) .login-icon {
    color: #a5cbbb;
    background: #2b403b;
  }

  :global(.v-theme--academicDark) .login-divider::before,
  :global(.v-theme--academicDark) .login-divider::after {
    background: #33434b;
  }

  :global(.v-theme--academicDark) .login-signup a {
    color: #a5cbbb;
  }

  :global(.v-theme--campusGreen) .login-page {
    background:
      radial-gradient(ellipse at 9% 28%, #d3e6d8, transparent 29rem),
      radial-gradient(ellipse at 92% 90%, #e8e3c9, transparent 27rem),
      #edf4ee;
  }

  :global(.v-theme--libraryWarm) .login-page {
    background:
      radial-gradient(ellipse at 9% 28%, #eee0cc, transparent 29rem),
      radial-gradient(ellipse at 92% 90%, #eadcc7, transparent 27rem),
      #f7f0e6;
  }

  :global(.v-theme--libraryWarm) .auth-layout {
    border-color: #e9ddcd;
    background: #fffaf2;
  }

  :global(.v-theme--libraryWarm) .auth-brand,
  :global(.v-theme--libraryWarm) .login-card-heading h2 {
    color: #57412f;
  }

  :global(.v-theme--scholarBlue) .login-page {
    background:
      radial-gradient(ellipse at 9% 28%, #d8e6f1, transparent 29rem),
      radial-gradient(ellipse at 92% 90%, #e6e9ef, transparent 27rem),
      #eef3f8;
  }

  :global(.v-theme--scholarBlue) .auth-layout {
    border-color: #dbe5ee;
    background: #fbfdff;
  }

  :global(.v-theme--scholarBlue) .auth-brand,
  :global(.v-theme--scholarBlue) .login-card-heading h2 {
    color: #294766;
  }

  @media (max-width: 800px) {
    .auth-layout {
      grid-template-columns: 1fr;
    }

    .auth-story {
      min-height: 370px;
      padding: 38px 34px 20px;
    }

    .story-content h1 {
      max-width: 560px;
      font-size: clamp(2.2rem, 7vw, 3.2rem);
    }

    .story-illustration {
      position: absolute;
      right: 12px;
      bottom: 18px;
      min-height: 145px;
      transform: scale(0.67);
      transform-origin: right bottom;
    }

    .illustration-caption {
      display: none;
    }

    .story-footer {
      margin-top: 23px;
    }

    .login-card {
      width: min(100%, 520px);
      margin: 0 auto;
      padding: 37px 30px;
    }
  }

  @media (max-width: 500px) {
    .login-page {
      padding-inline: 14px;
    }

    .auth-header {
      min-height: 72px;
    }

    .auth-brand {
      gap: 8px;
      font-size: 11px;
    }

    .auth-brand img {
      width: 35px;
      height: 35px;
    }

    .auth-header-actions {
      gap: 2px;
    }

    .header-prompt {
      display: none;
    }

    .auth-header-actions .v-btn {
      font-size: 11px;
    }

    .auth-layout {
      border-radius: 21px;
    }

    .auth-story {
      min-height: 365px;
      padding: 33px 25px 20px;
    }

    .story-content h1 {
      max-width: 300px;
      font-size: 2.45rem;
    }

    .story-content > p {
      max-width: 300px;
      font-size: 12px;
    }

    .story-points {
      gap: 9px;
      margin-top: 20px;
    }

    .story-points > div {
      gap: 7px;
      font-size: 10px;
    }

    .story-illustration {
      right: -36px;
      bottom: 4px;
      opacity: 0.58;
      transform: scale(0.48);
    }

    .login-card {
      padding: 32px 21px;
    }

    .auth-footer {
      font-size: 9px;
    }
  }
</style>
