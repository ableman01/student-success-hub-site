<template>
  <main class="preview-page"><v-container class="preview-wrap">
    <header class="preview-header"><RouterLink class="brand" to="/"><img alt="" src="/academic-mark.svg"><span><strong>Student Success Hub</strong><small>Supporting LASU students and beyond</small></span></RouterLink><div class="header-actions"><v-chip color="success" prepend-icon="mdi-eye-outline" size="small" variant="tonal">Interactive preview</v-chip><v-btn :aria-label="themeLabel" icon rounded="circle" :title="themeLabel" variant="tonal" @click="toggleTheme"><v-icon>{{ themeIcon }}</v-icon></v-btn><v-btn color="primary" rounded="pill" to="/signup">Create your account <v-icon end>mdi-arrow-right</v-icon></v-btn></div></header>
    <v-alert class="sample-notice mb-6" color="info" density="comfortable" icon="mdi-information-outline" rounded="lg" variant="tonal"><strong>Sample student account.</strong> Explore with example information. Changes stay in this preview and are not saved.</v-alert>
    <DashboardPreviewDemo />
    <footer class="preview-footer"><RouterLink to="/">Student Success Hub</RouterLink><span>Supporting LASU students and beyond.</span><RouterLink to="/login">Already have an account? Log in</RouterLink></footer>
  </v-container></main>
</template>
<script setup lang="ts">
import DashboardPreviewDemo from "@/components/DashboardPreviewDemo.vue"
import { useAppTheme } from "@/composables/useAppTheme"
const { toggleTheme, themeIcon, themeLabel } = useAppTheme()
</script>
<style scoped>
.preview-page{min-height:100vh;color:#263d48;background:radial-gradient(ellipse at 5% 0%,rgb(222 237 228 / 72%),transparent 34rem),#f4f6f2}.preview-wrap{max-width:1240px;margin:auto;padding-block:28px 42px}.preview-header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:26px}.brand{display:inline-flex;align-items:center;gap:10px;color:#203b31;text-decoration:none}.brand img{width:42px;height:42px}.brand span{display:grid;gap:2px}.brand strong{font-size:14px}.brand small{color:#798981;font-size:11px}.header-actions{display:flex;align-items:center;gap:10px}.sample-notice{border:1px solid rgb(64 119 145 / 15%);font-size:13px}.preview-footer{display:flex;justify-content:space-between;gap:14px;margin-top:26px;border-top:1px solid #e1e8e0;padding-top:16px;color:#88948f;font-size:11px}.preview-footer a{color:#527a62;font-weight:700;text-decoration:none}@media(max-width:650px){.preview-header{align-items:flex-start;flex-wrap:wrap}.header-actions{width:100%;justify-content:space-between;gap:6px}.preview-footer{flex-wrap:wrap}}
</style>
