<template>
  <main class="about-us-page">
    <v-container class="about-us-container py-10 py-md-16">
      <RouterLink class="about-back" to="/">
        <v-icon start>mdi-arrow-left</v-icon> Back to home
      </RouterLink>

      <header class="about-us-heading">
        <span class="about-us-kicker">WHY WE BUILT THIS</span>
        <h1>About the Student Success Hub</h1>
        <p>A practical study space created to support students with the tools and community they need to succeed.</p>
      </header>

      <v-card class="reason-card pa-6 pa-md-10" elevation="0" rounded="xl">
        <span class="about-us-kicker">WHY THIS SITE WAS CREATED</span>
        <h2>To make student life easier</h2>
        <p>Students can lose valuable time searching in different places for course materials, keeping track of assignments and deadlines, and finding people to study with. The Student Success Hub brings these essentials together in one welcoming space, so students can focus on learning, support one another, and move towards their goals.</p>
      </v-card>
    </v-container>
  </main>
</template>

<style scoped>
.about-us-page { min-height: 100vh; background: radial-gradient(ellipse at 8% 0%, rgb(223 236 226 / 60%), transparent 32rem), #f4f6f2; }
.about-us-container { max-width: 1120px; }
.about-back { color: #4b7960; text-decoration: none; font-weight: 650; }
.about-us-heading { max-width: 760px; margin: 38px auto 30px; text-align: center; }
.about-us-kicker { color: #4b7960; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
.about-us-heading h1 { margin: 12px 0; color: #1e3c2e; font-size: clamp(2rem, 5vw, 3.3rem); letter-spacing: -.045em; line-height: 1.08; }
.about-us-heading p { margin: 0 auto; max-width: 650px; color: #687a70; line-height: 1.7; }
.reason-card { max-width: 850px; margin: 0 auto; border: 1px solid #e1e8df; background: #fffefa; }
.reason-card h2 { margin: 10px 0 14px; color: #1e3c2e; font-size: clamp(1.5rem, 3vw, 2rem); }
.reason-card p { margin: 0; color: #687a70; line-height: 1.8; }
</style>
