<template>
  <div>hello</div>
</template>

<script>
import { defineComponent, onMounted } from "vue";

export default defineComponent({
  name: "CheckQueryRelevance",
  setup() {
    console.log("created");

    const wasd = onMounted(() => {
      console.log("mounted");
    });
    return { wasd };
  },
});
</script>
