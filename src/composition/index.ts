import { onMounted } from "vue";

export function helloWorld() {
  console.log("created");

  const wasd = onMounted(() => {
    console.log("mounted");
  });

  return { wasd };
}
