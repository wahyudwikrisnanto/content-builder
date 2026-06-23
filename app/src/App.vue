<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import ContentBuilder from './ContentBuilder.vue'
import './style.css'

const SAMPLE_HTML = `
<h1>Welcome to Our Platform</h1>
<p>This is a <strong>sample article</strong> migrated from CKEditor. It includes a variety of block types to demonstrate the canvas migration.</p>
<h2>Key Features</h2>
<ul>
  <li>Rich text editing with headings and paragraphs</li>
  <li>Ordered and unordered lists</li>
  <li>Images and media embeds</li>
  <li>Code blocks with syntax highlighting</li>
</ul>
<h3>Getting Started</h3>
<p>Follow the steps below to set up your environment. The process is straightforward and takes only a few minutes.</p>
<ol>
  <li>Install the dependencies using your package manager</li>
  <li>Configure the environment variables</li>
  <li>Run the development server</li>
</ol>
<h2>Code Example</h2>
<pre><code class="language-javascript">import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')</code></pre>
<h2>About</h2>
<p>This content was originally authored in CKEditor 5 and is now being migrated to the canvas-based layout builder.</p>
<hr>
<p>For questions, visit our documentation or contact support.</p>
`

const builder = useTemplateRef('builder')
const json = ref('')

function onMounted() {
  json.value = builder.value!.htmlToJson(SAMPLE_HTML)
}
</script>

<template>
  <ContentBuilder ref="builder" v-model="json" @vue:mounted="onMounted" />
</template>
