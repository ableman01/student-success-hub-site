<template>
  <main class="about-us-page">
    <v-container class="about-us-container py-10 py-md-16">
      <RouterLink class="about-back" to="/">
        <v-icon start>mdi-arrow-left</v-icon> Back to home
      </RouterLink>

      <header class="about-us-heading">
        <span class="about-us-kicker">WHY WE BUILT THIS</span>
        <h1>About the Student Success Hub</h1>
        <p>A practical study space created to help university students find useful resources, plan their work, and learn together.</p>
      </header>

      <v-card class="creator-card pa-5 pa-md-8" elevation="0" rounded="xl">
        <div class="creator-copy">
          <h2>Why this hub was created</h2>
          <p>This hub was created to make the everyday parts of studying easier to manage: finding class materials and past questions, keeping assignments and deadlines together, and having a place to discuss coursework with classmates.</p>
          <p>Students often spend valuable time searching across different places for study resources and trying to keep track of what is due. The goal is to bring those tools into one welcoming space, so students can spend more time learning and supporting one another.</p>
          <p>The hub is a community resource. Shared materials are contributed by students, and everyone is encouraged to upload honestly, respect other people’s work, and help keep the library useful.</p>
        </div>
      </v-card>

      <section id="about-app" aria-labelledby="about-app-heading" class="about-app-section">
        <div class="about-study-hero">
          <img alt="Students studying together in a library" src="/about-study-group.jpg">
          <div class="about-study-shade" />
          <h2 class="about-study-title">UNIVERSITY STUDENT SUCCESS HUB</h2>
        </div>

        <div class="about-app-heading">
          <span class="section-eyebrow">One simple, reliable student experience</span>
          <h2 id="about-app-heading">Helping every student move forward</h2>

          <p>
            Our mission is to empower every student with the information, tools, opportunities, skills, and support they need to succeed academically, personally, and professionally.
          </p>
        </div>

        <div class="success-pillars">
          <article class="about-app-card">
            <span class="pillar-number">01</span>
            <v-icon color="primary" size="25">mdi-bullhorn-outline</v-icon>
            <h3>What do I need to know?</h3>
            <p>Find important announcements, deadlines, registration information, academic updates, and verified opportunities in one trusted place.</p>
          </article>

          <article class="about-app-card">
            <span class="pillar-number">02</span>
            <v-icon color="primary" size="25">mdi-calendar-check-outline</v-icon>
            <h3>What should I do next?</h3>
            <p>Use your dashboard and timetable to keep tasks, upcoming deadlines, study plans, and your progress in view.</p>
          </article>

          <article class="about-app-card">
            <span class="pillar-number">03</span>
            <v-icon color="primary" size="25">mdi-book-open-page-variant-outline</v-icon>
            <h3>How can I improve?</h3>
            <p>Build confidence with study resources, tutorials, peer learning, practical skills, and career development.</p>
          </article>

          <article class="about-app-card">
            <span class="pillar-number">04</span>
            <v-icon color="primary" size="25">mdi-account-group-outline</v-icon>
            <h3>Who can help me?</h3>
            <p>Connect with a trusted student community, peer mentors, academic support, and appropriate campus services.</p>
          </article>
        </div>

        <div class="about-app-footer">
          <p>The Hub brings these four needs together, so every student can find the next useful step in one welcoming place.</p>

          <v-btn color="primary" rounded="pill" :to="currentUser ? '/timetable' : '/signup'">
            {{ currentUser ? 'Build my study week' : 'Join the student hub' }}
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </div>
      </section>

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
.creator-card { max-width: 900px; margin: 0 auto; border: 1px solid #e1e8df; background: #fffefa; }
.creator-copy h2 { margin: 0 0 14px; color: #1e3c2e; font-size: clamp(1.5rem, 3vw, 2rem); }
.creator-copy p,.pillar-card p { color: #687a70; line-height: 1.7; }
.creator-copy .v-btn { margin-top: 8px; }
.pillar-card { height: 100%; border: 1px solid #e1e8df; background: #fffefa; }
.pillar-card h3 { margin: 14px 0 4px; color: #294538; font-size: 16px; }
.pillar-card p { margin: 0; font-size: 13px; }
.about-app-section { margin: 48px 0 30px; }
.about-study-hero { position: relative; min-height: 280px; overflow: hidden; margin-bottom: 30px; border-radius: 24px; }
.about-study-hero img,.about-study-shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.about-study-hero img { object-fit: cover; object-position: center 48%; }
.about-study-shade { background: linear-gradient(90deg, rgb(10 31 33 / 76%), rgb(10 31 33 / 12%)); }
.about-study-title { position: absolute; top: 24px; left: 26px; z-index: 1; max-width: calc(100% - 52px); margin: 0; color: #fff; font-size: clamp(1.45rem, 4.2vw, 3rem); font-weight: 800; letter-spacing: .015em; line-height: 1.1; text-shadow: 0 2px 12px rgb(0 0 0 / 25%); }
.about-app-heading { max-width: 760px; margin-bottom: 22px; }
.about-app-heading h2 { margin: 8px 0; color: #20394a; font-size: clamp(1.8rem, 4vw, 2.5rem); letter-spacing: -.04em; }
.about-app-heading p,.about-app-card p { margin: 0; color: #718087; line-height: 1.65; }
.section-eyebrow { color: #56816e; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.success-pillars { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.about-app-card { position: relative; min-height: 210px; border: 1px solid #e4e9e1; border-radius: 20px; padding: 22px; background: #fffefa; }
.pillar-number { position: absolute; top: 18px; right: 20px; color: #a7b7aa; font-size: 11px; font-weight: 800; letter-spacing: .1em; }
.about-app-card h3 { margin: 12px 0 7px; color: #20394a; font-size: 17px; }
.about-app-footer { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 20px; border: 1px solid #e4e9e1; border-radius: 18px; padding: 18px 22px; background: #f6f8f3; }
.about-app-footer p { max-width: 640px; margin: 0; color: #596b61; line-height: 1.65; }
@media (max-width: 800px) { .success-pillars { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 560px) { .success-pillars { grid-template-columns: 1fr; } .about-app-footer { align-items: stretch; flex-direction: column; padding: 17px; } .about-study-hero { min-height: 220px; } .about-study-title { top: 18px; left: 18px; max-width: calc(100% - 36px); font-size: clamp(1.3rem, 6vw, 1.8rem); } }
</style>
