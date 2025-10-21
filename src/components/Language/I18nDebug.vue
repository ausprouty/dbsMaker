<script setup>
import { computed } from 'vue'
import { i18n } from 'boot/i18n'

const currentLocale = computed(() => i18n.global.locale.value)
const messages = computed(() => i18n.global.getLocaleMessage(i18n.global.locale.value))

</script>

<template>
  <div style="padding: 1rem; background: #f9f9f9; border: 1px solid #ccc; font-family: monospace;">
    <h3>i18n Debug Info</h3>
    <p><strong>Locale:</strong> {{ currentLocale }}</p>
    <pre>{{ messages }}</pre>
  </div>
</template>
