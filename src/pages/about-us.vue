<template>
  <main class="about-us-page">
    <v-container class="about-us-container py-10 py-md-16">
      <RouterLink class="about-back" to="/">
        <v-icon start>mdi-arrow-left</v-icon> Back to home
      </RouterLink>

      <header class="about-us-heading">
        <span class="about-us-kicker">WHY WE BUILT THIS</span>
        <h1>About the LASU Student Success Hub</h1>
        <p>A practical study space created to help LASU students find useful resources, plan their work, and learn together.</p>
      </header>

      <v-card class="creator-card pa-5 pa-md-8" elevation="0" rounded="xl">
        <div class="creator-photo-wrap">
          <v-img
            alt="The creator of the LASU Student Success Hub"
            class="creator-photo"
            cover
            src="@/assets/creator.png"
          />
        </div>
        <div class="creator-copy">
          <span class="about-us-kicker">THE CREATOR</span>
          <h2>Built with students in mind</h2>
          <p>This hub was created to make the everyday parts of studying easier to manage: finding class materials and past questions, keeping assignments and deadlines together, and having a place to discuss coursework with classmates.</p>
          <p>Students often spend valuable time searching across different places for study resources and trying to keep track of what is due. The goal is to bring those tools into one welcoming space, so students can spend more time learning and supporting one another.</p>
          <p>The hub is a community resource. Shared materials are contributed by students, and everyone is encouraged to upload honestly, respect other people’s work, and help keep the library useful.</p>
          <v-btn color="primary" prepend-icon="mdi-view-dashboard-outline" rounded="pill" to="/dashboard">
            Visit the dashboard
          </v-btn>
        </div>
      </v-card>

      <v-row class="about-us-pillars mt-6">
        <v-col cols="12" md="4">
          <v-card class="pillar-card pa-5" elevation="0" rounded="xl">
            <v-icon color="primary" size="28">mdi-bookshelf</v-icon>
            <h3>Find learning resources</h3>
            <p>Browse lecture notes and past questions shared for study and revision.</p>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="pillar-card pa-5" elevation="0" rounded="xl">
            <v-icon color="primary" size="28">mdi-calendar-check-outline</v-icon>
            <h3>Keep coursework in view</h3>
            <p>Organise assignments and deadlines so important work is easier to remember.</p>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="pillar-card pa-5" elevation="0" rounded="xl">
            <v-icon color="primary" size="28">mdi-account-group-outline</v-icon>
            <h3>Learn together</h3>
            <p>Connect with classmates to discuss questions, share ideas, and encourage progress.</p>
          </v-card>
        </v-col>
      </v-row>
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
.creator-card { display: grid; grid-template-columns: minmax(240px, .8fr) minmax(0, 1.2fr); align-items: center; gap: clamp(24px, 5vw, 56px); border: 1px solid #e1e8df; background: #fffefa; }
.creator-photo-wrap { overflow: hidden; border-radius: 18px; background: #eaf0e9; }
.creator-photo { min-height: 430px; }
.creator-copy h2 { margin: 10px 0 14px; color: #1e3c2e; font-size: clamp(1.5rem, 3vw, 2rem); }
.creator-copy p,.pillar-card p { color: #687a70; line-height: 1.7; }
.creator-copy .v-btn { margin-top: 8px; }
.pillar-card { height: 100%; border: 1px solid #e1e8df; background: #fffefa; }
.pillar-card h3 { margin: 14px 0 4px; color: #294538; font-size: 16px; }
.pillar-card p { margin: 0; font-size: 13px; }
@media (max-width: 700px) { .creator-card { grid-template-columns: 1fr; } .creator-photo { min-height: 350px; max-height: 520px; } }
</style>
