<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import ContentBuilder from './ContentBuilder.vue'
import ContentRenderer from './ContentRenderer.vue'
import './style.css'
import './dev.css'

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

type Tab = 'builder' | 'renderer'
const tab = ref<Tab>('builder')
const responsivePreview = ref(false)

const builder = useTemplateRef('builder')
const json = ref('')

function onMounted() {
  json.value = builder.value!.htmlToJson(SAMPLE_HTML)
}
</script>

<template>
  <div class="dev-shell">
    <div class="dev-tabs">
      <button :class="['dev-tab', { active: tab === 'builder' }]" @click="tab = 'builder'">Builder</button>
      <button :class="['dev-tab', { active: tab === 'renderer' }]" @click="tab = 'renderer'">Renderer</button>
    </div>

    <div class="dev-tab-content">
      <ContentBuilder
        v-show="tab === 'builder'"
        ref="builder"
        v-model="json"
        @vue:mounted="onMounted"
      />

      <div v-if="tab === 'renderer'" class="renderer-test">
        <div class="renderer-test-pane renderer-preview">
          <div class="renderer-test-label">
            Output
            <label class="renderer-toggle">
              <input type="checkbox" v-model="responsivePreview" />
              Responsive (flow)
            </label>
          </div>
          <div class="renderer-test-scroll">
            <ContentRenderer :json="json" :responsive="responsivePreview" />
          </div>
        </div>
        <div class="renderer-test-pane renderer-json">
          <div class="renderer-test-label">JSON</div>
          <textarea class="renderer-json-area" :value="json" @input="json = ($event.target as HTMLTextAreaElement).value" spellcheck="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dev-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f4;
}

.dev-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 12px;
  background: #1a1a1a;
  flex-shrink: 0;
}

.dev-tab {
  padding: 5px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  color: #a3a3a3;
  transition: background 0.1s, color 0.1s;
}

.dev-tab:hover { background: rgba(255,255,255,0.08); color: #e5e5e3; }
.dev-tab.active { background: rgba(255,255,255,0.13); color: #ffffff; }

.dev-tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dev-tab-content > .cb-root { flex: 1; min-height: 0; }

/* Renderer test layout */
.renderer-test {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0;
  overflow: hidden;
}

.renderer-test-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  border-right: 1px solid #e5e5e3;
}
.renderer-test-pane:last-child { border-right: none; }

.renderer-test-label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #a3a3a3;
  background: #fff;
  border-bottom: 1px solid #e5e5e3;
  flex-shrink: 0;
}

.renderer-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: #6b6b6b;
  cursor: pointer;
  margin-left: auto;
}
.renderer-toggle input { cursor: pointer; accent-color: #2563eb; }

.renderer-test-scroll {
  flex: 1;
  overflow: auto;
  background: #fff;
  padding: 32px;
}

.renderer-json {
  flex: 0 0 380px;
  background: #1a1a1a;
}

.renderer-json .renderer-test-label {
  background: #1a1a1a;
  color: #6b6b6b;
  border-bottom-color: #333;
}

.renderer-json-area {
  flex: 1;
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  padding: 16px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 11.5px;
  line-height: 1.6;
  color: #d4d4d4;
  resize: none;
  white-space: pre;
}
</style>
