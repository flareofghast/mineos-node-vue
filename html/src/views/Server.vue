<template>
  <div>
    Shouldn't see this if not logged in.
  </div>
</template>

<script>
export default {
  data() {
    return { name: 'server' };
  },
};
</script>

<style lang="scss" scoped>
div {
  color: red;
}
</style>
